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
import { CoreUtils } from '../utils/core.utils.js';
import { oErrorCodes } from '../error/index.js';
import { oRequest } from '../connection/o-request.js';
import { oNotificationManager } from './lib/o-notification.manager.js';
import {
  oNotificationEvent,
  EventFilter,
  NotificationHandler,
  Subscription,
} from './lib/events/index.js';

export abstract class oCore extends oObject {
  public address: oAddress;
  public state: NodeState = NodeState.STOPPED;
  public errors: Error[] = [];
  public connectionManager!: oConnectionManager;
  public hierarchyManager: oHierarchyManager;
  public metrics: oMetrics = new oMetrics();
  public requestManager: oRequestManager = new oRequestManager();
  public router!: oRouter;
  public notificationManager!: oNotificationManager;
  private heartbeatInterval?: NodeJS.Timeout;

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

  get isLeader(): boolean {
    return this.config.type === NodeType.LEADER;
  }

  get leader(): oAddress | null {
    return this.isLeader ? this.address : this.config?.leader || null;
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
    if (!this.isRunning) {
      this.logger.error('Node is not running', this.state);
      throw new Error('Node is not running');
    }
    if (!address.validate()) {
      throw new Error('Invalid address');
    }

    // check for static match
    if (address.toStaticAddress().equals(this.address.toStaticAddress())) {
      return this.useSelf(data);
    }

    const { nextHopAddress, targetAddress } = await this.router.translate(
      address,
      this,
    );

    if (
      nextHopAddress.toStaticAddress().equals(this.address.toStaticAddress())
    ) {
      return this.useSelf(data);
    }

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

  abstract execute(request: oRequest): Promise<any>;

  async useSelf(data?: {
    method?: string;
    params?: { [key: string]: any };
    id?: string;
  }): Promise<oResponse> {
    if (!this.isRunning) {
      throw new Error('Node is not running');
    }
    // let's call our own tool
    this.logger.debug('Calling ourselves, skipping...', data);

    const request = new oRequest({
      method: data?.method as string,
      params: {
        _connectionId: 0,
        _requestMethod: data?.method,
        ...(data?.params as any),
      },
      id: 0,
    });
    let success = true;
    const result = await this.execute(request).catch((error) => {
      this.logger.error('Error executing tool [self]: ', error);
      success = false;
      const responseError: oError =
        error instanceof oError
          ? error
          : new oError(oErrorCodes.UNKNOWN, error.message);
      return {
        error: responseError.toJSON(),
      };
    });

    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }
    return CoreUtils.buildResponse(request, result, result?.error);
  }

