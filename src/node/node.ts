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
import { NextHopResolver } from '../core/lib/resolvers/next-hop.resolver.js';
import { NetworkActivity } from './lib/network-activity.lib.js';
import { oToolError } from '../error/tool.error.js';
import { oToolErrorCodes } from '../error/enums/codes.error.js';
import { oAgentPlan } from '../plan/agent.plan.js';
import { oPlanContext } from '../plan/plan.context.js';
import { v4 as uuidv4 } from 'uuid';
import { CID } from 'multiformats';
import { oHandshakeResult } from '../plan/interfaces/handshake.result.js';
import { RouteRequest } from './interfaces/route.request.js';

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
    if (!this.address.validate()) {
      throw new Error('Invalid address');
    }
  }

  async _tool_handshake(handshake: oRequest): Promise<oHandshakeResult> {
    this.logger.debug(
      'Performing handshake with intent: ',
      handshake.params.intent,
    );

    const mytools = await this.myTools();

    return {
      tools: mytools.filter((t) => t !== 'handshake' && t !== 'intent'),
      methods: this.methods,
      successes: [],
      failures: [],
      task: undefined,
      type: 'handshake',
    };
  }

  abstract configureTransports(): any[];

  myTools(obj?: any): string[] {
    return Object.getOwnPropertyNames(obj || this.constructor.prototype)
      .filter((key) => key.startsWith('_tool_'))
      .filter((key) => !!key)
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

  async matchAgainstMethods(address: oAddress): Promise<boolean> {
    const methods = await this.myTools();
    this.logger.debug('Matching against methods: ', methods);
    const method = address
      .toString()
      .replace(this.address.toString() + '/', '');
    return methods.includes(method || '');
  }

  extractMethod(address: oAddress): string {
    return address.protocol.split('/').pop() || '';
  }

  async _tool_route(request: RouteRequest): Promise<any> {
    const { payload } = request.params;

    const { address } = request.params;
    this.logger.debug('Routing request to: ', address);
    const destinationAddress = new oAddress(address as string);

    // determine the next hop address from the encapsulated address
    const nextHopAddress =
      await this.addressResolution.resolve(destinationAddress);

    this.logger.debug(
      'Next hop address: ',
      nextHopAddress.toString(),
      nextHopAddress.transports,
    );
    // prepare the request for the destination receiver
    let forwardRequest: oRequest = new oRequest({
      params: payload.params,
      id: request.id,
      method: payload.method,
    });

    // if the next hop is not a libp2p address, we need to communicate to it another way
    if (this.addressResolution.supportsTransport(nextHopAddress)) {
      this.logger.debug(
        'Bridge transports supported, applying custom transports...',
      );
      try {
        // attempt to resolve with bridge transports
        return this.applyBridgeTransports(nextHopAddress, forwardRequest);
      } catch (error: any) {
        this.logger.error('Failed to apply bridge transports: ', error.message);
      }
    }

    // assume the next hop is a libp2p address, so we need to set the transports and dial it
    nextHopAddress.setTransports(this.getTransports(nextHopAddress));

    const isAtDestination = nextHopAddress.value === destinationAddress.value;

    // if we are at the destination, let's look for the closest tool that can service the request
    const transports = nextHopAddress.transports.filter(
      (t) => typeof t !== 'string',
    );

    const isMethodMatch = await this.matchAgainstMethods(destinationAddress);
    // handle address -> method resolution
    if (isMethodMatch) {
      this.logger.debug('Method match found, forwarding to self...');
      const extractedMethod = this.extractMethod(destinationAddress);
      try {
        const response = await this.use(this.address, {
          method: payload.method || extractedMethod,
          params: payload.params,
        });
        return response.result.data;
      } catch (error: any) {
        return error;
      }
    }

    const targetStream = await this.p2pNode.dialProtocol(
      transports,
      nextHopAddress.protocol,
    );

    // if not at destination, we need to forward the request to the target
    if (!isAtDestination) {
      forwardRequest = new oRequest(request);
    } else {
      this.logger.debug('At destination!');
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
      cycles: pc.sequence.length,
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

          this.logger.debug('Child node started: ', node.address.toString());

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

    // if the seed is provided, use it to generate the private key
    if (this.config.seed) {
      this.logger.debug('Seed provided, generating private key...');
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
        denyInboundEncryptedConnection: (peerId, maConn) => {
          // deny all inbound connections unless they are from a parent transport
          if (this.parentPeerId === peerId.toString()) {
            return false;
          }
          // allow leader inbounds
          if (this.config.type === NodeType.LEADER) {
            return false;
          }
          // deny everything else
          return true;
        },
        // allow the user to override the default connection gater
        ...(this.config.network?.connectionGater || {}),
      };
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
  }

  async advertiseValueToNetwork(value: CID) {
    if (!this.isServer) {
      return;
    }
    const providePromise = (this.p2pNode.services as any).dht.provide(value);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Advertise Content routing provide timeout')),
        5000,
      ),
    );
    await Promise.race([providePromise, timeoutPromise]);
  }

  // if the node has any transports that are not memory, it is a server
  get isServer(): boolean {
    return (
      this.transports.filter((t) => t.includes('memory') === false).length > 0
    );
  }

  async advertiseToNetwork() {
    if (!this.isServer) {
      return;
    }
    this.logger.debug(
      'Advertising to network our static and absolute addresses...',
    );
    // advertise the absolute address to the network with timeout
    const absoluteAddressCid = await this.address.toCID();
    try {
      // Add timeout to prevent hanging
      await this.advertiseValueToNetwork(absoluteAddressCid);
    } catch (error: any) {
      this.logger.warn(
        'Failed to advertise absolute address (this is normal for isolated nodes):',
        error.message,
      );
    }

    // advertise the static address to the network with timeout
    const staticAddressCid = await this.staticAddress.toCID();
    try {
      // Add timeout to prevent hanging
      await this.advertiseValueToNetwork(staticAddressCid);
    } catch (error: any) {
      this.logger.warn(
        'Failed to advertise static address (this is normal for isolated nodes):',
        error.message,
      );
    }
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
