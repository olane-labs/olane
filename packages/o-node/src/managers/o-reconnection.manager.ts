import {
  oObject,
  oAddress,
  NodeState,
  oError,
  oErrorCodes,
  ParentDisconnectedEvent,
  LeaderDisconnectedEvent,
  ConnectionDegradedEvent,
  NodeConnectedEvent,
} from '@olane/o-core';
import { IReconnectableNode } from '../interfaces/i-reconnectable-node.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeTransport } from '../router/o-node.transport.js';

export interface ReconnectionConfig {
  enabled: boolean;
  maxAttempts: number; // Default: 10
  baseDelayMs: number; // Default: 5000 (5s)
  maxDelayMs: number; // Default: 60000 (60s)
  useLeaderFallback: boolean; // Default: true
  parentDiscoveryIntervalMs: number; // Default: 10000 (10s)
  parentDiscoveryMaxDelayMs: number; // Default: 60000 (60s)
}

/**
 * Reconnection Manager
 *
 * Automatically attempts to reconnect to parent when connection is lost.
 *
 * Strategy:
 * 1. Listen for ParentDisconnectedEvent (from heartbeat or libp2p)
 * 2. Attempt direct reconnection with exponential backoff
 * 3. If direct reconnection fails, query leader for new parent
 * 4. Register with new parent and continue operation
 * 5. If all attempts fail, transition node to ERROR state
 */
export class oReconnectionManager extends oObject {
  private reconnecting = false;

  constructor(
    private node: IReconnectableNode,
    private config: ReconnectionConfig,
  ) {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for parent disconnection (from heartbeat or libp2p)
    this.node.notificationManager.on(
      'parent:disconnected',
      this.handleParentDisconnected.bind(this),
    );

    // Listen for leader disconnection (from heartbeat)
    this.node.notificationManager.on(
      'leader:disconnected',
      this.handleLeaderDisconnected.bind(this),
    );

    // Listen for connection degradation as early warning
    this.node.notificationManager.on(
      'connection:degraded',
      this.handleConnectionDegraded.bind(this),
    );

    this.node.notificationManager.on(
      'node:connected',
      this.handleNodeConnected.bind(this),
    );
  }

  async handleNodeConnected(event: any) {
    const connectedEvent = event as NodeConnectedEvent;
    if (
      connectedEvent.nodeAddress.toString() === oAddress.leader().toString()
    ) {
      // the leader is back online, let's re-register & tell sub-graphs to re-register
      await this.node.useSelf({
        method: 'register_leader',
        params: {},
      });
    }
  }

  private async handleConnectionDegraded(event: any) {
    const degradedEvent = event as ConnectionDegradedEvent;
    if (degradedEvent.role !== 'parent') return;

    this.logger.warn(
      `Parent connection degraded: ${degradedEvent.targetAddress} ` +
        `(failures: ${degradedEvent.consecutiveFailures})`,
    );

    // Could implement pre-emptive parent discovery here
    // For now, just log the warning and wait for full disconnection
  }

  private async handleLeaderDisconnected(event: any) {
    const disconnectEvent = event as LeaderDisconnectedEvent;

    this.logger.warn(
      `Leader disconnected: ${disconnectEvent.leaderAddress} (reason: ${disconnectEvent.reason})`,
    );

    // Don't attempt reconnection for leader - the LeaderRequestWrapper
    // will handle retries automatically when we make requests
    // Just log the event for observability
    this.logger.info(
      'Leader requests will use automatic retry mechanism (LeaderRequestWrapper)',
    );
  }

  private async handleParentDisconnected(event: any) {
    const disconnectEvent = event as ParentDisconnectedEvent;

    if (this.reconnecting) {
      this.logger.debug('Already reconnecting, ignoring duplicate event');
      return;
    }

    this.logger.warn(
      `Parent disconnected: ${disconnectEvent.parentAddress} (reason: ${disconnectEvent.reason})`,
    );

    await this.attemptReconnection();
  }

