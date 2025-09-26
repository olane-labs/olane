import {
  bootstrap,
  createNode,
  defaultLibp2pConfig,
  Libp2p,
  Libp2pConfig,
} from '@olane/o-config';
import { v4 as uuidv4 } from 'uuid';
import { PeerId } from '@olane/o-config';
import { oNodeRouter } from './router/o-node.router.js';
import { oNodeHierarchyManager } from './o-node-hierarchy.manager.js';
import { oNodeConfig } from './interfaces/o-node.config.js';
import { oNodeTransport } from './router/o-node.transport.js';
import {
  CoreUtils,
  NodeState,
  NodeType,
  oCore,
  oRequest,
  oTransport,
  RestrictedAddresses,
} from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';
import { oNodeConnection } from './connection/o-node-connection.js';
import { oNodeConnectionManager } from './connection/o-node-connection.manager.js';
import { oNodeResolver } from './router/o-node.resolver.js';
import { NetworkUtils } from './utils/network.utils.js';

export class oNode extends oCore {
  public peerId!: PeerId;
  public p2pNode!: Libp2p;
  public address!: oNodeAddress;
  public config: oNodeConfig;
  public connectionManager!: oNodeConnectionManager;
  public hierarchyManager!: oNodeHierarchyManager;

  constructor(config: oNodeConfig) {
    super(config);
    this.config = config;
  }

  get networkConfig(): Libp2pConfig {
    return this.config.network || defaultLibp2pConfig;
  }

  configureTransports(): any[] {
    return [...(defaultLibp2pConfig.transports || [])];
  }

  initializeRouter(): void {
    this.hierarchyManager = new oNodeHierarchyManager({
      leaders: this.config.leader ? [this.config.leader] : [],
      parents: this.config.parent ? [this.config.parent] : [],
      children: [],
    });
    this.router = new oNodeRouter({
      hierarchyManager: this.hierarchyManager,
    });
  }

  get staticAddress(): oNodeAddress {
    return this.config.address as oNodeAddress;
  }

  get parentTransports(): oNodeTransport[] {
    return this.hierarchyManager.parents?.map((p) => p.transports).flat() || [];
  }

  get transports(): oNodeTransport[] {
    return this.p2pNode
      .getMultiaddrs()
      .map((multiaddr) => new oNodeTransport(multiaddr.toString()));
  }

  async unregister(): Promise<void> {
    if (this.type === NodeType.LEADER) {
      this.logger.debug('Skipping unregistration, node is leader');
      return;
    }
    if (!this.config.leader) {
      this.logger.debug('No leader found, skipping unregistration');
      return;
    }
    const address = new oNodeAddress('o://register');

    // attempt to unregister from the network
    const params = {
      method: 'remove',
      params: {
        peerId: this.peerId.toString(),
      },
    };

    await this.use(address, params);
  }

  async register(): Promise<void> {
    if (this.type === NodeType.LEADER) {
      this.logger.debug('Skipping registration, node is leader');
      return;
    }
    this.logger.debug('Registering node...');

    // register with the leader global registry
    if (!this.config.leader) {
      this.logger.warn('No leaders found, skipping registration');
      return;
    } else {
      this.logger.debug('Registering node with leader...', this.config.leader);
    }

    const address = new oNodeAddress(RestrictedAddresses.REGISTRY);

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
    this.logger.debug('Registration successful');
  }

  extractMethod(address: oNodeAddress): string {
    return address.protocol.split('/').pop() || '';
  }

  async start(): Promise<void> {
    await super.start();
    await NetworkUtils.advertiseToNetwork(
      this.address,
      this.staticAddress,
      this.p2pNode,
    );
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
      ...this.networkConfig,
      transports: this.configureTransports(),
      connectionManager: {
        ...(this.networkConfig.connectionManager || {
          minConnections: 10, // Keep at least 10 connections
          maxConnections: 100, // Allow up to 100 connections
          pollInterval: 2000, // Check connections every 2 seconds
          autoDialInterval: 10000, // Auto-dial new peers every 10 seconds
          dialTimeout: 30000, // 30 second dial timeout
        }),
      },
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
      this.address = CoreUtils.childAddress(
        parentAddress,
        this.address,
      ) as oNodeAddress;
    }

    return params;
  }

  async connect(
    nextHopAddress: oNodeAddress,
    targetAddress: oNodeAddress,
  ): Promise<oNodeConnection> {
    if (!this.connectionManager) {
      this.logger.error('Connection manager not initialized');
      throw new Error('Node is not ready to connect to other nodes');
    }
    const connection = await this.connectionManager
      .connect({
        address: targetAddress,
        nextHopAddress,
        callerAddress: this.address,
      })
      .catch((error) => {
        // TODO: we need to handle this better and document
        if (error.message === 'Can not dial self') {
          this.logger.error(
            'Make sure you are entering the network not directly through the leader node.',
          );
        }
        throw error;
      });
    this.logger.debug('Successfully connected to: ', nextHopAddress.toString());
    if (!connection) {
      throw new Error('Connection failed');
    }
    return connection;
  }

  async initialize(): Promise<void> {
    this.logger.debug('Initializing node...');
    if (this.p2pNode && this.state !== NodeState.STOPPED) {
      throw new Error('Node is not in a valid state to be initialized');
    }
    if (!this.address.validate()) {
      throw new Error('Invalid address');
    }

    const params = await this.configure();
    this.p2pNode = await createNode(params);

    this.initializeRouter();

    this.logger.debug(
      'Node initialized!',
      this.transports.map((t) => t.toString()),
    );
    this.address.setTransports(this.transports);
    this.peerId = this.p2pNode.peerId as any;

    // initialize connection manager
    this.connectionManager = new oNodeConnectionManager({
      p2pNode: this.p2pNode,
    });

    // initialize address resolution
    this.router.addResolver(new oNodeResolver(this.address));
  }

  async teardown(): Promise<void> {
    if (this.p2pNode) {
      await this.p2pNode.stop();
    }
    return super.teardown();
  }
}
