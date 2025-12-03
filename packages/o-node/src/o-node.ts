import {
  Connection,
  createNode,
  defaultLibp2pConfig,
  Libp2p,
  Libp2pConfig,
  KEEP_ALIVE,
} from '@olane/o-config';
import { v4 as uuidv4 } from 'uuid';
import { PeerId } from '@olane/o-config';
import { oNodeRouter } from './router/o-node.router.js';
import { oNodeHierarchyManager } from './o-node.hierarchy-manager.js';
import { oNodeConfig } from './interfaces/o-node.config.js';
import { oNodeTransport } from './router/o-node.transport.js';
import {
  CoreUtils,
  NodeState,
  NodeType,
  oAddress,
  oRequest,
  RestrictedAddresses,
  oNotificationManager,
  oConnectionConfig,
  UseOptions,
} from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';
import { oNodeConnection } from './connection/o-node-connection.js';
import { oNodeConnectionManager } from './connection/o-node-connection.manager.js';
import { oNodeResolver } from './router/resolvers/o-node.resolver.js';
import { oMethodResolver, oToolBase } from '@olane/o-tool';
import { oLeaderResolverFallback } from './router/index.js';
import { oNodeNotificationManager } from './o-node.notification-manager.js';
import { oConnectionHeartbeatManager } from './managers/o-connection-heartbeat.manager.js';
import { oNodeConnectionConfig } from './connection/index.js';
import { oReconnectionManager } from './managers/o-reconnection.manager.js';

export class oNode extends oToolBase {
  public peerId!: PeerId;
  public p2pNode!: Libp2p;
  public address!: oNodeAddress;
  public config: oNodeConfig;
  public connectionManager!: oNodeConnectionManager;
  public hierarchyManager!: oNodeHierarchyManager;
  public connectionHeartbeatManager?: oConnectionHeartbeatManager;
  protected reconnectionManager?: oReconnectionManager;
  protected didRegister: boolean = false;

  constructor(config: oNodeConfig) {
    super(config);
    this.config = config;
  }

  get leader(): oNodeAddress | null {
    return this.isLeader ? this.address : this.config?.leader || null;
  }

  get networkConfig(): Libp2pConfig {
    return {
      ...defaultLibp2pConfig,
      ...(this.config.network || {}),
    };
  }

  get parentPeerId(): string | null {
    if (!this.parent || this.parent?.transports?.length === 0) {
      return null;
    }
    const transport = this.parent?.transports[0] as oNodeTransport;
    const peerId = transport.toPeerId();
    return peerId;
  }

  configureTransports(): any[] {
    return [...(defaultLibp2pConfig.transports || [])];
  }

  async initializeRouter(): Promise<void> {
    this.hierarchyManager = new oNodeHierarchyManager({
      leaders: this.config.leader ? [this.config.leader] : [],
      parents: this.config.parent ? [this.config.parent] : [],
      children: [],
    });
    this.router = new oNodeRouter();
  }

  protected createNotificationManager(): oNotificationManager {
    return new oNodeNotificationManager(
      this.p2pNode,
      this.hierarchyManager,
      this.address,
    );
  }

  get staticAddress(): oNodeAddress {
    return this.config.address as oNodeAddress;
  }

  get parentTransports(): oNodeTransport[] {
    return this.config.parent?.transports || [];
  }

  get transports(): oNodeTransport[] {
    return this.p2pNode
      .getMultiaddrs()
      .map((multiaddr) => new oNodeTransport(multiaddr.toString()));
  }

