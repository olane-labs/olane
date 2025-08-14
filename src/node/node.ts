import {
  bootstrap,
  createNode,
  defaultLibp2pConfig,
  Libp2pConfig,
  Multiaddr,
  multiaddr,
  pipe,
  pushable,
  Stream,
} from '@olane/o-config';
import {
  CoreUtils,
  NodeState,
  NodeType,
  oAddress,
  oConnectionManager,
  oCoreNode,
  oRequest,
  oResponse,
} from '../core/index.js';
import { v4 as uuidv4 } from 'uuid';
import { NextHopResolver } from '../core/lib/resolvers/next-hop.resolver.js';
import { register } from 'prom-client';
import { NetworkActivity } from './lib/network-activity.lib.js';
import { oToolError } from '../error/tool.error.js';
import { oToolErrorCodes } from '../error/enums/codes.error.js';
import { oAgentPlan } from '../plan/agent.plan.js';
import { oPlanContext } from '../plan/plan.context.js';
import { oPlanResult } from '../plan/interfaces/plan.result.js';
import { oConfigurePlan } from '../plan/configure/configure.plan.js';

const started = false;

const sharedRegistry = register;

// Enable default Node.js metrics
// collectDefaultMetrics({ register: sharedRegistry });

export abstract class oNode extends oCoreNode {
  public networkActivity!: NetworkActivity;
  public childNodes: oNode[] = [];
  public childAddresses: oAddress[] = [];

  validate(): void {
    if (this.p2pNode && this.state !== NodeState.STOPPED) {
      throw new Error('Node is not in a valid state to be initialized');
    }
  }

  async _tool_handshake(handshake: oRequest): Promise<oPlanResult> {
    this.logger.debug(
      'Performing handshake with intent: ',
      handshake.params.intent,
    );

    const pc = new oConfigurePlan({
      intent: `This is a handshake request. You have already found the tool to resolve the user's intent: ${this.address.toString()}. Configure the handshake for the request to use the tool with user intent: ${handshake.params.intent}`,
      currentNode: this,
      caller: this.address,
      context: new oPlanContext([
        `[Method Metadata Begin]\n${JSON.stringify(this.methods)}\n[Method Metadata End]`,
        `[Method Options Begin]\n${this.myTools().join(', ')}\n[Method Options End]`,
      ]),
    });
    const result = await pc.execute();
    this.logger.debug('Handshake result: ', result);
    if (result.error) {
      return result;
    }

    this.logger.debug('Handshake json: ', result.handshake);
    return result;
  }

  abstract configureTransports(): any[];

  myTools(): string[] {
    return Object.getOwnPropertyNames(oNode.prototype)
      .filter((key) => key.startsWith('_tool_'))
      .map((key) => key.replace('_tool_', ''));
  }

  async applyBridgeTransports(
    address: oAddress,
    request: oRequest,
  ): Promise<oResponse> {
    throw new oToolError(
      oToolErrorCodes.TOOL_TRANSPORT_NOT_SUPPORTED,
      'Bridge transports not implemented',
    );
  }

  matchAgainstMethods(address: oAddress): boolean {
    const methods = this.myTools();
    const method = address
      .toString()
      .replace(this.address.toString() + '/', '');
    return methods.includes(method || '');
  }

  extractMethod(address: oAddress): string {
    return address.protocol.split('/').pop() || '';
  }