  async useChild(
    childAddress: oAddress,
    data?: {
      method?: string;
      params?: { [key: string]: any };
      id?: string;
    },
  ): Promise<oResponse> {
    if (!this.isRunning) {
      throw new Error('Node is not running');
    }
    if (!childAddress.transports) {
      const child = this.hierarchyManager.getChild(childAddress);
      if (!child) {
        this.logger.warn('Child address has no transports, this might break!');
      } else {
        this.logger.debug(
          'Setting transports for child: ',
          child.transports.map((t) => t.toString()),
        );
        childAddress.setTransports(child?.transports || []);
      }
    }
    const connection = await this.connect(childAddress, childAddress);

    // communicate the payload to the target node
    const response = await connection.send({
      address: childAddress?.toString() || '',
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

  // notification manager - subclasses must implement to provide transport-specific manager
  protected abstract createNotificationManager(): oNotificationManager;

  /**
   * Emit a notification event
   */
  protected notify(event: oNotificationEvent): void {
    if (this.notificationManager) {
      this.notificationManager.emit(event);
    }
  }

  /**
   * Subscribe to notification events
   */
  protected onNotification(
    eventType: string,
    handler: NotificationHandler,
    filter?: EventFilter,
  ): Subscription {
    if (!this.notificationManager) {
      throw new Error('Notification manager not initialized');
    }
    return this.notificationManager.on(eventType, handler, filter);
  }

  // initialize
  async initialize(): Promise<void> {
    // Create and initialize notification manager
    this.notificationManager = this.createNotificationManager();
    await this.notificationManager.initialize();
  }

  get isRunning(): boolean {
    return (
      this.state === NodeState.RUNNING ||
      this.state === NodeState.STOPPING ||
      this.state === NodeState.STARTING
    );
  }

  /**
   * Starts the node by transitioning through initialization and registration phases.
   *
   * This method performs the following operations in sequence:
   * 1. Validates that the node is in STOPPED state
   * 2. Sets state to STARTING
   * 3. Calls initialize() to set up the node's core components
   * 4. Attempts registration with the network (registration errors are logged but don't fail startup)
   * 5. Sets state to RUNNING on success
   *
   * @throws {Error} If the node is not in STOPPED state or initialization fails
   * @returns {Promise<void>} Resolves when the node is successfully started and running
   *
   * @example
   * ```typescript
   * const node = new oNode(config);
   * try {
   *   await node.start();
   *   console.log('Node is now running');
   * } catch (error) {
   *   console.error('Failed to start node:', error);
   * }
   * ```
   *
   * @remarks
   * - If the node is already running or starting, the method will log a warning and return early
   * - Registration failures are logged but do not prevent the node from starting
   * - On any initialization error, the node state is set to ERROR and teardown() is called
   * - The node must be in STOPPED state before calling this method
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

      // Start optional heartbeat to monitor if enabled
      if (
        process.env.MONITOR_ENABLED === 'true' &&
        process.env.MONITOR_ADDRESS
      ) {
        this.startHeartbeat();
      }
    } catch (error) {
      this.logger.error('Failed to start node', error);
      this.errors.push(error as Error);
      this.state = NodeState.ERROR;
      await this.teardown();
    }
  }

  /**
   * Stops the node by performing cleanup and transitioning to a stopped state.
   *
   * This method performs the following operations in sequence:
   * 1. Sets state to STOPPING
   * 2. Calls teardown() to clean up node resources and connections
   * 3. Sets state to STOPPED on successful completion
   *
   * @throws {Error} If teardown operations fail, the node state will be set to ERROR
   * @returns {Promise<void>} Resolves when the node is successfully stopped
   *
   * @example
   * ```typescript
   * const node = new oNode(config);
   * await node.start();
   *
   * // Later, when shutting down
   * try {
   *   await node.stop();
   *   console.log('Node stopped successfully');
   * } catch (error) {
   *   console.error('Failed to stop node:', error);
   * }
   * ```
   *
   * @remarks
   * - This method can be called from any node state
   * - If teardown fails, errors are logged and the node state is set to ERROR
   * - All cleanup operations are performed through the teardown() method
   * - The method will attempt to stop gracefully even if the node is in an error state
   */
  public async stop(): Promise<void> {
    this.logger.debug('Stop node called...');
    if (this.state !== NodeState.RUNNING) {
      this.logger.warn('Node is not running, skipping stop');
      return;
    }
    this.state = NodeState.STOPPING;

    // Stop heartbeat if running
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

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
    this.state = NodeState.STOPPING;
    for (const child of this.hierarchyManager.children) {
      this.logger.debug('Stopping child: ' + child.toString());
      await this.useChild(child, {
        method: 'stop',
        params: {},
      }).catch((error) => {
        if (error.message === 'No data received') {
          // ignore
        } else {
          this.logger.error('Potential error stopping child', error);
        }
      });
      this.logger.debug('Child stopped: ' + child.toString());
    }
    this.hierarchyManager.clear();

    // Teardown notification manager
    if (this.notificationManager) {
      await this.notificationManager.teardown();
    }
  }

  get dependencies(): oDependency[] {
    return this.config.dependencies?.map((d) => new oDependency(d)) || [];
  }

  /**
   * Start sending periodic heartbeats to the monitor node
   * This is optional and only runs if MONITOR_ENABLED=true and MONITOR_ADDRESS is set
   */
  private startHeartbeat(): void {
    const interval = parseInt(
      process.env.MONITOR_HEARTBEAT_INTERVAL || '30000',
      10,
    );
    const monitorAddress = new oAddress(
      process.env.MONITOR_ADDRESS || 'o://monitor',
    );

    this.logger.debug(
      `Starting heartbeat to ${monitorAddress.toString()} every ${interval}ms`,
    );

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.use(monitorAddress, {
          method: 'record_heartbeat',
          params: {
            address: this.address.toString(),
            timestamp: Date.now(),
            metrics: {
              successCount: this.metrics.successCount,
              errorCount: this.metrics.errorCount,
              activeRequests: this.requestManager.activeRequests.length,
              state: this.state,
            },
          },
        });
      } catch (error) {
        // Monitor unavailable, fail silently
        this.logger.debug('Heartbeat failed (monitor unavailable):', error);
      }
    }, interval);
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
