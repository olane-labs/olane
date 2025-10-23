import { oAddress, oRequest } from '@olane/o-core';
import { oNodeToolConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { MetricsStore } from './utils/metrics-store.js';
import { MonitorHTTPServer } from './http/server.js';
import { HeartbeatProvider } from './providers/heartbeat.provider.js';
import { NodeHealthProvider } from './providers/node-health.provider.js';
import { LibP2PMetricsProvider } from './providers/libp2p-metrics.provider.js';

export interface MonitorToolConfig extends Partial<oNodeToolConfig> {
  httpPort?: number;
  enableHTTP?: boolean;
  address?: oAddress;
}

/**
 * MonitorTool - Comprehensive monitoring tool for Olane OS
 *
 * Provides:
 * - libp2p metrics collection and exposure
 * - Node health monitoring and polling
 * - Service heartbeat tracking
 * - HTTP API for metrics (Prometheus + REST)
 * - Integration with registry for fast health checks
 *
 * Address: o://monitor
 */
export class MonitorTool extends oLaneTool {
  private metricsStore: MetricsStore;
  private httpServer?: MonitorHTTPServer;
  private httpPort: number;
  private enableHTTP: boolean;
  private cleanupInterval?: NodeJS.Timeout;

  // Child providers
  private heartbeatProvider?: HeartbeatProvider;
  private nodeHealthProvider?: NodeHealthProvider;
  private libp2pMetricsProvider?: LibP2PMetricsProvider;

  constructor(config: MonitorToolConfig) {
    super({
      address: config.address || new oAddress('o://monitor'),
      name: config.name || 'monitor',
      description:
        config.description ||
        'Monitoring and observability tool for Olane OS network',
      leader: config.leader || null,
      parent: config.parent || null,
    });

    this.metricsStore = new MetricsStore();
    this.httpPort =
      config.httpPort || parseInt(process.env.MONITOR_HTTP_PORT || '9090', 10);
    this.enableHTTP =
      config.enableHTTP ?? process.env.MONITOR_HTTP_ENABLED !== 'false';
  }

  async initialize(): Promise<void> {
    await super.initialize();

    // Create and start child providers
    await this.initializeProviders();

    // Start HTTP server if enabled
    if (this.enableHTTP) {
      await this.startHTTPServer();
    }

    // Start periodic cleanup of old metrics
    this.startCleanupInterval();

    this.logger.info('Monitor tool initialized successfully');
  }

  async teardown(): Promise<void> {
    this.logger.info('Shutting down monitor tool...');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop HTTP server
    if (this.httpServer) {
      await this.httpServer.stop();
    }

    // Teardown child providers
    const children = this.hierarchyManager.getChildren();
    for (const child of children) {
      try {
        await this.useChild(child, { method: 'stop', params: {} });
      } catch (error) {
        this.logger.error(`Failed to stop child ${child}:`, error);
      }
    }

    await super.teardown();
  }

  /**
   * Initialize all child provider nodes
   */
  private async initializeProviders(): Promise<void> {
    // Heartbeat Provider
    this.heartbeatProvider = new HeartbeatProvider({
      parent: this.address as any,
      leader: this.leader as any,
      metricsStore: this.metricsStore,
    });
    await this.heartbeatProvider.start();
    this.addChildNode(this.heartbeatProvider);

    // Node Health Provider
    this.nodeHealthProvider = new NodeHealthProvider({
      parent: this.address as any,
      leader: this.leader as any,
      metricsStore: this.metricsStore,
    });
    await this.nodeHealthProvider.start();
    this.addChildNode(this.nodeHealthProvider);

    // LibP2P Metrics Provider
    this.libp2pMetricsProvider = new LibP2PMetricsProvider({
      parent: this.address as any,
      leader: this.leader as any,
    });
    await this.libp2pMetricsProvider.start();
    this.addChildNode(this.libp2pMetricsProvider);

    this.logger.debug('All provider nodes initialized');
  }

  /**
   * Start HTTP server for metrics and API
   */
  private async startHTTPServer(): Promise<void> {
    this.httpServer = new MonitorHTTPServer({
      port: this.httpPort,
      metricsStore: this.metricsStore,
      onNodeQuery: async (address: string) => {
        // Query live node data
        try {
          const response = await this.use(new oAddress(address), {
            method: 'get_metrics',
            params: {},
          });
          return response.result;
        } catch (error: any) {
          return { error: error.message };
        }
      },
      onNetworkQuery: async () => {
        // Query network-wide data
        try {
          const registry = await this.use(new oAddress('o://leader'), {
            method: 'find_all',
            params: {},
          });
          return {
            registeredNodes: registry.result?.data || [],
            registryCount: (registry.result?.data as any[])?.length || 0,
          };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    });

    await this.httpServer.start();
    this.logger.info(`HTTP server started on port ${this.httpPort}`);
  }

  /**
   * Start periodic cleanup of old metrics
   */
  private startCleanupInterval(): void {
    const cleanupIntervalMs = parseInt(
      process.env.MONITOR_CLEANUP_INTERVAL || '3600000', // 1 hour default
      10,
    );

    this.cleanupInterval = setInterval(() => {
      this.logger.debug('Running metrics cleanup...');
      this.metricsStore.cleanup();
    }, cleanupIntervalMs);
  }

  // ========================================
  // Tool Methods (Public API)
  // ========================================

  /**
   * Record a heartbeat from a node
   */
  async _tool_record_heartbeat(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://heartbeat'), {
      method: 'record_heartbeat',
      params: request.params,
    });
  }

  /**
   * Get service status (used by registry for fast health checks)
   */
  async _tool_get_service_status(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://heartbeat'), {
      method: 'get_service_status',
      params: request.params,
    });
  }

  /**
   * Check if a service is alive
   */
  async _tool_is_service_alive(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://heartbeat'), {
      method: 'is_service_alive',
      params: request.params,
    });
  }

  /**
   * Get all stale services
   */
  async _tool_get_stale_services(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://heartbeat'), {
      method: 'get_stale_services',
      params: request.params,
    });
  }

  /**
   * Collect metrics from all nodes
   */
  async _tool_collect_metrics(request: oRequest): Promise<any> {
    // Get all registered nodes from leader
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

    const addresses = Array.isArray(registry.result?.data)
      ? (registry.result.data as any[]).map((node: any) => node.address)
      : [];

    // Delegate to node health provider
    return this.useChild(new oAddress('o://health'), {
      method: 'collect_node_metrics',
      params: { addresses },
    });
  }

  /**
   * Get network status summary
   */
  async _tool_get_network_status(request: oRequest): Promise<any> {
    const summary = this.metricsStore.getSummary();
    const staleServices = this.metricsStore.getStaleServices();

    // Get registry data
    let registryData = null;
    try {
      const registry = await this.use(new oAddress('o://leader'), {
        method: 'find_all',
        params: {},
      });
      registryData = {
        registeredNodes: (registry.result?.data as any[])?.length || 0,
        nodes: registry.result?.data || [],
      };
    } catch (error: any) {
      this.logger.error('Failed to get registry data:', error);
    }

    // Get libp2p metrics
    let libp2pData = null;
    try {
      const libp2pMetrics = await this.useChild(new oAddress('o://libp2p'), {
        method: 'get_connection_manager_status',
        params: {},
      });
      libp2pData = libp2pMetrics.result;
    } catch (error: any) {
      this.logger.error('Failed to get libp2p data:', error);
    }

    return {
      timestamp: Date.now(),
      summary,
      staleServices,
      registryData,
      libp2pData,
    };
  }

  /**
   * Get metrics for a specific node
   */
  async _tool_get_node_metrics(request: oRequest): Promise<any> {
    const { address } = request.params;

    if (!address) {
      throw new Error('address parameter is required');
    }

    const latestMetrics = this.metricsStore.getLatestMetrics(address as string);
    const allMetrics = this.metricsStore.getAllMetrics(address as string);
    const heartbeat = this.metricsStore.getLastHeartbeat(address as string);
    const isAlive = this.metricsStore.isNodeAlive(address as string);

    return {
      address,
      latestMetrics,
      historicalMetrics: allMetrics,
      lastHeartbeat: heartbeat?.timestamp || null,
      isAlive,
    };
  }

  /**
   * Get performance report
   */
  async _tool_get_performance_report(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://health'), {
      method: 'get_performance_report',
      params: request.params,
    });
  }

  /**
   * Get libp2p peer information
   */
  async _tool_get_peer_info(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://libp2p'), {
      method: 'get_peer_info',
      params: request.params,
    });
  }

  /**
   * Get libp2p DHT status
   */
  async _tool_get_dht_status(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://libp2p'), {
      method: 'get_dht_status',
      params: request.params,
    });
  }

  /**
   * Get all libp2p metrics
   */
  async _tool_get_libp2p_metrics(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://libp2p'), {
      method: 'get_all_libp2p_metrics',
      params: request.params,
    });
  }

  /**
   * Manually trigger polling of all nodes
   */
  async _tool_poll_now(request: oRequest): Promise<any> {
    return this.useChild(new oAddress('o://health'), {
      method: 'poll_now',
      params: request.params,
    });
  }

  /**
   * Get metrics summary
   */
  async _tool_get_metrics_summary(request: oRequest): Promise<any> {
    const summary = this.metricsStore.getSummary();
    const allNodes = this.metricsStore.getAllTrackedNodes();

    let totalSuccess = 0;
    let totalErrors = 0;
    let totalActiveRequests = 0;

    for (const address of allNodes) {
      const metrics = this.metricsStore.getLatestMetrics(address);
      if (metrics) {
        totalSuccess += metrics.successCount;
        totalErrors += metrics.errorCount;
        totalActiveRequests += metrics.activeRequests;
      }
    }

    return {
      timestamp: Date.now(),
      ...summary,
      aggregateMetrics: {
        totalSuccess,
        totalErrors,
        totalActiveRequests,
        errorRate:
          totalSuccess + totalErrors > 0
            ? (totalErrors / (totalSuccess + totalErrors)) * 100
            : 0,
      },
    };
  }

  /**
   * Enable or disable metrics collection
   */
  async _tool_enable_metrics_collection(request: oRequest): Promise<any> {
    const { enabled } = request.params;

    if (enabled === undefined) {
      throw new Error('enabled parameter is required (boolean)');
    }

    // This would control the polling interval in the health provider
    // For now, just return status
    return {
      message: `Metrics collection ${enabled ? 'enabled' : 'disabled'}`,
      enabled,
    };
  }
}
