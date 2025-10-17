import {
  createNode,
  defaultLibp2pConfig,
  Libp2p,
  Libp2pConfig,
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
} from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';
import { oNodeConnection } from './connection/o-node-connection.js';
import { oNodeConnectionManager } from './connection/o-node-connection.manager.js';
import { oNodeResolver } from './router/resolvers/o-node.resolver.js';
import { NetworkUtils } from './utils/network.utils.js';
import { oMethodResolver, oToolBase } from '@olane/o-tool';
import { oSearchResolver } from './router/resolvers/o-node.search-resolver.js';
import { oLeaderResolverFallback } from './router/index.js';

export class oNode extends oToolBase {
  public peerId!: PeerId;
  public p2pNode!: Libp2p;
  public address!: oNodeAddress;
  public config: oNodeConfig;
  public connectionManager!: oNodeConnectionManager;
  public hierarchyManager!: oNodeHierarchyManager;
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

    await this.use(address, params);
  }

  async registerParent(): Promise<void> {
    if (this.type === NodeType.LEADER) {
      this.logger.debug('Skipping parent registration, node is leader');
      return;
    }

    // if no parent transports, register with the parent to get them
    // TODO: should we remove the transports check to make this more consistent?
    if (this.config.parent && this.config.parent.transports.length === 0) {
      this.logger.debug('Registering node with parent...', this.config.parent);
      const parentRegistration = await this.use(this.config.parent, {
        method: 'child_register',
        params: {
          address: this.address.toString(),
          transports: this.transports.map((t) => t.toString()),
          peerId: this.peerId.toString(),
          _token: this.config.joinToken,
        },
      });
      const { parentTransports } = parentRegistration.result.data as any;
      // update the parent transports
      this.config.parent.setTransports(
        parentTransports.map((t: string) => new oNodeTransport(t)),
      );
    }
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

    // register with the leader global registry
    if (!this.config.leader) {
      this.logger.warn('No leaders found, skipping registration');
      return;
    } else {
      this.logger.debug('Registering node with leader...');
    }

    await this.registerParent();
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
    this.logger.debug('Registration successful');
  }

  extractMethod(address: oNodeAddress): string {
    return address.protocol.split('/').pop() || '';
  }

  async start(): Promise<void> {
    await super.start();
    // await NetworkUtils.advertiseToNetwork(
    //   this.address,
    //   this.staticAddress,
    //   this.p2pNode,
    // );
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
        // who can call us?
        denyInboundEncryptedConnection: (peerId, maConn) => {
          // deny all inbound connections unless they are from a parent transport
          if (this.parentPeerId === peerId.toString()) {
            return false;
          }
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

    // handle the address encapsulation
    if (
      this.config.leader &&
      !this.address.protocol.includes(this.config.leader.protocol)
    ) {
      const parentAddress = this.config.parent || this.config.leader;
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

    await this.createNode();

    await this.initializeRouter();

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
    this.router.addResolver(new oMethodResolver(this.address));
    this.router.addResolver(new oNodeResolver(this.address));

    // setup a fallback resolver for non-leader nodes
    if (this.isLeader === false) {
      this.logger.debug('Adding leader resolver fallback...');
      this.router.addResolver(new oLeaderResolverFallback(this.address));
    }
  }

  async teardown(): Promise<void> {
    await this.unregister();
    await super.teardown();
    if (this.p2pNode) {
      await this.p2pNode.stop();
    }
  }
}
