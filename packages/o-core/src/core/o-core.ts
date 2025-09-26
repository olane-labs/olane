import { oCoreConfig } from './interfaces/o-core.config.js';
import { NodeState } from './interfaces/state.enum.js';
import { oAddress } from '../router/o-address.js';
import { NodeType } from './interfaces/node-type.enum.js';
import { oConnectionManager } from '../connection/o-connection-manager.js';
import { oResponse } from '../connection/o-response.js';
import { oConnection } from '../connection/o-connection.js';
import { oMethod, oRequest } from '@olane/o-protocol';
import { oAddressResolution } from '../router/o-address-resolution.js';
import { oDependency } from './o-dependency.js';
import { oError } from '../error/o-error.js';
import { oObject } from './o-object.js';
import { oMetrics } from './lib/o-metrics.js';
import { oHierarchyManager } from './lib/o-hierarchy.manager.js';
import { oRequestManager } from './lib/o-request.manager.js';
import { oTransport } from '../transports/o-transport.js';
import { oRouter } from '../router/o-router.js';

export abstract class oCore extends oObject {
  public address: oAddress;
  public state: NodeState = NodeState.STOPPED;
  public errors: Error[] = [];
  public connectionManager!: oConnectionManager;
  public addressResolution!: oAddressResolution;
  public hierarchyManager: oHierarchyManager;
  public metrics: oMetrics = new oMetrics();
  public requestManager: oRequestManager = new oRequestManager();
  public router!: oRouter;

  constructor(readonly config: oCoreConfig) {
    super(
      (config.name ? `:${config.name}` : '') + ':' + config.address.toString(),
    );
    this.address = config.address || new oAddress('o://node');
    this.hierarchyManager = new oHierarchyManager({
      leaders: this.config.leader ? [this.config.leader] : [],
      parents: this.config.parent ? [this.config.parent] : [],
    });
  }

  get dependencies(): oDependency[] {
    return this.config.dependencies?.map((d) => new oDependency(d)) || [];
  }

  get methods(): { [key: string]: oMethod } {
    return this.config.methods || {};
  }

  get description(): string {
    return this.config.description || '';
  }

  get staticAddress(): oAddress {
    return this.config.address;
  }

  get type(): NodeType {
    return this.config.type || NodeType.UNKNOWN;
  }

  get transports(): oTransport[] {
    return [];
  }

  abstract configureTransports(): any[];

  async initialize(): Promise<void> {}

  async whoami(): Promise<any> {
    return {
      address: this.address.toString(),
      type: this.type,
      description: this.description,
      methods: this.methods,
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

  get parentTransports(): oTransport[] {
    return this.parent?.transports || [];
  }

  /**
   * Use a tool explicitly
   * @param addressWithLeaderTransports
   * @param data
   * @param config
   * @returns
   */
  async use(
    address: oAddress,
    data?: {
      method?: string;
      params?: { [key: string]: any };
      id?: string;
    },
  ): Promise<oResponse> {
    if (!address.validate()) {
      throw new Error('Invalid address');
    }
    const { nextHopAddress, targetAddress } =
      await this.router.translate(address);

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
      throw oError.fromJSON(response.result.error);
    }

    return response;
  }

  addChildNode(node: oCore): void {
    this.logger.debug('Adding virtual node: ' + node.address.toString());
    this.hierarchyManager.addChild(node.address);
  }

  removeChildNode(node: oCore): void {
    this.hierarchyManager.removeChild(node.address);
  }

  abstract unregister(): Promise<void>;

  abstract register(): Promise<void>;

  abstract connect(
    nextHopAddress: oAddress,
    targetAddress: oAddress,
  ): Promise<oConnection>;

  public async teardown(): Promise<void> {
    this.logger.debug('Tearing down node...');
  }

  abstract initializeRouter(): oRouter;

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

    try {
      await this.initialize();
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
