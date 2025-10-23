import {
  oObject,
  oAddress,
  NodeState,
  oError,
  oErrorCodes,
  ParentDisconnectedEvent,
  LeaderDisconnectedEvent,
  ConnectionDegradedEvent,
} from '@olane/o-core';
import { oNode } from '../o-node.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeTransport } from '../router/o-node.transport.js';

export interface ReconnectionConfig {
  enabled: boolean;
  maxAttempts: number; // Default: 10
  baseDelayMs: number; // Default: 5000 (5s)
  maxDelayMs: number; // Default: 60000 (60s)
  useLeaderFallback: boolean; // Default: true
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
    private node: oNode,
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
      this.logger.warn(
        'Reconnection disabled - node will remain disconnected',
      );
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
    this.logger.info('Attempting leader fallback to find new parent');

    try {
      // Query registry for available parents at our level
      const response = await this.node.use(new oAddress('o://registry'), {
        method: 'find_available_parent',
        params: {
          currentAddress: this.node.address.toString(),
          preferredLevel: this.calculateNodeLevel(),
        },
      });

      const { parentAddress, parentTransports } = response.result.data as any;

      if (parentAddress && parentTransports) {
        // Update parent reference
        this.node.config.parent = new oNodeAddress(
          parentAddress,
          parentTransports.map((t: string) => new oNodeTransport(t)),
        );

        // Register with new parent
        await this.tryDirectParentReconnection();

        this.reconnecting = false;
        this.logger.info(
          `Successfully reconnected via new parent: ${parentAddress}`,
        );
        return;
      }
    } catch (error) {
      this.logger.error(
        'Leader fallback failed:',
        error instanceof Error ? error.message : error,
      );
    }

    this.handleReconnectionFailure();
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
