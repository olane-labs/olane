import {
  defaultLibp2pConfig,
  Libp2p,
  Libp2pConfig,
  Multiaddr,
  multiaddr,
  PeerId,
} from '@olane/o-config';
import { CoreConfig } from './interfaces/core-config.interface.js';
import { NodeState } from './interfaces/state.enum.js';
import { oAddress } from './o-address.js';
import { Logger } from './utils/logger.js';
import { NodeType } from './interfaces/node-type.enum.js';
import { oConnectionManager } from './lib/o-connection-manager.js';
import { oResponse } from './lib/o-response.js';
import { oConnection } from './lib/o-connection.js';
import { oMethod, oRequest } from '@olane/o-protocol';
import { oAddressResolution } from './lib/o-address-resolution.js';
import { oDependency } from './o-dependency.js';
import { CID } from 'multiformats';
import { oToolError } from '../error/tool.error.js';

export abstract class oCoreNode {
  public p2pNode!: Libp2p;
  public logger: Logger;
  public networkConfig: Libp2pConfig;
  public address: oAddress;
  public readonly staticAddress: oAddress;
  public peerId!: PeerId;
  public state: NodeState = NodeState.STOPPED;
  public errors: Error[] = [];
  public connectionManager!: oConnectionManager;
  public leaders: Multiaddr[] = [];
  public addressResolution: oAddressResolution;
  public readonly description: string;
  public dependencies: oDependency[];
  public methods: { [key: string]: oMethod };
  public requests: { [key: string]: oRequest } = {};

  public successCount: number = 0;
  public errorCount: number = 0;

  constructor(readonly config: CoreConfig) {
    this.logger = new Logger(
      this.constructor.name +
        (config.name ? `:${config.name}` : '') +
        ':' +
        config.address.toString(),
    );
    this.address = config.address || new oAddress('o://node');
    this.networkConfig = config.network || defaultLibp2pConfig;
    this.addressResolution = new oAddressResolution();
    this.staticAddress = config.address;
    this.description = config.description || '';
    this.dependencies =
      config.dependencies?.map((d) => new oDependency(d)) || [];
    this.methods = config.methods || {};
  }

  get type() {
    return this.config.type || NodeType.UNKNOWN;
  }

  get transports(): string[] {
    return this.p2pNode
      .getMultiaddrs()
      .map((multiaddr) => multiaddr.toString());
  }

  async initialize(): Promise<void> {}

  async whoami(): Promise<any> {
    return {
      address: this.address.toString(),
      type: this.type,
      description: this.description,
      methods: this.methods,
      successCount: this.successCount,
      errorCount: this.errorCount,
    };
  }

  get parent(): oAddress | null {
    return this.config.parent || null;
  }

  get parentPeerId(): string | null {
    if (!this.parent || this.parent?.transports?.length === 0) {
      return null;
    }
    const transport = this.parent?.transports[0];
    const peerId = transport.toString().split('/p2p/')[1];
    return peerId;
  }

  get parentTransports(): Multiaddr[] {
    return this.parent?.transports.map((t) => multiaddr(t)) || [];
  }

  getTransports(address: oAddress): Multiaddr[] {
    let leaderTransports: Multiaddr[] = address.libp2pTransports;

    // check if we already know where we want to go
    if (leaderTransports.length > 0) {
      return leaderTransports as Multiaddr[];
    }

    // if leader transports are not provided, then we need to search for them
    // Assume we are looking for a leader within our network for now
    // TODO: we need to add some discovery managers that every node can use to find external network resources
    if (leaderTransports.length === 0) {
      this.logger.debug(
        'No leader transports provided, we are going to search within our own network',
      );
      if (!this.config.leader) {
        // TODO: how do we handle when the node is the leader? // technically we are in the network
        if (this.type === NodeType.LEADER) {
          this.logger.debug('Node is a leader, using own transports');
          leaderTransports = this.transports.map((t) => multiaddr(t));
        } else {
          this.logger.warn(
            'We are not within a network, cannot search for addressed node without leader.',
          );
        }
      } else {
        leaderTransports = this.config.leader.libp2pTransports;
      }
    }

    if (leaderTransports.length === 0) {
      throw new Error(
        'No leader transports provided, cannot search for leaders',
      );
    }
    return leaderTransports as Multiaddr[];
  }

  async handleStaticAddressTranslation(
    addressInput: oAddress,
  ): Promise<oAddress> {
    let result = addressInput;
    this.logger.debug(
      'Handling static address translation...',
      result.toString(),
    );
    // handle static address translation
    if (result.value.indexOf('o://leader') === -1) {
      // TODO: we need to be more dynamic around the o://leader prefix
      const response: any = await this.use(
        new oAddress('o://leader/register', result.transports),
        {
          method: 'search',
          params: { staticAddress: result.root },
        },
      );
      const searchResults = response.result.data;
      if (searchResults.length > 0) {
        // the root was found, let's add the rest of the path to the address
        const remainderPaths = result.paths.split('/').slice(1);
        const resolvedAddress =
          searchResults[0].address +
          (remainderPaths.length > 0 ? '/' + remainderPaths.join('/') : ''); // TODO: we need to handle this better
        result = new oAddress(resolvedAddress, result.transports);
      } else {
        this.logger.warn('Failed to translate static address');
        // TODO: we need to handle this better
      }
    }
    return result;
  }

