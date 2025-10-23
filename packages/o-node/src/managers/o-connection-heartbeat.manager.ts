import { Libp2p } from '@olane/o-config';
import {
  oObject,
  ChildLeftEvent,
  ParentDisconnectedEvent,
  LeaderDisconnectedEvent,
  ConnectionDegradedEvent,
  ConnectionRecoveredEvent,
} from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeHierarchyManager } from '../o-node.hierarchy-manager.js';
import { oNotificationManager } from '@olane/o-core';

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number; // Default: 15000 (15s)
  timeoutMs: number; // Default: 5000 (5s)
  failureThreshold: number; // Default: 3 consecutive failures
  checkChildren: boolean; // Default: true
  checkParent: boolean; // Default: true
  checkLeader: boolean; // Default: controlled by ENABLE_LEADER_HEARTBEAT env var
}

export interface ConnectionHealth {
  address: oNodeAddress;
  peerId: string;
  lastSuccessfulPing: number; // timestamp
  consecutiveFailures: number;
  averageLatency: number;
  status: 'healthy' | 'degraded' | 'dead';
}

/**
 * Connection Heartbeat Manager
 *
 * Uses libp2p's native ping service to detect dead connections early.
 * Continuously pings parent and children to ensure they're alive.
 *
 * How it works:
 * - Every `intervalMs`, pings all tracked connections
 * - If ping fails, increments failure counter
 * - After `failureThreshold` failures, marks connection as dead
 * - Emits events for degraded/recovered/dead connections
 * - Automatically removes dead children from hierarchy
 * - Emits ParentDisconnectedEvent when parent dies (triggers reconnection)
 */
export class oConnectionHeartbeatManager extends oObject {
  private heartbeatInterval?: NodeJS.Timeout;
  private healthMap = new Map<string, ConnectionHealth>();

  constructor(
    private p2pNode: Libp2p,
    private hierarchyManager: oNodeHierarchyManager,
    private notificationManager: oNotificationManager,
    private address: oNodeAddress,
    private config: HeartbeatConfig,
  ) {
    super();
  }

  async start() {
    if (!this.config.enabled) {
      this.logger.debug('Connection heartbeat disabled');
      return;
    }

    this.logger.info(
      `Starting connection heartbeat: interval=${this.config.intervalMs}ms, ` +
        `timeout=${this.config.timeoutMs}ms, threshold=${this.config.failureThreshold}`,
    );

    // Immediate first check
    await this.performHeartbeatCycle();

    // Schedule recurring checks
    this.heartbeatInterval = setInterval(
      () => this.performHeartbeatCycle(),
      this.config.intervalMs,
    );
  }