  async unregister(): Promise<void> {
    this.logger.debug('Unregistering node...');
    if (this.type === NodeType.LEADER) {
      this.logger.debug('Skipping unregistration, node is leader');
      return;
    }

    // Notify parent we're stopping (best-effort, 2s timeout)
    if (this.config.parent) {
      try {
        await Promise.race([
          this.use(this.config.parent, {
            method: 'notify',
            params: {
              eventType: 'node:stopping',
              eventData: {
                address: this.address.toString(),
                reason: 'graceful_shutdown',
                expectedDowntime: null,
              },
              source: this.address.toString(),
            },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2000),
          ),
        ]);
        this.logger.debug('Notified parent of shutdown');
      } catch (error) {
        this.logger.warn(
          'Failed to notify parent (will be detected by heartbeat):',
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (!this.config.leader) {
      this.logger.debug('No leader found, skipping unregistration');
      return;
    }

    const address = new oNodeAddress(RestrictedAddresses.REGISTRY);

    // attempt to unregister from the network
    const params = {
      method: 'remove',
      params: {
        peerId: this.peerId.toString(),
      },
    };

    this.use(address, params).catch((error) => {
      this.logger.error('Failed to unregister from network:', error);
    });
  }

  async setKeepAliveTag(address: oNodeAddress): Promise<void> {
    if (!address || !address.libp2pTransports?.length) {
      this.logger.warn(
        'Address has no transports, skipping keep alive tag!',
        address,
      );
      return;
    }
    try {
      const peers = await this.p2pNode.peerStore.all();

      // find the peer that is already indexed rather than building the PeerId from the string value to avoid browser issues
      const peer = peers.find(
        (p) =>
          p.id.toString() === address.libp2pTransports[0].toPeerId().toString(),
      );
      if (!peer) {
        this.logger.warn('Peer not found, skipping keep alive tag!', address);
        return;
      }
      await this.p2pNode.peerStore.merge(peer.id, {
        tags: {
          [KEEP_ALIVE]: { value: 100 },
        },
      });
      this.logger.debug(
        'Set keep alive tag for peer:',
        peer.id.toString(),
        ' with address:',
        address.toString(),
      );
    } catch (error) {
      this.logger.error('Failed to set keep alive tag:', error);
    }
  }

  async registerParent(): Promise<void> {
    if (this.type === NodeType.LEADER) {
      this.logger.debug('Skipping parent registration, node is leader');
      return;
    }

    if (!this.parent) {
      this.logger.warn('no parent, skipping registration');
      return;
    }

    if (!this.parent?.libp2pTransports?.length) {
      this.logger.debug(
        'Parent has no transports, waiting for reconnection & leader ack',
      );
      if (this.parent?.toString() === oAddress.leader().toString()) {
        this.parent.setTransports(this.leader?.libp2pTransports || []);
      } else {
        this.logger.debug('Waiting for parent and reconnecting...');
        await this.reconnectionManager?.waitForParentAndReconnect();
      }
    }

    // if no parent transports, register with the parent to get them
    // TODO: should we remove the transports check to make this more consistent?
    if (this.config.parent) {
      this.logger.debug(
        'Registering node with parent...',
        this.config.parent?.toString(),
      );
      await this.use(this.config.parent, {
        method: 'child_register',
        params: {
          address: this.address.toString(),
          transports: this.transports.map((t) => t.toString()),
          peerId: this.peerId.toString(),
          _token: this.config.joinToken,
        },
      });
      this.setKeepAliveTag(this.parent as oNodeAddress);
    }
  }

  async registerLeader(): Promise<void> {
    this.logger.info('Register leader called...');
    if (!this.leader) {
      this.logger.warn('No leader defined, skipping registration');
      return;
    }
    const address = oAddress.registry();

    const params = {
      method: 'commit',
      params: {
        peerId: this.peerId.toString(),
        address: this.address.toString(),
        protocols: this.p2pNode.getProtocols(),
        transports: this.transports,
        staticAddress: this.staticAddress.toString(),
      },
    };

    await this.use(address, params);

    this.setKeepAliveTag(this.leader as oNodeAddress);
  }

  async register(): Promise<void> {
    if (this.type === NodeType.LEADER) {
      this.logger.debug('Skipping registration, node is leader');
      return;
    }

    if (this.didRegister) {
      this.logger.debug('Node already registered, skipping registration');
      return;
    }
    this.didRegister = true;

    this.logger.debug('Registering node...');

    await this.registerParent();

    // register with the leader global registry
    if (!this.config.leader) {
      this.logger.warn('No leaders found, skipping registration');
      return;
    } else {
      this.logger.debug('Registering node with leader...');
    }
    await this.registerLeader();

    this.logger.debug('Registration successful');
  }

  extractMethod(address: oNodeAddress): string {
    return address.protocol.split('/').pop() || '';
  }

  async start(): Promise<void> {
    await super.start();

    // Start heartbeat after node is running
    if (this.connectionHeartbeatManager) {
      await this.connectionHeartbeatManager.start();
    }
  }

  async validateJoinRequest(request: oRequest): Promise<any> {
    return true;
  }
  /**
   * Configure the libp2p node
   * @returns The libp2p config
   */
  async configure(): Promise<Libp2pConfig> {
    const params: Libp2pConfig = {
      ...defaultLibp2pConfig,
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

    // this is a child node of the network, so communication is heavily restricted
    if (this.parentTransports.length > 0) {
      // peer discovery is only allowed through the parent transports
      const transports =
        this.parentTransports.map((t) => t.toMultiaddr().toString()) || [];
      // this.logger.debug('Parent transports: ', transports);
      // this.logger.debug(
      //   'Bootstrap transports: ',
      //   transports.concat(
      //     this.leader?.libp2pTransports.map((t) => t.toString()) || [],
      //   ),
      // );
      // params.peerDiscovery = [
      //   bootstrap({
      //     list: transports.concat(
      //       this.leader?.libp2pTransports.map((t) => t.toString()) || [],
      //     ),
      //   }),
      //   ...(defaultLibp2pConfig.peerDiscovery || []),
      // ];

      //   // let's make sure we only allow communication through the parent transports
      params.connectionGater = {
        denyDialPeer: (peerId) => {
          // we can call the leader
          if (
            this.config.leader?.libp2pTransports.some(
              (t) => t.toPeerId() === peerId.toString(),
            )
          ) {
            return false;
          }
          // we can call our parent
          if (this.parentPeerId === peerId.toString()) {
            return false;
          }

          // we can call our children
          if (
            this.hierarchyManager.children.some((c) =>
              c.libp2pTransports.some(
                (t) => t.toPeerId() === peerId.toString(),
              ),
            )
          ) {
            return false;
          }

          // check for standalone node
          if (!this.config.parent && !this.config.leader) {
            return false;
          }
          return true;
        },
        // who can call us?
        denyInboundEncryptedConnection: (peerId, maConn) => {
          // deny all inbound connections unless they are from a parent transport
          if (this.parentPeerId === peerId.toString()) {
            return false;
          }
          // allow connections from children (for ping)
          if (
            this.hierarchyManager.children.some((c) =>
              c.libp2pTransports.some(
                (t) => t.toPeerId() === peerId.toString(),
              ),
            )
          ) {
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

    params.connectionManager = {
      ...(params.connectionManager || {}),
      reconnectRetries: 20,
      reconnectRetryInterval: 2_000,
      reconnectBackoffFactor: 1.2,
      maxParallelReconnects: 10,
    };

    // handle the address encapsulation
    if (this.config.parent) {
      const parentAddress = this.config.parent
      this.address = CoreUtils.childAddress(
        parentAddress,
        this.address,
      ) as oNodeAddress;
    }

    return params;
  }

  protected async createNode(): Promise<Libp2p> {
    const params = await this.configure();
    this.p2pNode = await createNode(params);
    return this.p2pNode;
  }

  async connect(config: oNodeConnectionConfig): Promise<oNodeConnection> {
    if (!this.connectionManager) {
      this.logger.error('Connection manager not initialized');
      throw new Error('Node is not ready to connect to other nodes');
    }
    const connection = await this.connectionManager
      .connect(config)
      .catch((error) => {
        // TODO: we need to handle this better and document
        if (error.message === 'Can not dial self') {
          this.logger.error(
            'Make sure you are entering the network not directly through the leader node.',
          );
        }
        throw error;
      });
    if (!connection) {
      throw new Error('Connection failed');
    }
    return connection;
  }

  async initConnectionManager(): Promise<void> {
    this.connectionManager = new oNodeConnectionManager({
      p2pNode: this.p2pNode,
      defaultReadTimeoutMs: this.config.connectionTimeouts?.readTimeoutMs,
      defaultDrainTimeoutMs: this.config.connectionTimeouts?.drainTimeoutMs,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
      originAddress: this.address?.value
    });
  }

  async hookInitializeFinished(): Promise<void> {}

  async hookStartFinished(): Promise<void> {
    // Initialize connection health monitor
    this.connectionHeartbeatManager = new oConnectionHeartbeatManager(
      this as any,
      {
        enabled: this.config.connectionHeartbeat?.enabled ?? true,
        intervalMs: this.config.connectionHeartbeat?.intervalMs ?? 15000,
        failureThreshold:
          this.config.connectionHeartbeat?.failureThreshold ?? 3,
        checkChildren: this.config.connectionHeartbeat?.checkChildren ?? false,
        checkParent: this.config.connectionHeartbeat?.checkParent ?? true,
        checkLeader: true,
      },
    );

    this.logger.info(
      `Connection heartbeat config: leader=${this.connectionHeartbeatManager.getConfig().checkLeader}, ` +
        `parent=${this.connectionHeartbeatManager.getConfig().checkParent}`,
    );
  }

  async initialize(): Promise<void> {
    this.logger.debug('Initializing node...');
    if (this.state !== NodeState.STOPPED && this.state !== NodeState.STARTING) {
      throw new Error('Node is not in a valid state to be initialized');
    }
    if (!this.address.validate()) {
      throw new Error('Invalid address');
    }

    await this.createNode();
    await this.initializeRouter();

    // need to wait until our libpp2 node is initialized before calling super.initialize
    await super.initialize();

    this.logger.debug(
      'Node initialized!',
      this.transports.map((t) => t.toString()),
    );
    this.address.setTransports(this.transports);
    this.peerId = this.p2pNode.peerId as any;

    // initialize connection manager
    await this.initConnectionManager();

    // initialize address resolution
    this.router.addResolver(new oMethodResolver(this.address));
    this.router.addResolver(new oNodeResolver(this.address));

    // setup a fallback resolver for non-leader nodes
    if (this.isLeader === false && !!this.leader) {
      this.logger.debug('Adding leader resolver fallback...');
      this.router.addResolver(new oLeaderResolverFallback(this.address));
    }

    this.reconnectionManager = new oReconnectionManager(this, {
      enabled: true,
      maxAttempts: 10,
      baseDelayMs: 5_000,
      maxDelayMs: 20_000,
      useLeaderFallback: true,
      parentDiscoveryIntervalMs: 5_000,
      parentDiscoveryMaxDelayMs: 20_000,
    });
    await this.hookInitializeFinished();
  }

  /**
   * Override use() to wrap leader/registry requests with retry logic
   */
  // async use(
  //   address: oAddress,
  //   data?: {
  //     method?: string;
  //     params?: { [key: string]: any };
  //     id?: string;
  //   },
  //   options?: UseOptions,
  // ): Promise<any> {
  //   // Wrap leader/registry requests with retry logic
  //   return super.use(address, data, options),
  //     address,
  //     data?.method,

  // }

  async teardown(): Promise<void> {
    // Stop heartbeat before parent teardown
    if (this.connectionHeartbeatManager) {
      await this.connectionHeartbeatManager.stop();
    }

    await this.unregister();
    await super.teardown();
    if (this.p2pNode) {
      await this.p2pNode.stop();
    }

    // Reset state to allow restart
    this.resetState();
  }

  /**
   * Reset node state to allow restart after stop
   * Called at the end of teardown()
   */
  protected resetState(): void {
    // Reset registration flag
    this.didRegister = false;

    // Clear peer references
    this.peerId = undefined as any;
    this.p2pNode = undefined as any;

    // Clear managers
    this.connectionManager = undefined as any;
    this.connectionHeartbeatManager = undefined;
    this.reconnectionManager = undefined;

    // Reset address to staticAddress with no transports
    this.address = new oNodeAddress(this.staticAddress.value, []);

    // Reset hierarchy manager
    this.hierarchyManager = new oNodeHierarchyManager({
      leaders: this.config.leader ? [this.config.leader] : [],
      parents: this.config.parent ? [this.config.parent] : [],
      children: [],
    });

    // Clear router (will be recreated in initialize)
    this.router = undefined as any;

    // Call parent reset
    super.resetState();
  }

  // IHeartbeatableNode interface methods
  getLeaders(): oNodeAddress[] {
    return [this.leader as oNodeAddress];
  }

  getParents(): oNodeAddress[] {
    return this.hierarchyManager.getParents() as oNodeAddress[];
  }

  getChildren(): oNodeAddress[] {
    return this.hierarchyManager.getChildren() as oNodeAddress[];
  }

  removeChild(childAddress: oNodeAddress): void {
    this.hierarchyManager.removeChild(childAddress);
  }

  /**
   * Get the total number of active streams across all connections
   * @returns Total count of active streams
   */
  getStreamCount(): number {
    if (!this.p2pNode) {
      return 0;
    }
    const connections = this.p2pNode.getConnections();
    return connections.reduce((count, conn) => {
      return count + ((conn as any).streams?.length || 0);
    }, 0);
  }

  /**
   * Get libp2p metrics for this node
   * Tool method that can be called remotely by monitoring systems
   */
  async _tool_get_libp2p_metrics(request: oRequest): Promise<any> {
    if (!this.p2pNode) {
      return {
        error: 'libp2p node not available',
        available: false,
      };
    }

    try {
      // Get basic connection stats
      const connections = this.p2pNode.getConnections();
      const peers = await this.p2pNode.peerStore.all();

      const inbound = connections.filter(
        (c: any) => c.direction === 'inbound',
      ).length;
      const outbound = connections.filter(
        (c: any) => c.direction === 'outbound',
      ).length;

      // Get DHT info if available
      const services = this.p2pNode.services as any;
      const dht = services?.dht;
      const routingTable = dht?.routingTable;
      const kBuckets = routingTable?.kb || null;
      let routingTableSize = 0;

      if (kBuckets) {
        // Handle both array and object-like structures
        if (Array.isArray(kBuckets)) {
          for (const bucket of kBuckets) {
            routingTableSize += bucket.peers?.length || 0;
          }
        } else if (typeof kBuckets === 'object') {
          // If it's an object, iterate over its values
          for (const bucket of Object.values(kBuckets)) {
            routingTableSize += (bucket as any)?.peers?.length || 0;
          }
        }
      }

      // Calculate total stream count across all connections
      const streamCount = connections.reduce((count: number, conn: any) => {
        return count + (conn.streams?.length || 0);
      }, 0);

      return {
        available: true,
        timestamp: Date.now(),
        nodeAddress: this.address.toString(),
        peerCount: peers.length,
        connectionCount: connections.length,
        inboundConnections: inbound,
        outboundConnections: outbound,
        streamCount,
        dhtEnabled: !!dht,
        dhtMode: dht?.clientMode ? 'client' : 'server',
        dhtRoutingTableSize: routingTableSize,
        protocols: Array.from(this.p2pNode.getProtocols()),
        selfPeerId: this.p2pNode.peerId.toString(),
        multiaddrs: this.p2pNode
          .getMultiaddrs()
          .map((ma: any) => ma.toString()),
      };
    } catch (error: any) {
      return {
        error: `Failed to collect libp2p metrics: ${error.message}`,
        available: false,
        nodeAddress: this.address.toString(),
      };
    }
  }
}
