import { oAddress, oRequest } from '@olane/o-core';
import { oNodeToolConfig, oNodeTool } from '@olane/o-node';
import { MetricsStore } from '../utils/metrics-store.js';

export interface NodeHealthProviderConfig extends oNodeToolConfig {
  metricsStore: MetricsStore;
}

/**
 * Node Health Provider - Polls nodes for health status and metrics
 * Child node: o://monitor/health
 */
export class NodeHealthProvider extends oNodeTool {
  private metricsStore: MetricsStore;
  private pollingInterval?: NodeJS.Timeout;
  private pollingIntervalMs: number = 60000; // 60 seconds default

  constructor(config: NodeHealthProviderConfig) {
    super({
      ...config,
      address: new oAddress('o://health'),
      name: 'node-health-provider',
      description: 'Polls nodes for health status and collects metrics',
    });
    this.metricsStore = config.metricsStore;

    // Configure polling interval from environment
    const envInterval = process.env.MONITOR_POLLING_INTERVAL;
    if (envInterval) {
      this.pollingIntervalMs = parseInt(envInterval, 10);
    }
  }

  async initialize(): Promise<void> {
    await super.initialize();

    // Start polling if enabled
    if (process.env.MONITOR_AUTO_POLL !== 'false') {
      this.startPolling();
    }
  }

  async teardown(): Promise<void> {
    this.stopPolling();
    await super.teardown();
  }

