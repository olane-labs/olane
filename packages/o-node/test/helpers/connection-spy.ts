import { oNode } from '../../src/o-node.js';
import { oNodeTool } from '../../src/o-node.tool.js';
import type { Connection, Stream } from '@libp2p/interface';

/**
 * Connection event captured by the spy
 */
export interface ConnectionEvent {
  type:
    | 'peer:connect'
    | 'peer:disconnect'
    | 'connection:open'
    | 'connection:close'
    | 'stream:open'
    | 'stream:close';
  timestamp: number;
  peerId?: string;
  remoteAddr?: string;
  protocol?: string;
  streamId?: string;
  metadata?: Record<string, any>;
}

/**
 * Stream statistics
 */
export interface StreamStats {
  protocol: string;
  status: string;
  writeStatus?: string;
  readStatus?: string;
  created: number;
  closed?: number;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  peerId: string;
  status: string;
  remoteAddr: string;
  streams: StreamStats[];
  created: number;
  closed?: number;
}

/**
 * Spy that monitors libp2p connections and streams for testing
 */
export class ConnectionSpy {
  private events: ConnectionEvent[] = [];
  private node: oNode | oNodeTool;
  private listeners: Map<string, (event: any) => void> = new Map();
  private isMonitoring = false;

  constructor(node: oNode | oNodeTool) {
    this.node = node;
  }

  /**
   * Start monitoring connection events
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Monitor peer events
    const peerConnectListener = (event: any) => {
      this.events.push({
        type: 'peer:connect',
        timestamp: Date.now(),
        peerId: event.detail.toString(),
      });
    };
    this.node.p2pNode.addEventListener('peer:connect', peerConnectListener);
    this.listeners.set('peer:connect', peerConnectListener);

    const peerDisconnectListener = (event: any) => {
      this.events.push({
        type: 'peer:disconnect',
        timestamp: Date.now(),
        peerId: event.detail.toString(),
      });
    };
    this.node.p2pNode.addEventListener(
      'peer:disconnect',
      peerDisconnectListener,
    );
    this.listeners.set('peer:disconnect', peerDisconnectListener);

    // Monitor connection events
    const connectionOpenListener = (event: any) => {
      const connection = event.detail;
      this.events.push({
        type: 'connection:open',
        timestamp: Date.now(),
        peerId: connection.remotePeer.toString(),
        remoteAddr: connection.remoteAddr.toString(),
        metadata: {
          status: connection.status,
          direction: (connection as any).direction,
        },
      });
    };
    this.node.p2pNode.addEventListener(
      'connection:open',
      connectionOpenListener,
    );
    this.listeners.set('connection:open', connectionOpenListener);

    const connectionCloseListener = (event: any) => {
      const connection = event.detail;
      this.events.push({
        type: 'connection:close',
        timestamp: Date.now(),
        peerId: connection.remotePeer.toString(),
        remoteAddr: connection.remoteAddr.toString(),
      });
    };
    this.node.p2pNode.addEventListener(
      'connection:close',
      connectionCloseListener,
    );
    this.listeners.set('connection:close', connectionCloseListener);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    for (const [event, listener] of this.listeners.entries()) {
      this.node.p2pNode.removeEventListener(event as any, listener);
    }

    this.listeners.clear();
  }

  /**
   * Clear all captured events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get all captured events
   */
  getEvents(): ConnectionEvent[] {
    return [...this.events];
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: ConnectionEvent['type']): ConnectionEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events for a specific peer
   */
  getEventsForPeer(peerId: string): ConnectionEvent[] {
    return this.events.filter((e) => e.peerId === peerId);
  }

  /**
   * Get current connection statistics
   */
  getConnectionStats(): ConnectionStats[] {
    const stats: ConnectionStats[] = [];
    const connections = this.node.p2pNode.getConnections();

    for (const conn of connections) {
      const streamStats: StreamStats[] = conn.streams.map((stream) => ({
        protocol: stream.protocol || 'unknown',
        status: stream.status,
        writeStatus: stream.writeStatus,
        readStatus: (stream as any).readStatus,
        created: Date.now(), // Approximate
      }));

      stats.push({
        peerId: conn.remotePeer.toString(),
        status: conn.status,
        remoteAddr: conn.remoteAddr.toString(),
        streams: streamStats,
        created: Date.now(), // Approximate
      });
    }

    return stats;
  }

  /**
   * Get total stream count across all connections
   */
  getTotalStreamCount(): number {
    const connections = this.node.p2pNode.getConnections();
    return connections.reduce((sum, conn) => sum + conn.streams.length, 0);
  }

  /**
   * Get stream count for a specific protocol
   */
  getStreamCountByProtocol(protocol: string): number {
    const connections = this.node.p2pNode.getConnections();
    let count = 0;

    for (const conn of connections) {
      count += conn.streams.filter((s) => s.protocol === protocol).length;
    }

    return count;
  }

  /**
   * Check if a connection exists to a peer
   */
  hasConnectionToPeer(peerId: string): boolean {
    const connections = this.node.p2pNode.getConnections();
    return connections.some((conn) => conn.remotePeer.toString() === peerId);
  }

  /**
   * Get connection to a specific peer
   */
  getConnectionToPeer(peerId: string): Connection | undefined {
    const connections = this.node.p2pNode.getConnections();
    return connections.find((conn) => conn.remotePeer.toString() === peerId);
  }

  /**
   * Get all streams for a specific peer
   */
  getStreamsForPeer(peerId: string): Stream[] {
    const connection = this.getConnectionToPeer(peerId);
    return connection ? connection.streams : [];
  }

  /**
   * Wait for a specific event to occur
   */
  async waitForEvent(
    type: ConnectionEvent['type'],
    timeoutMs = 5000,
  ): Promise<ConnectionEvent> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const events = this.getEventsByType(type);
      if (events.length > 0) {
        return events[events.length - 1];
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(`Timeout waiting for event: ${type}`);
  }

  /**
   * Wait for connection to a specific peer
   */
  async waitForConnectionToPeer(
    peerId: string,
    timeoutMs = 5000,
  ): Promise<Connection> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const connection = this.getConnectionToPeer(peerId);
      if (connection && connection.status === 'open') {
        return connection;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(`Timeout waiting for connection to peer: ${peerId}`);
  }

  /**
   * Wait for stream count to reach expected value
   */
  async waitForStreamCount(
    expectedCount: number,
    timeoutMs = 5000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const currentCount = this.getTotalStreamCount();
      if (currentCount === expectedCount) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const actualCount = this.getTotalStreamCount();
    throw new Error(
      `Timeout waiting for stream count. Expected: ${expectedCount}, Actual: ${actualCount}`,
    );
  }

  /**
   * Get summary of connection activity
   */
  getSummary(): {
    totalEvents: number;
    connectionOpens: number;
    connectionCloses: number;
    peerConnects: number;
    peerDisconnects: number;
    currentConnections: number;
    currentStreams: number;
  } {
    return {
      totalEvents: this.events.length,
      connectionOpens: this.getEventsByType('connection:open').length,
      connectionCloses: this.getEventsByType('connection:close').length,
      peerConnects: this.getEventsByType('peer:connect').length,
      peerDisconnects: this.getEventsByType('peer:disconnect').length,
      currentConnections: this.node.p2pNode.getConnections().length,
      currentStreams: this.getTotalStreamCount(),
    };
  }
}

/**
 * Create a connection spy for a node
 */
export function createConnectionSpy(node: oNode | oNodeTool): ConnectionSpy {
  return new ConnectionSpy(node);
}