  async translateAddress(addressWithLeaderTransports: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // determine if this is external
    const isInternal = this.isInternalAddress(addressWithLeaderTransports);
    if (!isInternal) {
      // external address, so we need to route
      this.logger.debug(
        'Address is external, routing...',
        addressWithLeaderTransports,
      );
      return {
        nextHopAddress: new oAddress(
          'o://leader',
          addressWithLeaderTransports.libp2pTransports,
        ),
        targetAddress: addressWithLeaderTransports,
      };
    }
    let targetAddress = addressWithLeaderTransports;
    let nextHopAddress = addressWithLeaderTransports;

    // handle static address translation for search based upon base functionality
    targetAddress = await this.handleStaticAddressTranslation(targetAddress);

    nextHopAddress = await this.addressResolution.resolve(targetAddress);
    const leaderTransports = this.getTransports(nextHopAddress);
    nextHopAddress.setTransports(leaderTransports);

    return {
      nextHopAddress,
      targetAddress: targetAddress,
    };
  }

  isInternalAddress(addressWithLeaderTransports: oAddress): boolean {
    if (addressWithLeaderTransports.libp2pTransports?.length > 0) {
      // transports are provided, let's see if they match our known leaders
      const leaderTransports =
        this.type === NodeType.LEADER
          ? this.address.libp2pTransports
          : this.config.leader?.libp2pTransports;
      this.logger.debug('Leader transports: ', leaderTransports);
      if (leaderTransports && leaderTransports.length > 0) {
        this.logger.debug(
          'Address transports: ',
          addressWithLeaderTransports.libp2pTransports,
        );
        // compare against our known leaders
        const isInternal = leaderTransports.some((t) =>
          addressWithLeaderTransports.libp2pTransports.includes(t),
        );
        return isInternal;
      }
    }
    return true;
  }

  /**
   * Use a tool explicitly
   * @param addressWithLeaderTransports
   * @param data
   * @param config
   * @returns
   */
  async use(
    addressWithLeaderTransports: oAddress,
    data?: {
      method?: string;
      params?: { [key: string]: any };
      id?: string;
    },
  ): Promise<oResponse> {
    if (!addressWithLeaderTransports.validate()) {
      throw new Error('Invalid address');
    }
    const { nextHopAddress, targetAddress } = await this.translateAddress(
      addressWithLeaderTransports,
    );

    const connection = await this.connect(nextHopAddress, targetAddress);

    // communicate the payload to the target node
    const response = await connection.send({
      address: targetAddress?.toString() || '',
      payload: data || {},
      id: data?.id,
    });

    // if there is an error, throw it to continue to bubble up
    if (response.result.error) {
      this.logger.error(
        'response.result.error',
        JSON.stringify(response.result.error, null, 2),
      );
      throw oToolError.fromJSON(response.result.error);
    }

    return response;
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
    const address = new oAddress('o://leader/register');

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

    const address = new oAddress('o://register');

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

  async connect(
    nextHopAddress: oAddress,
    targetAddress: oAddress,
  ): Promise<oConnection> {
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

  public async teardown(): Promise<void> {
    this.logger.debug('Tearing down node...');

    if (this.p2pNode) {
      await this.p2pNode.stop();
    }
  }

  /**
   * Start the node
   * @param parent - The parent node
   */
  public async start(): Promise<void> {
    if (this.state !== NodeState.STOPPED) {
      this.logger.warn('Node is not stopped, skipping start');
      return;
    }
    this.state = NodeState.STARTING;
    this.p2pNode = this.p2pNode;

    try {
      await this.initialize();
      this.logger.debug('Initializing connection manager...');
      await this.register().catch((error) => {
        this.logger.error('Failed to register node', error);
      });
      this.state = NodeState.RUNNING;
    } catch (error) {
      this.logger.error('Failed to start node', error);
      this.errors.push(error as Error);
      this.state = NodeState.ERROR;
      await this.teardown();
    }
  }

  /**
   * Stop the node
   */
  public async stop(): Promise<void> {
    this.logger.debug('Stop node called...');
    this.state = NodeState.STOPPING;
    try {
      await this.teardown();
      this.state = NodeState.STOPPED;
      this.logger.debug('Node stopped!');
    } catch (error) {
      this.errors.push(error as Error);
      this.state = NodeState.ERROR;
      this.logger.error('Node failed to stop', error);
    }
  }
}