  async stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    this.healthMap.clear();
  }

  private async performHeartbeatCycle() {
    const targets: Array<{
      address: oNodeAddress;
      role: 'parent' | 'child' | 'leader';
    }> = [];

    // Check if this is a leader node (no leader in hierarchy = we are leader)
    const isLeaderNode = this.hierarchyManager.getLeaders().length === 0;

    // Collect leader (if enabled and we're not the leader)
    if (this.config.checkLeader && !isLeaderNode) {
      const leaders = this.hierarchyManager.getLeaders();
      for (const leader of leaders) {
        targets.push({ address: leader as oNodeAddress, role: 'leader' });
      }
    }

    // Collect parent
    if (this.config.checkParent && !isLeaderNode) {
      const parents = this.hierarchyManager.getParents();
      for (const parent of parents) {
        targets.push({ address: parent as oNodeAddress, role: 'parent' });
      }
    }

    // Collect children
    if (this.config.checkChildren) {
      const children = this.hierarchyManager.getChildren();
      for (const child of children) {
        targets.push({ address: child as oNodeAddress, role: 'child' });
      }
    }

    // Ping all targets in parallel
    await Promise.allSettled(
      targets.map((target) => this.pingTarget(target.address, target.role)),
    );
  }

  private async pingTarget(
    address: oNodeAddress,
    role: 'parent' | 'child' | 'leader',
  ) {
    const peerId = this.extractPeerIdFromAddress(address);
    if (!peerId) {
      this.logger.warn(`Cannot extract peerId from ${address}`);
      return;
    }

    const key = address.toString();
    let health = this.healthMap.get(key);

    if (!health) {
      health = {
        address,
        peerId,
        lastSuccessfulPing: 0,
        consecutiveFailures: 0,
        averageLatency: 0,
        status: 'healthy',
      };
      this.healthMap.set(key, health);
    }

    try {
      // Use libp2p's native ping service
      const startTime = Date.now();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Ping timeout')),
          this.config.timeoutMs,
        );
      });

      // Race between ping and timeout
      // The ping service accepts PeerId as string or object
      await Promise.race([
        (this.p2pNode.services.ping as any).ping(peerId),
        timeoutPromise,
      ]);

      const latency = Date.now() - startTime;

      // Success - update health
      health.lastSuccessfulPing = Date.now();
      health.consecutiveFailures = 0;
      health.averageLatency =
        health.averageLatency === 0
          ? latency
          : health.averageLatency * 0.7 + latency * 0.3; // Exponential moving average

      const previousStatus = health.status;
      health.status = 'healthy';

      // Emit recovery event if was degraded
      if (previousStatus === 'degraded') {
        this.logger.info(
          `Connection recovered: ${address} (latency: ${latency}ms)`,
        );
        this.emitConnectionRecoveredEvent(address, role);
      }

      this.logger.debug(`Ping successful: ${address} (${latency}ms)`);
    } catch (error) {
      health.consecutiveFailures++;

      this.logger.warn(
        `Ping failed: ${address} (failures: ${health.consecutiveFailures}/${this.config.failureThreshold})`,
      );

      // Update status based on failure count
      if (health.consecutiveFailures >= this.config.failureThreshold) {
        this.handleConnectionDead(address, role, health);
      } else if (
        health.consecutiveFailures >= Math.ceil(this.config.failureThreshold / 2)
      ) {
        health.status = 'degraded';
        this.emitConnectionDegradedEvent(
          address,
          role,
          health.consecutiveFailures,
        );
      }
    }
  }

  private handleConnectionDead(
    address: oNodeAddress,
    role: 'parent' | 'child' | 'leader',
    health: ConnectionHealth,
  ) {
    health.status = 'dead';

    this.logger.error(
      `Connection dead after ${health.consecutiveFailures} failures: ${address} (role: ${role})`,
    );

    // Remove from health tracking
    this.healthMap.delete(address.toString());

    // Emit events based on role
    if (role === 'child') {
      // Remove dead child from hierarchy
      this.hierarchyManager.removeChild(address);

      // Emit child left event
      this.notificationManager.emit(
        new ChildLeftEvent({
          source: this.address,
          childAddress: address,
          parentAddress: this.address,
          reason: `heartbeat_failed_${health.consecutiveFailures}_times`,
        }),
      );

      this.logger.warn(`Removed dead child: ${address}`);
    } else if (role === 'parent') {
      // Emit parent disconnected event
      this.notificationManager.emit(
        new ParentDisconnectedEvent({
          source: this.address,
          parentAddress: address,
          reason: `heartbeat_failed_${health.consecutiveFailures}_times`,
        }),
      );

      this.logger.error(`Parent connection dead: ${address}`);
      // Reconnection manager will handle this event
    } else if (role === 'leader') {
      // Emit leader disconnected event
      this.notificationManager.emit(
        new LeaderDisconnectedEvent({
          source: this.address,
          leaderAddress: address,
          reason: `heartbeat_failed_${health.consecutiveFailures}_times`,
        }),
      );

      this.logger.error(`Leader connection dead: ${address}`);
      // Reconnection manager will handle this event
    }
  }

  private emitConnectionDegradedEvent(
    address: oNodeAddress,
    role: 'parent' | 'child' | 'leader',
    failures: number,
  ) {
    // ConnectionDegradedEvent only supports parent/child, so we map leader to parent
    const eventRole: 'parent' | 'child' =
      role === 'leader' ? 'parent' : role === 'child' ? 'child' : 'parent';

    this.notificationManager.emit(
      new ConnectionDegradedEvent({
        source: this.address,
        targetAddress: address,
        role: eventRole,
        consecutiveFailures: failures,
      }),
    );
  }

  private emitConnectionRecoveredEvent(
    address: oNodeAddress,
    role: 'parent' | 'child' | 'leader',
  ) {
    // ConnectionRecoveredEvent only supports parent/child, so we map leader to parent
    const eventRole: 'parent' | 'child' =
      role === 'leader' ? 'parent' : role === 'child' ? 'child' : 'parent';

    this.notificationManager.emit(
      new ConnectionRecoveredEvent({
        source: this.address,
        targetAddress: address,
        role: eventRole,
      }),
    );
  }

  private extractPeerIdFromAddress(address: oNodeAddress): string | null {
    // Extract peerId from transport multiaddr
    for (const transport of address.transports) {
      const multiaddr = transport.toString();
      // Multiaddr format: /ip4/127.0.0.1/tcp/4001/p2p/QmPeerId
      const parts = multiaddr.split('/p2p/');
      if (parts.length === 2) {
        return parts[1];
      }
    }
    return null;
  }

  /**
   * Get current health status of all connections
   */
  getHealthStatus(): ConnectionHealth[] {
    return Array.from(this.healthMap.values());
  }

  /**
   * Get health status for specific address
   */
  getConnectionHealth(address: oNodeAddress): ConnectionHealth | undefined {
    return this.healthMap.get(address.toString());
  }

  /**
   * Get current configuration
   */
  getConfig(): HeartbeatConfig {
    return { ...this.config };
  }
}
