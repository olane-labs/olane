import { oCoreConfig } from './interfaces/o-core.config.js';
import { NodeState } from './interfaces/state.enum.js';
import { oAddress } from '../router/o-address.js';
import { NodeType } from './interfaces/node-type.enum.js';
import { oConnectionManager } from '../connection/o-connection-manager.js';
import { oResponse } from '../connection/o-response.js';
import { oMethod } from '@olane/o-protocol';
import { oDependency } from './o-dependency.js';
import { oObject } from './o-object.js';
import { oMetrics } from './lib/o-metrics.js';
import { oHierarchyManager } from './lib/o-hierarchy.manager.js';
import { oRequestManager } from './lib/o-request.manager.js';
import { oTransport } from '../transports/o-transport.js';
import { oRouter } from '../router/o-router.js';
import { oRequest } from '../connection/o-request.js';
import { ResponseBuilder } from '../response/response-builder.js';
import { oNotificationManager } from './lib/o-notification.manager.js';
import {
  oNotificationEvent,
  EventFilter,
  NotificationHandler,
  Subscription,
} from './lib/events/index.js';
import { UseOptions } from './interfaces/use-options.interface.js';
import { UseStreamOptions } from './interfaces/use-stream-options.interface.js';
import { UseDataConfig } from './interfaces/use-data.config.js';

export abstract class oCore extends oObject {
  public address: oAddress;
  public state: NodeState = NodeState.STOPPED;
  public errors: Error[] = [];
  public connectionManager!: oConnectionManager;
  public hierarchyManager!: oHierarchyManager;
  public metrics: oMetrics = new oMetrics();
  public requestManager?: oRequestManager;
  public router!: oRouter;
  public notificationManager!: oNotificationManager;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(readonly config: oCoreConfig) {
    super(
      (config.name ? `:${config.name}` : '') + ':' + config.address.toString(),
    );

    // Validate that initial address is not nested
    // Nested addresses should only be created at runtime during registration
    if (config.address && !config._allowNestedAddress) {
      config.address.validateNotNested();
    }

    this.address = config.address || new oAddress('o://node');
  }

  get isLeader(): boolean {
    return this.config.type === NodeType.LEADER;
  }

  get leader(): oAddress | null {
    return this.isLeader ? this.address : this.config?.leader || null;
  }

  // transports
  abstract configureTransports(): any[];

  async useStream(
    address: oAddress,
    data: UseDataConfig,
    options: UseStreamOptions,
  ): Promise<oResponse> {
    return this.use(
      address,
      {
        ...data,
        params: {
          ...data.params,
          _isStreaming: true,
        },
      },
      {
        ...options,
        isStream: true,
      },
    );
  }

  async useDirect(address: oAddress, data?: UseDataConfig): Promise<oResponse> {
    return this.use(address, data, { noRouting: true });
  }

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
    data?: UseDataConfig,
    options?: UseOptions,
  ): Promise<oResponse> {
    this.validateRunning();

    if (!this.requestManager) {
      throw new Error('Request manager is not initialized');
    }

    return this.requestManager.send(address, data, options);
  }

  abstract execute(request: oRequest): Promise<any>;

  /**
   * Helper method to validate node is running
   * @throws Error if node is not running
   */
  private validateRunning(): void {
    if (!this.isRunning) {
      this.logger.error('Node is not running', this.state);
      throw new Error('Node is not running');
    }
  }

  async useSelf(data?: {
    method?: string;
    params?: { [key: string]: any };
    id?: string;
  }): Promise<oResponse> {
    this.validateRunning();

    const request = new oRequest({
      method: data?.method as string,
      params: {
        _connectionId: 0,
        _requestMethod: data?.method,
        ...(data?.params as any),
      },
      id: 0,
    });

    // Use ResponseBuilder with automatic error handling and metrics tracking
    const responseBuilder = ResponseBuilder.create().withMetrics(this.metrics);

    try {
      const result = await this.execute(request);
      return await responseBuilder.build(request, result, null);
    } catch (error: any) {
      this.logger.error('Error executing tool [self]: ', error);
      return await responseBuilder.buildError(request, error);
    }
  }

  async useTool(
    toolName: string,
    data?: {
      params?: { [key: string]: any };
    },
  ) {
    const response = await this.useSelf({
      method: toolName,
      params: {
        ...(data?.params || {}),
      },
    });
    return response.result.data as any;
  }

  async useChild(
    childAddress: oAddress,
    data?: UseDataConfig,
    options?: UseOptions,
  ): Promise<oResponse> {
    this.validateRunning();

    if (!this.requestManager) {
      throw new Error('Request manager is not initialized');
    }

    // extract child address with transports
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

    return this.requestManager.send(childAddress, data, options);
  }

  // hierarchy
  addChildNode(node: oCore): void {
    this.hierarchyManager.addChild(node.address);
  }

  removeChildNode(node: oCore): void {
    this.hierarchyManager.removeChild(node.address);
  }

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
    this.initializeRouter();
  }

  get isRunning(): boolean {
    return (
      this.state === NodeState.RUNNING ||
      this.state === NodeState.STOPPING ||
      this.state === NodeState.STARTING
    );
  }

  protected async hookStartFinished(): Promise<void> {}

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

    // Run pre-start validation outside the try/catch block so that
    // validation errors surface directly to callers without being
    // wrapped in start()/teardown() error handling.
    await this.validate();

    try {
      await this.initialize();
      await this.register().catch((error) => {
        this.logger.error('Failed to register node', error);
      });
      await this.hookStartFinished();
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
   * Validation hook that runs before initialize()/register() in start().
   *
   * Subclasses can override this to perform cheap, synchronous/async
   * configuration validation. Any error thrown here will surface
   * directly to the caller of start() and will prevent initialization
   * and resource allocation from occurring.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected async validate(data?: any): Promise<void> {}

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
    this.hierarchyManager.clear();

    // Teardown notification manager
    if (this.notificationManager) {
      await this.notificationManager.teardown();
    }

    // Reset state to allow restart
    this.resetState();
  }

  abstract initRequestManager(): void;

  /**
   * Reset node state to allow restart after stop
   * Called at the end of teardown()
   */
  protected resetState(): void {
    // Reset state tracking
    this.errors = [];
    this.metrics = new oMetrics();
    this.initRequestManager();

    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Reset address to config address with no transports
    this.address = new oAddress(
      this.config.address.toStaticAddress().value,
      [],
    );

    // Reset hierarchy manager to initial state
    this.hierarchyManager.clear();
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
        const metrics: any = {
          successCount: this.metrics.successCount,
          errorCount: this.metrics.errorCount,
          activeRequests: this.requestManager?.activeRequests?.length || 0,
          state: this.state,
        };

        // Add stream count if available (oNode instances have this method)
        if (typeof (this as any).getStreamCount === 'function') {
          metrics.streamCount = (this as any).getStreamCount();
        }

        await this.use(monitorAddress, {
          method: 'record_heartbeat',
          params: {
            address: this.address.toString(),
            timestamp: Date.now(),
            metrics,
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
