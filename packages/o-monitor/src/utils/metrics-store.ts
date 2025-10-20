/**
 * In-memory time-series metrics storage
 * Stores metrics with timestamps for each node
 */

export interface MetricEntry {
  timestamp: number;
  successCount: number;
  errorCount: number;
  activeRequests: number;
  state?: string;
  uptime?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  children?: string[];
  [key: string]: any;
}

export interface HeartbeatEntry {
  address: string;
  timestamp: number;
  metrics?: any;
}

export class MetricsStore {
  private nodeMetrics: Map<string, MetricEntry[]> = new Map();
  private heartbeats: Map<string, HeartbeatEntry> = new Map();
  private readonly maxEntriesPerNode: number = 1000; // Keep last 1000 entries per node
  private readonly heartbeatTimeoutMs: number = 60000; // 60 seconds

  /**
   * Store metrics for a specific node
   */
  storeMetrics(address: string, metrics: Omit<MetricEntry, 'timestamp'>): void {
    const entry: MetricEntry = {
      successCount: 0,
      errorCount: 0,
      activeRequests: 0,
      ...metrics,
      timestamp: Date.now(),
    };

    if (!this.nodeMetrics.has(address)) {
      this.nodeMetrics.set(address, []);
    }

    const entries = this.nodeMetrics.get(address)!;
    entries.push(entry);

    // Keep only the most recent entries
    if (entries.length > this.maxEntriesPerNode) {
      entries.shift();
    }
  }

  /**
   * Record a heartbeat from a node
   */
  recordHeartbeat(address: string, metrics?: any): void {
    this.heartbeats.set(address, {
      address,
      timestamp: Date.now(),
      metrics,
    });
  }

  /**
   * Get the latest metrics for a specific node
   */
  getLatestMetrics(address: string): MetricEntry | null {
    const entries = this.nodeMetrics.get(address);
    if (!entries || entries.length === 0) {
      return null;
    }
    return entries[entries.length - 1];
  }

  /**
   * Get all metrics for a specific node
   */
  getAllMetrics(address: string): MetricEntry[] {
    return this.nodeMetrics.get(address) || [];
  }

  /**
   * Get metrics for a time range
   */
  getMetricsInRange(
    address: string,
    startTime: number,
    endTime: number,
  ): MetricEntry[] {
    const entries = this.nodeMetrics.get(address) || [];
    return entries.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime,
    );
  }

  /**
   * Get the last heartbeat for a specific node
   */
  getLastHeartbeat(address: string): HeartbeatEntry | null {
    return this.heartbeats.get(address) || null;
  }

  /**
   * Check if a node is alive based on heartbeat
   */
  isNodeAlive(address: string): boolean {
    const heartbeat = this.heartbeats.get(address);
    if (!heartbeat) {
      return false;
    }
    return Date.now() - heartbeat.timestamp < this.heartbeatTimeoutMs;
  }

  /**
   * Get all nodes that have sent heartbeats
   */
  getAllHeartbeats(): HeartbeatEntry[] {
    return Array.from(this.heartbeats.values());
  }

  /**
   * Get stale services (no heartbeat in timeout period)
   */
  getStaleServices(): string[] {
    const now = Date.now();
    const stale: string[] = [];

    for (const [address, heartbeat] of this.heartbeats.entries()) {
      if (now - heartbeat.timestamp > this.heartbeatTimeoutMs) {
        stale.push(address);
      }
    }

    return stale;
  }

  /**
   * Get all nodes being tracked
   */
  getAllTrackedNodes(): string[] {
    return Array.from(this.nodeMetrics.keys());
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanup(olderThanMs: number = 3600000): void {
    // Default: 1 hour
    const cutoffTime = Date.now() - olderThanMs;

    for (const [address, entries] of this.nodeMetrics.entries()) {
      const filtered = entries.filter((e) => e.timestamp > cutoffTime);
      if (filtered.length === 0) {
        this.nodeMetrics.delete(address);
      } else {
        this.nodeMetrics.set(address, filtered);
      }
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalNodes: number;
    aliveNodes: number;
    staleNodes: number;
    totalMetricEntries: number;
  } {
    let totalEntries = 0;
    for (const entries of this.nodeMetrics.values()) {
      totalEntries += entries.length;
    }

    const allNodes = new Set([
      ...this.nodeMetrics.keys(),
      ...this.heartbeats.keys(),
    ]);

    const staleNodes = this.getStaleServices();
    const aliveNodes = Array.from(this.heartbeats.keys()).filter((addr) =>
      this.isNodeAlive(addr),
    );

    return {
      totalNodes: allNodes.size,
      aliveNodes: aliveNodes.length,
      staleNodes: staleNodes.length,
      totalMetricEntries: totalEntries,
    };
  }
}
