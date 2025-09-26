import { oCoreConfig } from './interfaces/o-core.config.js';
import { NodeState } from './interfaces/state.enum.js';
import { oAddress } from '../router/o-address.js';
import { NodeType } from './interfaces/node-type.enum.js';
import { oConnectionManager } from '../connection/o-connection-manager.js';
import { oResponse } from '../connection/o-response.js';
import { oConnection } from '../connection/o-connection.js';
import { oMethod } from '@olane/o-protocol';
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

  // transports
  abstract configureTransports(): any[];

  /**
   * Sends a request to a remote node in the O-Lane network using the specified address and optional data payload.
   *
   * This method handles the complete communication flow:
   * 1. Validates the target address format
   * 2. Resolves the routing path through the network
   * 3. Establishes a connection to the target node
   * 4. Sends the request payload and waits for response
   * 5. Handles errors and throws them as oError instances
   *
   * @param address - The target node address in O-Lane format (must start with 'o://')
   * @param data - Optional request data containing method, parameters, and request ID
   * @param data.method - The method name to invoke on the target node
   * @param data.params - Key-value pairs of parameters to pass to the method
   * @param data.id - Unique identifier for the request (for tracking purposes)
   * @returns Promise that resolves to an oResponse containing the result from the target node
   * @throws {Error} When the address is invalid (doesn't pass validation)
   * @throws {oError} When the target node returns an error response
   *
   * @example
   * ```typescript
   * // Basic usage - call a method on a remote node
   * const response = await node.use(
   *   new oAddress('o://calculator/add'),
   *   {
   *     method: 'add',
   *     params: { a: 5, b: 3 },
   *     id: 'calc-001'
   *   }
   * );
   * console.log(response.result); // { result: 8 }
   *
   * // Minimal usage - just specify the address
   * const response = await node.use(
   *   new oAddress('o://status/health')
   * );
   * console.log(response.result); // { status: 'healthy' }
   *
   * // Error handling
   * try {
   *   const response = await node.use(
   *     new oAddress('o://calculator/divide'),
   *     { method: 'divide', params: { a: 10, b: 0 } }
   *   );
   * } catch (error) {
   *   if (error instanceof oError) {
   *     console.error(`Node error ${error.code}: ${error.message}`);
   *   } else {
   *     console.error('Invalid address or connection error:', error.message);
   *   }
   * }
   * ```
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

  // hierarchy
  addChildNode(node: oCore): void {
    this.logger.debug('Adding virtual node: ' + node.address.toString());
    this.hierarchyManager.addChild(node.address);
  }

  removeChildNode(node: oCore): void {
    this.hierarchyManager.removeChild(node.address);
  }

  // connection
  abstract connect(
    nextHopAddress: oAddress,
    targetAddress: oAddress,
  ): Promise<oConnection>;

  // router
  abstract initializeRouter(): void;

  // registration
  abstract unregister(): Promise<void>;
  abstract register(): Promise<void>;

  // initialize
  async initialize(): Promise<void> {}

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

  public async teardown(): Promise<void> {
    this.logger.debug('Tearing down node...');
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

  get parent(): oAddress | null {
    return this.config.parent || null;
  }

  get parentTransports(): oTransport[] {
    return this.parent?.transports || [];
  }

  async whoami(): Promise<any> {
    return {
      address: this.address.toString(),
      type: this.type,
      description: this.description,
      methods: this.methods,
    };
  }
}