  async _tool_route(request: oRequest & { stream: Stream }): Promise<any> {
    const { payload }: any = request.params;

    const counter = this.p2pNode.metrics?.registerCounter('tool_route_count', {
      help: 'Number of tool routes',
    });
    counter?.increment();

    const { address } = request.params;
    const destinationAddress = new oAddress(address as string);

    // determine the next hop address from the encapsulated address
    const nextHopAddress =
      await this.addressResolution.resolve(destinationAddress);

    // prepare the request for the destination receiver
    let forwardRequest: oRequest = new oRequest({
      params: payload.params,
      id: request.id,
      method: payload.method,
    });
    // if the next hop is not a libp2p address, we need to communicate to it another way
    if (this.addressResolution.supportsTransport(nextHopAddress)) {
      return this.applyBridgeTransports(nextHopAddress, forwardRequest);
    }

    // assume the next hop is a libp2p address, so we need to set the transports and dial it
    nextHopAddress.setTransports(this.getTransports(nextHopAddress));

    const isAtDestination = nextHopAddress.value === destinationAddress.value;

    // if we are at the destination, let's look for the closest tool that can service the request
    const transports = nextHopAddress.transports.filter(
      (t) => typeof t !== 'string',
    );

    const isMethodMatch = this.matchAgainstMethods(destinationAddress);
    // handle address -> method resolution
    if (isMethodMatch) {
      this.logger.debug('Method match found, forwarding to self...');
      const extractedMethod = this.extractMethod(destinationAddress);
      const response = await this.use(this.address, {
        method: payload.method || extractedMethod,
        params: payload.params,
      });
      if (response.result.error) {
        const error: oToolError = response.result.error as oToolError;
        throw new oToolError(error.code, error.message);
      }
      return response.result.data;
    }

    const targetStream = await this.p2pNode.dialProtocol(
      transports,
      nextHopAddress.protocol,
    );

    // if not at destination, we need to forward the request to the target
    if (!isAtDestination) {
      forwardRequest = new oRequest(request);
    }

    const pushableStream = pushable();
    pushableStream.push(new TextEncoder().encode(forwardRequest.toString()));
    pushableStream.end();
    await targetStream.sink(pushableStream);
    await pipe(targetStream.source, request.stream.sink);
  }

  /**
   * Where all intents go to be resolved.
   * @param request
   * @returns
   */
  async _tool_intent(request: oRequest): Promise<any> {
    this.logger.debug('Intent resolution called: ', request.params);
    const { intent, context } = request.params;
    const pc = new oAgentPlan({
      intent: intent as string,
      currentNode: this,
      caller: this.address,
      context: context
        ? new oPlanContext([
            `[Chat History Context Begin]\n${context}\n[Chat History Context End]`,
          ])
        : undefined,
    });
    const response = await pc.execute();
    return {
      ...response,
      sequence: pc.sequence.map((s) => {
        return {
          reasoning: s.result?.reasoning,
          result: s.result?.result,
          error: s.result?.error,
          type: s.result?.type,
        };
      }),
    };
  }

  async _tool_child_register(request: oRequest): Promise<any> {
    const { address }: any = request.params;
    const childAddress = new oAddress(address);
    this.childAddresses.push(childAddress);
    return {
      message: 'Child node registered with parent!',
    };
  }

  async start(): Promise<void> {
    await super.start();
    await this.startChildren();
    await this.advertiseToNetwork();
  }

  // deprecated virtual node startup
  async startChildren(): Promise<void> {
    this.logger.debug(
      'Initializing contained children nodes...',
      this.childNodes.length,
    );
    await Promise.all(
      this.childNodes.map(async (node) => {
        try {
          if (node.state !== NodeState.STOPPED) {
            return;
          }
          node.config.parent = this.address;
          // forward the network leader address to the child node
          if (this.type === NodeType.LEADER) {
            node.config.leader = this.address;
          } else {
            node.config.leader = this.config.leader;
          }
          node.config.parent = this.address;
          // node.address = CoreUtils.childAddress(this.address, node.address);
          this.logger.debug(
            'Starting virtual node: ' +
              node.address.toString() +
              ' with parent transports: ' +
              node.parentTransports.join(', '),
          );
          await node.start();

          // test the connection to the child node to add it to the p2p network peer store
          await this.connect(node.address, node.address);
        } catch (error: any) {
          this.logger.error(
            'Failed to start virtual node: ' + node.address.toString(),
            error,
          );
        }
      }),
    );
    // await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  async validateJoinRequest(request: oRequest): Promise<any> {
    return true;
  }

  async _tool_add_child(request: oRequest): Promise<any> {
    const { address, transports }: any = request.params;
    const childAddress = new oAddress(
      address,
      transports.map((t: string) => multiaddr(t)),
    );
    this.childAddresses.push(childAddress);
    return {
      message: 'Child node registered with parent!',
    };
  }

  addChildNode(node: oNode): void {
    this.logger.debug('Adding virtual node: ' + node.address.toString());
    this.childNodes.push(node);
  }

