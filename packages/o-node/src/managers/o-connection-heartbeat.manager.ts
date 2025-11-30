import {
  oObject,
  ChildLeftEvent,
  ParentDisconnectedEvent,
  LeaderDisconnectedEvent,
  ConnectionDegradedEvent,
  ConnectionRecoveredEvent,
  oAddress,
} from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';
import { IHeartbeatableNode } from '../interfaces/i-heartbeatable-node.js';

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number; // Default: 15000 (15s)
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
 * Connection Health Monitor
 *
 * Monitors connection health by checking libp2p's connection state directly.
 * Continuously checks parent and children connections to detect failures early.
 *
 * How it works:
 * - Every `intervalMs`, checks connection status of all tracked connections
 * - Uses libp2p's connection state (no network overhead from pings)
 * - If connection is not open, increments failure counter
 * - After `failureThreshold` failures, marks connection as dead
 * - Emits events for degraded/recovered/dead connections
 * - Automatically removes dead children from hierarchy
 * - Emits ParentDisconnectedEvent when parent dies (triggers reconnection)
 */
export class oConnectionHeartbeatManager extends oObject {
  private heartbeatInterval?: NodeJS.Timeout;
  private healthMap = new Map<string, ConnectionHealth>();
  private isRunning = false;

  constructor(
    private node: IHeartbeatableNode,
    private config: HeartbeatConfig,
  ) {
    super();
  }

  async start() {
    if (!this.config.enabled) {
      this.logger.debug('Connection health monitoring disabled');
      return;
    }

    this.logger.info(
      `Starting connection health monitoring: interval=${this.config.intervalMs}ms, ` +
        `threshold=${this.config.failureThreshold}`,
    );

    // Immediate first check
    await this.performHealthCheckCycle();

    // Schedule recurring checks
    this.heartbeatInterval = setInterval(
      () => this.performHealthCheckCycle(),
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

  private async performHealthCheckCycle() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    const targets: Array<{
      address: oNodeAddress;
      role: 'parent' | 'child' | 'leader';
    }> = [];

    // Check if this is a leader node (no leader in hierarchy = we are leader)
    const isLeaderNode = this.node.getLeaders().length === 0;

    // Collect leader (if enabled and we're not the leader)
    if (!isLeaderNode) {
      const leaders = this.node.getLeaders();
      for (const leader of leaders) {
        targets.push({ address: leader as oNodeAddress, role: 'leader' });
      }
    }

    // Collect parent
    if (this.config.checkParent && !isLeaderNode) {
      // Use this.node.parent getter to get the current parent address with transports
      // rather than getParents() which may have a stale reference
      const parent = this.node.parent;

      // make sure that we don't double check the leader
      if (parent && parent?.toString() !== oAddress.leader().toString()) {
        targets.push({ address: parent as oNodeAddress, role: 'parent' });
      }
    }

    // Collect children
    if (this.config.checkChildren) {
      const children = this.node.getChildren();
      for (const child of children) {
        targets.push({ address: child as oNodeAddress, role: 'child' });
      }
    }

    // Check all targets in parallel
    await Promise.allSettled(
      targets.map((target) => this.checkTarget(target.address, target.role)),
    );
    this.isRunning = false;
  }

  /**
   * Check if a connection to the given address is open by examining libp2p's connection state
   * @returns true if an open connection exists, false otherwise
   */
  private checkConnectionStatus(address: oNodeAddress): boolean {
    if (address.toString() === this.node.address.toString()) {
      return true; // Self-connection is always "open"
    }

    if (!address.libp2pTransports.length) {
      return false;
    }

    try {
      // Get peer ID from the address
      const peerIdString = address.libp2pTransports[0].toPeerId();

      // Get all connections to this peer from libp2p
      // Note: Using 'as any' since converting to proper PeerId breaks browser implementation
      const connections = this.node.p2pNode.getConnections(
        peerIdString as any,
      );

      // Check if any connection is open
      return connections.some((conn) => conn.status === 'open');
    } catch (error) {
      this.logger.debug(
        `Error checking connection status for ${address}`,
        error,
      );
      return false;
    }
  }

  private async checkTarget(
    address: oNodeAddress,
    role: 'parent' | 'child' | 'leader',
  ) {
    if (!address.libp2pTransports.length) {
      this.logger.debug(
        `${role} has no transports, skipping health check`,
        address,
      );
      return;
    }

    const key = address.toString();
    let health = this.healthMap.get(key);

    if (!health) {
      health = {
        address,
        peerId: 'unknown',
        lastSuccessfulPing: 0,
        consecutiveFailures: 0,
        averageLatency: 0,
        status: 'healthy',
      };
      this.healthMap.set(key, health);
    }

    // Check connection status using libp2p's connection state
    const isOpen = this.checkConnectionStatus(address);

    if (isOpen) {
      // Connection is open - success
      health.lastSuccessfulPing = Date.now();
      health.consecutiveFailures = 0;

      const previousStatus = health.status;
      health.status = 'healthy';

      // Emit recovery event if was degraded
      if (previousStatus === 'degraded') {
        this.logger.info(`Connection recovered: ${address}`);
        this.emitConnectionRecoveredEvent(address, role);
      }
    } else {
      // Connection is not open
      health.consecutiveFailures++;

      this.logger.warn(
        `Connection check failed: ${address} (failures: ${health.consecutiveFailures}/${this.config.failureThreshold})`,
      );

      // Update status based on failure count
      if (health.consecutiveFailures >= this.config.failureThreshold) {
        this.handleConnectionDead(address, role, health);
      } else if (
        health.consecutiveFailures >=
        Math.ceil(this.config.failureThreshold / 2)
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
      this.node.removeChild(address);

      // Emit child left event
      this.node.notificationManager.emit(
        new ChildLeftEvent({
          source: this.node.address,
          childAddress: address,
          parentAddress: this.node.address,
          reason: `heartbeat_failed_${health.consecutiveFailures}_times`,
        }),
      );

      this.logger.warn(`Removed dead child: ${address}`);
    } else if (role === 'parent') {
      // Emit parent disconnected event
      this.node.notificationManager.emit(
        new ParentDisconnectedEvent({
          source: this.node.address,
          parentAddress: address,
          reason: `heartbeat_failed_${health.consecutiveFailures}_times`,
        }),
      );

      this.logger.error(`Parent connection dead: ${address}`);
      // Reconnection manager will handle this event
    } else if (role === 'leader') {
      // Emit leader disconnected event
      this.node.notificationManager.emit(
        new LeaderDisconnectedEvent({
          source: this.node.address,
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

    this.node.notificationManager.emit(
      new ConnectionDegradedEvent({
        source: this.node.address,
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

    this.node.notificationManager.emit(
      new ConnectionRecoveredEvent({
        source: this.node.address,
        targetAddress: address,
        role: eventRole,
      }),
    );
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