  /**
   * Collect metrics from all registered nodes
   */
  async _tool_collect_node_metrics(request: oRequest): Promise<any> {
    const { addresses } = request.params as any;

    if (!addresses || !Array.isArray(addresses)) {
      throw new Error('addresses array is required');
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const address of addresses) {
      try {
        const metrics = await this.use(new oAddress(address as string), {
          method: 'get_metrics',
          params: {},
        });

        // Store in metrics store
        if (metrics.result) {
          this.metricsStore.storeMetrics(address as string, {
            successCount: metrics.result.successCount || 0,
            errorCount: metrics.result.errorCount || 0,
            activeRequests: metrics.result.activeRequests || 0,
            state: metrics.result.state,
            uptime: metrics.result.uptime,
            memoryUsage: metrics.result.memoryUsage,
            children: metrics.result.children,
          });
        }

        results.push({
          address,
          success: true,
          metrics: metrics.result,
        });
      } catch (error: any) {
        this.logger.error(`Failed to collect metrics from ${address}:`, error);
        errors.push({
          address,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      timestamp: Date.now(),
      collected: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Check node liveness by pinging all nodes
   */
  async _tool_check_node_liveness(request: oRequest): Promise<any> {
    const { addresses } = request.params as any;

    if (!addresses || !Array.isArray(addresses)) {
      throw new Error('addresses array is required');
    }

    const results: any[] = [];

    for (const address of addresses) {
      const startTime = Date.now();
      try {
        await this.use(new oAddress(address as string), {
          method: 'ping',
          params: {},
        });

        const responseTime = Date.now() - startTime;
        results.push({
          address,
          alive: true,
          responseTime,
        });
      } catch (error: any) {
        results.push({
          address,
          alive: false,
          error: error.message,
        });
      }
    }

    const aliveCount = results.filter((r) => r.alive).length;

    return {
      timestamp: Date.now(),
      total: results.length,
      alive: aliveCount,
      dead: results.length - aliveCount,
      results,
    };
  }

  /**
   * Get hierarchy status for all nodes
   */
  async _tool_get_hierarchy_status(request: oRequest): Promise<any> {
    const { addresses } = request.params as any;

    if (!addresses || !Array.isArray(addresses)) {
      throw new Error('addresses array is required');
    }

    const hierarchyData: any[] = [];

    for (const address of addresses) {
      try {
        const metrics = await this.use(new oAddress(address as string), {
          method: 'get_metrics',
          params: {},
        });

        if (metrics.result && metrics.result.children) {
          hierarchyData.push({
            address,
            children: metrics.result.children,
            childCount: Array.isArray(metrics.result.children)
              ? metrics.result.children.length
              : 0,
          });
        }
      } catch (error: any) {
        this.logger.debug(
          `Could not get hierarchy for ${address}:`,
          error.message,
        );
      }
    }

    return {
      timestamp: Date.now(),
      nodes: hierarchyData.length,
      hierarchyData,
    };
  }

  /**
   * Get performance report (slow nodes, high error rates)
   */
  async _tool_get_performance_report(request: oRequest): Promise<any> {
    const allNodes = this.metricsStore.getAllTrackedNodes();
    const slowNodes: any[] = [];
    const errorProneNodes: any[] = [];
    const healthyNodes: any[] = [];

    for (const address of allNodes) {
      const metrics = this.metricsStore.getLatestMetrics(address);
      if (!metrics) continue;

      const totalRequests = metrics.successCount + metrics.errorCount;
      const errorRate =
        totalRequests > 0 ? metrics.errorCount / totalRequests : 0;

      const nodeReport = {
        address,
        successCount: metrics.successCount,
        errorCount: metrics.errorCount,
        errorRate: errorRate * 100, // as percentage
        activeRequests: metrics.activeRequests,
        state: metrics.state,
      };

      // Categorize nodes
      if (errorRate > 0.1) {
        // More than 10% error rate
        errorProneNodes.push(nodeReport);
      } else if (metrics.activeRequests > 10) {
        // High load
        slowNodes.push(nodeReport);
      } else {
        healthyNodes.push(nodeReport);
      }
    }

    return {
      timestamp: Date.now(),
      summary: {
        total: allNodes.length,
        healthy: healthyNodes.length,
        slow: slowNodes.length,
        errorProne: errorProneNodes.length,
      },
      slowNodes: slowNodes.sort((a, b) => b.activeRequests - a.activeRequests),
      errorProneNodes: errorProneNodes.sort(
        (a, b) => b.errorRate - a.errorRate,
      ),
      healthyNodes,
    };
  }

  /**
   * Start automatic polling of nodes
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    this.logger.info(
      `Starting automatic node polling every ${this.pollingIntervalMs}ms`,
    );

    this.pollingInterval = setInterval(async () => {
      try {
        // Get all registered nodes from leader
        const registry = await this.use(new oAddress('o://leader'), {
          method: 'find_all',
          params: {},
        });

        if (registry.result && registry.result.data) {
          const addresses = Array.isArray(registry.result.data)
            ? (registry.result.data as any[]).map((node: any) => node.address)
            : [];

          // Collect metrics from all nodes
          await this._tool_collect_node_metrics(
            new oRequest({
              method: 'collect_node_metrics',
              params: {
                addresses,
                _connectionId: 'auto-poll',
                _requestMethod: 'collect_node_metrics',
              },
              id: 'auto-poll',
            }),
          );
        }
      } catch (error: any) {
        this.logger.error('Error during automatic polling:', error);
      }
    }, this.pollingIntervalMs);
  }

  /**
   * Stop automatic polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.logger.info('Stopped automatic node polling');
    }
  }

  /**
   * Manually trigger polling
   */
  async _tool_poll_now(request: oRequest): Promise<any> {
    try {
      const registry = await this.use(new oAddress('o://leader'), {
        method: 'find_all',
        params: {},
      });

      if (!registry.result || !registry.result.data) {
        return {
          message: 'No nodes found in registry',
          collected: 0,
        };
      }

      const addresses = Array.isArray(registry.result.data)
        ? (registry.result.data as any[]).map((node: any) => node.address)
        : [];

      const result = await this._tool_collect_node_metrics(
        new oRequest({
          method: 'collect_node_metrics',
          params: {
            addresses,
            _connectionId: 'manual-poll',
            _requestMethod: 'collect_node_metrics',
          },
          id: 'manual-poll',
        }),
      );

      return {
        message: 'Polling completed',
        ...result,
      };
    } catch (error: any) {
      throw new Error(`Failed to poll nodes: ${error.message}`);
    }
  }
}