  removeChildNode(node: oNode): void {
    this.childNodes = this.childNodes.filter((n) => n !== node);
  }

  /**
   * Configure the libp2p node
   * @returns The libp2p config
   */
  async configure(): Promise<Libp2pConfig> {
    const params: Libp2pConfig = {
      ...this.networkConfig,
      transports: this.configureTransports(),
      listeners: (
        this.config.network?.listeners ||
        defaultLibp2pConfig.listeners ||
        []
      ).concat(`/memory/${uuidv4()}`), // ensure we allow for local in-memory communication
    };

    // TODO: remove this once we have a proper metrics system
    if (!started) {
      // this.logger.debug('Enabling metrics');
      // params.metrics = prometheusMetrics({
      //   registry: sharedRegistry,
      // });
    }

    // if the seed is provided, use it to generate the private key
    if (this.config.seed) {
      const privateKey = await CoreUtils.generatePrivateKey(this.config.seed);
      params.privateKey = privateKey;
    } else {
      this.logger.debug('No seed provided, generating private key...');
      this.logger.debug(
        'Without providing a seed, this node peer id will be destroyed after the node shuts down.',
      );
      // TODO: add a link to documentation about how to setup a seed
    }

    // if config.bootstrapTransports is provided, use it to bootstrap the node
    const leaderTransports = this.config.leader?.transports;
    if (leaderTransports && leaderTransports.length > 0) {
      this.leaders = leaderTransports as Multiaddr[];
    }

    // this is a child node of the network, so communication is heavily restricted
    if (this.parentTransports.length > 0) {
      // peer discovery is only allowed through the parent transports
      params.peerDiscovery = [
        bootstrap({
          list: [...this.parentTransports.map((t) => t.toString())],
        }),
        ...(defaultLibp2pConfig.peerDiscovery || []),
      ];

      //   // let's make sure we only allow communication through the parent transports
      params.connectionGater = {
        // who can call us?
        denyInboundConnection: (maConn) => {
          // deny all inbound connections unless they are from a parent transport
          this.logger.debug(
            'Received inbound connection from: ' + maConn.remoteAddr.toString(),
            this.parentTransports,
            leaderTransports,
          );
          if (this.parentTransports.includes(maConn.remoteAddr)) {
            return false;
          }
          // allow leader inbounds
          if (this.config.type === NodeType.LEADER) {
            return false;
          }
          // deny everything else
          return true;
        },
        // TODO: [SECURITY] we need to manage outbount connections eventually
        // denyOutboundConnection: (peerId, maConn) => {
        //   return false; // allow for now
        // },
        // denyDialMultiaddr: (multiaddr) => {
        //   // nodes can only dial to nodes below them or the leader
        //   if (leaderTransports) {
        //     const proxyAddresses = leaderTransports;
        //     const shouldBlock = !proxyAddresses.some((addr) =>
        //       multiaddr.toString().includes(addr.toString()),
        //     );
        //     if (shouldBlock) {
        //       this.logger.debug(
        //         'Dialing to ' + multiaddr.toString() + ' blocked!',
        //       );
        //     } else {
        //       this.logger.debug(
        //         'Dialing to ' + multiaddr.toString() + ' allowed!',
        //       );
        //     }
        //     return !shouldBlock;
        //   }
        //   return false;
        // },
        // allow the user to override the default connection gater
        ...(this.config.network?.connectionGater || {}),
      };
    } else {
      // this is either a leader or a single node network
      // params.connectionGater = {
      //   denyInboundConnection: (maConn) => {
      //     return true;
      //   },
      //   // allow the user to override the default connection gater
      //   ...(this.config.network?.connectionGater || {}),
      // };
    }

    // handle the address encapsulation
    if (
      this.config.leader &&
      !this.address.protocol.includes(this.config.leader.protocol)
    ) {
      const parentAddress = this.config.parent || this.config.leader;
      this.logger.debug(
        'Encapsulating address: ' + this.address.toString(),
        parentAddress.toString(),
      );
      this.address = CoreUtils.childAddress(parentAddress, this.address);
    }

    return params;
  }