  async attemptReconnection() {
    if (!this.config.enabled) {
      this.logger.warn('Reconnection disabled - node will remain disconnected');
      return;
    }

    this.reconnecting = true;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      this.logger.info(
        `Reconnection attempt ${attempt}/${this.config.maxAttempts} to parent: ${this.node.config.parent}`,
      );

      try {
        // Strategy 1: Try direct parent reconnection
        await this.tryDirectParentReconnection();

        // Success!
        this.reconnecting = false;
        this.logger.info(
          `Successfully reconnected to parent after ${attempt} attempts`,
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Reconnection attempt ${attempt} failed:`,
          error instanceof Error ? error.message : error,
        );

        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger.debug(`Waiting ${delay}ms before next attempt...`);
          await this.sleep(delay);
        }
      }
    }

    // All direct attempts failed - try leader fallback
    if (this.config.useLeaderFallback) {
      await this.tryLeaderFallback();
    } else {
      this.handleReconnectionFailure();
    }
  }

  private async tryDirectParentReconnection() {
    if (!this.node.config.parent) {
      throw new Error('No parent configured');
    }

    // Re-register with parent (might have new transports)
    await this.node.registerParent();

    // Verify connection works with a ping
    await this.node.use(this.node.config.parent, {
      method: 'ping',
      params: {},
    });

    this.logger.info('Direct parent reconnection successful');
  }

  private async tryLeaderFallback() {
    // Check if parent is the leader - special case
    const parentIsLeader =
      this.node.config.parent?.toString() === oAddress.leader().toString();

    if (parentIsLeader) {
      this.logger.info(
        'Parent is the leader - waiting for leader to become available',
      );
      await this.waitForLeaderAndReconnect();
    } else {
      this.logger.info(
        'Starting infinite parent discovery via leader registry',
      );
      await this.waitForParentAndReconnect();
    }
  }

  /**
   * Wait for leader to become available and reconnect
   * Leader transports are static (configured), so we just need to detect when it's back
   */
  private async waitForLeaderAndReconnect() {
    const startTime = Date.now();
    let attempt = 0;
    let currentDelay = this.config.parentDiscoveryIntervalMs;

    // Infinite retry loop - keep trying until leader is back
    while (true) {
      attempt++;
      const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);

      this.logger.info(
        `Leader discovery attempt ${attempt} (elapsed: ${elapsedMinutes}m)`,
      );

      try {
        // Try to ping the leader using its configured transports
        // The leader address should already have transports configured
        await this.node.use(this.node.config.parent!, {
          method: 'ping',
          params: {},
        });

        // Leader is back! Now re-register with parent and registry
        this.logger.info(
          `Leader is back online after ${elapsedMinutes}m, re-registering...`,
        );

        try {
          // Register with parent (leader)
          await this.node.registerParent();

          // Force re-registration with registry by resetting the flag
          (this.node as any).didRegister = false;
          await this.node.register();

          // Success!
          this.reconnecting = false;
          this.logger.info(
            `Successfully reconnected to leader and re-registered after ${elapsedMinutes}m`,
          );
          return;
        } catch (registrationError) {
          this.logger.warn(
            'Leader online but registration failed, will retry:',
            registrationError instanceof Error
              ? registrationError.message
              : registrationError,
          );
          // Fall through to retry with backoff
        }
      } catch (error) {
        // Leader not yet available
        this.logger.debug(
          `Leader not yet available (will retry): ${error instanceof Error ? error.message : error}`,
        );
      }

      // Calculate backoff delay
      const delay = Math.min(
        currentDelay,
        this.config.parentDiscoveryMaxDelayMs,
      );

      // Log periodic status updates (every 5 minutes)
      if (attempt % 30 === 0) {
        this.logger.info(
          `Still waiting for leader to come back online... (${elapsedMinutes}m elapsed, ${attempt} attempts)`,
        );
      }

      this.logger.debug(`Waiting ${delay}ms before next discovery attempt...`);
      await this.sleep(delay);

      // Exponential backoff for next iteration
      currentDelay = Math.min(
        currentDelay * 2,
        this.config.parentDiscoveryMaxDelayMs,
      );
    }
  }

  /**
   * Wait for non-leader parent to appear in registry and reconnect
   */
  async waitForParentAndReconnect() {
    const startTime = Date.now();
    let attempt = 0;
    let currentDelay = this.config.parentDiscoveryIntervalMs;

    // Infinite retry loop - keep trying until parent is found
    while (true) {
      attempt++;
      const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);

      this.logger.info(
        `Parent discovery attempt ${attempt} (elapsed: ${elapsedMinutes}m)`,
      );

      try {
        // Query registry for parent by its known address
        const response = await this.node.use(oAddress.registry(), {
          method: 'find_available_parent',
          params: {
            parentAddress: this.node.config.parent?.toString(),
          },
        });

        const { parentAddress, parentTransports } = response.result.data as any;

        // Check if parent was found in registry
        if (parentAddress && parentTransports && parentTransports.length > 0) {
          this.logger.info(
            `Parent found in registry: ${parentAddress} with ${parentTransports.length} transports`,
          );

          // Update parent reference with fresh transports
          this.node.config.parent = new oNodeAddress(
            parentAddress,
            parentTransports.map(
              (t: { value: string }) => new oNodeTransport(t.value),
            ),
          );
          // Attempt to register with parent and re-register with registry
          try {
            await this.tryDirectParentReconnection();

            // Force re-registration with registry by resetting the flag
            (this.node as any).didRegister = false;
            await this.node.register();

            // Success!
            this.reconnecting = false;
            this.logger.info(
              `Successfully reconnected to parent and re-registered after ${elapsedMinutes}m of discovery attempts`,
            );
            return;
          } catch (registrationError) {
            this.logger.warn(
              'Parent found but registration failed, will retry:',
              registrationError instanceof Error
                ? registrationError.message
                : registrationError,
            );
            // Fall through to retry with backoff
          }
        } else {
          this.logger.debug(
            `Parent not yet available in registry: ${this.node.config.parent?.toString()}`,
          );
        }
      } catch (error) {
        // Network error communicating with leader/registry
        this.logger.warn(
          'Error querying registry for parent (will retry):',
          error instanceof Error ? error.message : error,
        );
      }

      // Calculate backoff delay with exponential increase, capped at max
      const delay = Math.min(
        currentDelay,
        this.config.parentDiscoveryMaxDelayMs,
      );

      // Log periodic status updates (every 5 minutes)
      if (attempt % 30 === 0) {
        this.logger.info(
          `Still waiting for parent to appear in registry... (${elapsedMinutes}m elapsed, ${attempt} attempts)`,
        );
      }

      this.logger.debug(`Waiting ${delay}ms before next discovery attempt...`);
      await this.sleep(delay);

      // Exponential backoff for next iteration
      currentDelay = Math.min(
        currentDelay * 2,
        this.config.parentDiscoveryMaxDelayMs,
      );
    }
  }

  private handleReconnectionFailure() {
    this.reconnecting = false;

    this.logger.error(
      'Failed to reconnect to parent after all attempts - node in ERROR state',
    );

    // Transition to error state
    this.node.state = NodeState.ERROR;

    // Could emit custom event here for monitoring
  }

  private calculateNodeLevel(): number {
    return this.node.address.paths.length;
  }

  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