  async initialize(): Promise<void> {
    this.logger.debug('Initializing node...');
    this.validate();

    const params = await this.configure();
    this.p2pNode = await createNode(params);
    this.logger.debug('Node initialized!', this.transports);
    this.address.setTransports(this.transports.map((t) => multiaddr(t)));
    this.peerId = this.p2pNode.peerId as any;

    // initialize connection manager
    this.connectionManager = new oConnectionManager({
      logger: this.logger,
      p2pNode: this.p2pNode,
    });

    // initialize address resolution
    this.addressResolution.addResolver(
      new NextHopResolver(this.address, this.p2pNode),
    );

    // listen for network events
    // this.listenForNetworkEvents();

    // if (this.type === NodeType.LEADER && (this.config.metrics || true)) {
    // try {
    //   console.log('Starting metrics server...');
    //   if (started === false) {
    //     started = true;
    //     const server = createServer(async (req, res) => {
    //       try {
    //         const url = new URL(req.url || '', `http://${req.headers.host}`);
    //         const pathname = url.pathname;

    //         // Set CORS headers for Grafana
    //         res.setHeader('Access-Control-Allow-Origin', '*');
    //         res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    //         res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    //         // Handle OPTIONS requests (CORS preflight)
    //         if (req.method === 'OPTIONS') {
    //           res.writeHead(200);
    //           res.end();
    //           return;
    //         }

    //         // Prometheus API endpoints
    //         if (pathname === '/api/v1/query') {
    //           const query = url.searchParams.get('query');
    //           const time = url.searchParams.get('time');

    //           if (!query) {
    //             res.writeHead(400, { 'Content-Type': 'application/json' });
    //             res.end(JSON.stringify({ error: 'Missing query parameter' }));
    //             return;
    //           }

    //           try {
    //             // Get all metrics from the registry
    //             const metrics = await sharedRegistry.getMetricsAsJSON();

    //             // Simple query parser for basic PromQL-like queries
    //             let result;
    //             if (query === '1+1') {
    //               // Handle simple scalar queries
    //               result = {
    //                 resultType: 'scalar',
    //                 result: [
    //                   time ? parseInt(time) : Math.floor(Date.now() / 1000),
    //                   '2',
    //                 ],
    //               };
    //             } else if (query.includes('{')) {
    //               // Handle metric queries with labels
    //               const metricName = query.split('{')[0].trim();
    //               const metric = metrics.find((m) => m.name === metricName);

    //               if (metric) {
    //                 result = {
    //                   resultType: 'vector',
    //                   result: [
    //                     {
    //                       metric: { __name__: metricName },
    //                       value: [
    //                         time
    //                           ? parseInt(time)
    //                           : Math.floor(Date.now() / 1000),
    //                         String(metric.values[0]?.value || '0'),
    //                       ],
    //                     },
    //                   ],
    //                 };
    //               } else {
    //                 result = {
    //                   resultType: 'vector',
    //                   result: [],
    //                 };
    //               }
    //             } else {
    //               // Handle simple metric name queries
    //               const metric = metrics.find((m) => m.name === query);

    //               if (metric) {
    //                 result = {
    //                   resultType: 'vector',
    //                   result: [
    //                     {
    //                       metric: { __name__: query },
    //                       value: [
    //                         time
    //                           ? parseInt(time)
    //                           : Math.floor(Date.now() / 1000),
    //                         String(metric.values[0]?.value || '0'),
    //                       ],
    //                     },
    //                   ],
    //                 };
    //               } else {
    //                 result = {
    //                   resultType: 'vector',
    //                   result: [],
    //                 };
    //               }
    //             }

    //             res.writeHead(200, { 'Content-Type': 'application/json' });
    //             res.end(
    //               JSON.stringify({
    //                 status: 'success',
    //                 data: result,
    //               }),
    //             );
    //           } catch (error) {
    //             this.logger.error('Error executing Prometheus query:', error);
    //             res.writeHead(400, { 'Content-Type': 'application/json' });
    //             res.end(
    //               JSON.stringify({
    //                 status: 'error',
    //                 errorType: 'bad_data',
    //                 error: error.message,
    //               }),
    //             );
    //           }
    //           return;
    //         }

    //         // Prometheus range query endpoint (for time series)
    //         if (pathname === '/api/v1/query_range') {
    //           const query = url.searchParams.get('query');
    //           const start = url.searchParams.get('start');
    //           const end = url.searchParams.get('end');
    //           const step = url.searchParams.get('step');

    //           if (!query || !start || !end || !step) {
    //             res.writeHead(400, { 'Content-Type': 'application/json' });
    //             res.end(
    //               JSON.stringify({ error: 'Missing required parameters' }),
    //             );
    //             return;
    //           }

    //           try {
    //             // For range queries, return current metric value as a single point
    //             // In a real implementation, you'd want to store historical data
    //             const metrics = await sharedRegistry.getMetricsAsJSON();
    //             const metricName = query.split('{')[0].trim();
    //             const metric = metrics.find((m) => m.name === metricName);

    //             const result = {
    //               resultType: 'matrix',
    //               result: metric
    //                 ? [
    //                     {
    //                       metric: { __name__: metricName },
    //                       values: [
    //                         [
    //                           Math.floor(Date.now() / 1000),
    //                           String(metric.values[0]?.value || '0'),
    //                         ],
    //                       ],
    //                     },
    //                   ]
    //                 : [],
    //             };

    //             res.writeHead(200, { 'Content-Type': 'application/json' });

    //             res.end(
    //               JSON.stringify({
    //                 status: 'success',
    //                 data: result,
    //               }),
    //             );
    //           } catch (error) {
    //             this.logger.error(
    //               'Error executing Prometheus range query:',
    //               error,
    //             );
    //             res.writeHead(400, { 'Content-Type': 'application/json' });
    //             res.end(
    //               JSON.stringify({
    //                 status: 'error',
    //                 errorType: 'bad_data',
    //                 error: error.message,
    //               }),
    //             );
    //           }
    //           return;
    //         }

    //         // Default metrics endpoint
    //         if (pathname === '/metrics') {
    //           const metrics = await sharedRegistry.metrics();
    //           res.writeHead(200, { 'Content-Type': 'text/plain' });

    //           res.end(metrics);
    //           return;
    //         }

    //         // Health check endpoint
    //         if (pathname === '/health') {
    //           res.writeHead(200, { 'Content-Type': 'application/json' });
    //           res.end(JSON.stringify({ status: 'ok' }));
    //           return;
    //         }

    //         // Prometheus label values endpoint (for metric discovery)
    //         if (pathname === '/api/v1/label/__name__/values') {
    //           try {
    //             const metrics = await sharedRegistry.getMetricsAsJSON();
    //             const metricNames = metrics.map((m) => m.name);

    //             res.writeHead(200, { 'Content-Type': 'application/json' });

    //             res.end(
    //               JSON.stringify({
    //                 status: 'success',
    //                 data: metricNames,
    //               }),
    //             );
    //           } catch (error) {
    //             this.logger.error('Error getting metric names:', error);
    //             res.writeHead(500, { 'Content-Type': 'application/json' });
    //             res.end(
    //               JSON.stringify({
    //                 status: 'error',
    //                 error: error.message,
    //               }),
    //             );
    //           }
    //           return;
    //         }

    //         // Default response for unknown endpoints
    //         res.writeHead(404, { 'Content-Type': 'application/json' });
    //         res.end(JSON.stringify({ error: 'Not found' }));
    //       } catch (error) {
    //         this.logger.error('Error handling metrics request:', error);
    //         res.writeHead(500, { 'Content-Type': 'application/json' });
    //         res.end(JSON.stringify({ error: 'Internal server error' }));
    //       }
    //     });
    //     server.listen(3001, '127.0.0.1');
    //     this.logger.debug('Metrics server started on port', server.address());
    //   }
    // } catch (err) {
    //   this.logger.error('Error starting metrics server: ', err);
    // }
    // }
  }

  listenForNetworkEvents() {
    this.networkActivity = new NetworkActivity(this.logger, this.p2pNode);
  }

  async teardown(): Promise<void> {
    for (const node of this.childNodes) {
      await node.stop();
    }
    this.childNodes = [];
    return super.teardown();
  }
}
