import { oAddress, oRequest } from '@olane/o-core';
import { oNodeToolConfig, oNodeTool } from '@olane/o-node';
import { MetricsStore } from '../utils/metrics-store.js';
import type { Registry } from 'prom-client';

export interface LibP2PMetricsProviderConfig extends oNodeToolConfig {
  metricsStore?: MetricsStore;
  pollingInterval?: number;
  enablePolling?: boolean;
  prometheusRegistry?: Registry;
}

/**
 * LibP2P Metrics Provider - Extracts metrics from libp2p node
 * Child node: o://monitor/libp2p
 */
export class LibP2PMetricsProvider extends oNodeTool {
  private metricsStore?: MetricsStore;
  private pollingInterval?: NodeJS.Timeout;
  private pollingIntervalMs: number = 60000;
  private prometheusRegistry?: Registry;

  constructor(config: LibP2PMetricsProviderConfig) {
    super({
      ...config,
      address: new oAddress('o://libp2p'),
      name: 'libp2p-metrics-provider',
      description: 'Extracts and exposes libp2p network metrics',
    });

    this.metricsStore = config.metricsStore;
    this.prometheusRegistry = config.prometheusRegistry;

    this.pollingIntervalMs =
      config.pollingInterval ||
      parseInt(process.env.LIBP2P_METRICS_POLLING_INTERVAL || '60000', 10);
  }

  async initialize(): Promise<void> {
    await super.initialize();

    const enablePolling = process.env.LIBP2P_METRICS_AUTO_POLL !== 'false';
    if (enablePolling && this.metricsStore) {
      this.startPolling();
    }
  }

  async teardown(): Promise<void> {
    this.stopPolling();
    await super.teardown();
  }

  /**
   * Collect libp2p metrics from all nodes and store in MetricsStore
   */
  private async collectAndStoreMetrics(): Promise<void> {
    if (!this.metricsStore) return;

    try {
      // Get all registered nodes from the registry
      const registry = await this.use(oAddress.registry(), {
        method: 'find_all',
        params: {},
      });

      if (!registry.result || !registry.result.data) {
        this.logger.warn(
          'No nodes found in registry for libp2p metrics collection',
        );
        return;
      }

      const addresses = Array.isArray(registry.result.data)
        ? (registry.result.data as any[]).map((node: any) => node.address)
        : [];

      let successCount = 0;
      let failureCount = 0;

      // Collect libp2p metrics from each node
      for (const address of addresses) {
        try {
          const result = await this.use(new oAddress(address as string), {
            method: 'get_libp2p_metrics',
            params: {},
          });

          const libp2pMetrics = result.result.data;

          if (libp2pMetrics && libp2pMetrics.available) {
            // Store per-node metrics in MetricsStore
            this.metricsStore.storeMetrics(
              this.address.toStaticAddress().toString(),
              {
                successCount: 0,
                errorCount: 0,
                activeRequests: libp2pMetrics.connectionCount || 0,
                libp2pMetrics,
              },
            );
            successCount++;

            this.logger.debug(
              `Collected libp2p metrics from ${address}: ${libp2pMetrics.peerCount} peers, ${libp2pMetrics.connectionCount} connections`,
            );
          } else {
            this.logger.debug(
              `libp2p not available on node ${address}: ${libp2pMetrics?.error || 'unknown reason'}`,
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to collect libp2p metrics from ${address}:`,
            error.message,
          );
          failureCount++;
        }
      }

      this.logger.debug(
        `Libp2p metrics collection complete: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error: any) {
      this.logger.error('Error during libp2p metrics collection:', error);
    }
  }

  /**
   * Start automatic polling of libp2p metrics
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    this.logger.info(
      `Starting libp2p metrics polling every ${this.pollingIntervalMs}ms`,
    );

    // Immediate first collection
    this.collectAndStoreMetrics().catch((err) =>
      this.logger.error('Error in initial metrics collection:', err),
    );

    // Set up interval
    this.pollingInterval = setInterval(async () => {
      await this.collectAndStoreMetrics();
    }, this.pollingIntervalMs);
  }

  /**
   * Stop automatic polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.logger.info('Stopped libp2p metrics polling');
    }
  }

  /**
   * Manually trigger libp2p metrics collection from all nodes
   */
  async _tool_collect_libp2p_metrics(request: oRequest): Promise<any> {
    await this.collectAndStoreMetrics();

    if (!this.metricsStore) {
      return {
        message: 'MetricsStore not configured',
        timestamp: Date.now(),
        collected: 0,
      };
    }

    // Get all tracked nodes with libp2p metrics
    const allNodes = this.metricsStore.getAllTrackedNodes();
    const nodesWithMetrics = allNodes.filter((address) => {
      const metrics = this.metricsStore?.getLatestMetrics(address);
      return metrics?.libp2pMetrics?.available;
    });

    return {
      message: 'libp2p metrics collected from all nodes',
      timestamp: Date.now(),
      nodesCollected: nodesWithMetrics.length,
      totalNodes: allNodes.length,
      nodes: nodesWithMetrics,
    };
  }

  /**
   * Get stored libp2p metrics from MetricsStore
   * @param request.params.nodeAddress - Optional: specific node address to query (defaults to all nodes)
   */
  async _tool_get_stored_libp2p_metrics(request: oRequest): Promise<any> {
    if (!this.metricsStore) {
      throw new Error('MetricsStore not configured');
    }

    const { nodeAddress } = request.params as any;

    // If a specific node is requested, return only that node's metrics
    if (nodeAddress) {
      const latestMetrics = this.metricsStore.getLatestMetrics(nodeAddress);
      const allMetrics = this.metricsStore.getAllMetrics(nodeAddress);

      return {
        timestamp: Date.now(),
        nodeAddress,
        latest: latestMetrics?.libp2pMetrics || null,
        history: allMetrics
          .filter((m) => m.libp2pMetrics)
          .map((m) => ({
            timestamp: m.timestamp,
            metrics: m.libp2pMetrics,
          })),
      };
    }

    // Otherwise, return metrics from all nodes
    const allNodes = this.metricsStore.getAllTrackedNodes();
    const nodeMetrics: any = {};

    for (const address of allNodes) {
      const latestMetrics = this.metricsStore.getLatestMetrics(address);
      if (latestMetrics?.libp2pMetrics) {
        nodeMetrics[address] = {
          latest: latestMetrics.libp2pMetrics,
          lastUpdated: latestMetrics.timestamp,
        };
      }
    }

    return {
      timestamp: Date.now(),
      nodeCount: Object.keys(nodeMetrics).length,
      nodes: nodeMetrics,
    };
  }

  /**
   * Get peer information from libp2p peer store
   * @param request.params.nodeAddress - Optional: specific node to query (defaults to this monitor's node)
   */
  async _tool_get_peer_info(request: oRequest): Promise<any> {
    const { nodeAddress } = request.params as any;

    // If querying a remote node, forward the request
    if (nodeAddress) {
      try {
        const result = await this.use(new oAddress(nodeAddress), {
          method: 'get_libp2p_metrics',
          params: {},
        });

        const metrics = result.result.data;
        if (!metrics || !metrics.available) {
          throw new Error(`libp2p not available on node ${nodeAddress}`);
        }

        // Return peer information from the metrics
        return {
          timestamp: Date.now(),
          nodeAddress,
          peerCount: metrics.peerCount,
          selfPeerId: metrics.selfPeerId,
          selfMultiaddrs: metrics.multiaddrs,
          protocols: metrics.protocols,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to get peer info from ${nodeAddress}: ${error.message}`,
        );
      }
    }

    // Otherwise, query this node's libp2p instance
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available on monitor');
    }

    try {
      const peers = await p2pNode.peerStore.all();

      const peerInfo = peers.map((peer: any) => ({
        peerId: peer.id.toString(),
        addresses: peer.addresses.map((addr: any) => ({
          multiaddr: addr.multiaddr.toString(),
          isCertified: addr.isCertified,
        })),
        protocols: peer.protocols,
        metadata: Object.fromEntries(peer.metadata.entries()),
        tags: Object.fromEntries(peer.tags.entries()),
      }));

      return {
        timestamp: Date.now(),
        peerCount: peers.length,
        peers: peerInfo,
        selfPeerId: p2pNode.peerId.toString(),
        selfMultiaddrs: p2pNode.getMultiaddrs().map((ma: any) => ma.toString()),
      };
    } catch (error: any) {
      throw new Error(`Failed to get peer info: ${error.message}`);
    }
  }

  /**
   * Get DHT (Distributed Hash Table) status
   * @param request.params.nodeAddress - Optional: specific node to query (defaults to this monitor's node)
   */
  async _tool_get_dht_status(request: oRequest): Promise<any> {
    const { nodeAddress } = request.params as any;

    // If querying a remote node, forward the request
    if (nodeAddress) {
      try {
        const result = await this.use(new oAddress(nodeAddress), {
          method: 'get_libp2p_metrics',
          params: {},
        });

        const metrics = result.result.data;
        if (!metrics || !metrics.available) {
          throw new Error(`libp2p not available on node ${nodeAddress}`);
        }

        return {
          timestamp: Date.now(),
          nodeAddress,
          enabled: metrics.dhtEnabled,
          mode: metrics.dhtMode,
          routingTableSize: metrics.dhtRoutingTableSize,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to get DHT status from ${nodeAddress}: ${error.message}`,
        );
      }
    }

    // Otherwise, query this node's libp2p instance
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available on monitor');
    }

    try {
      // Get DHT service if available
      const services = p2pNode.services as any;
      const dht = services?.dht;

      if (!dht) {
        return {
          enabled: false,
          message: 'DHT service not configured',
        };
      }

      // Get routing table info
      const routingTable = dht?.routingTable;
      const kBuckets = routingTable?.kb || null;

      let routingTableSize = 0;
      if (kBuckets) {
        if (Array.isArray(kBuckets)) {
          routingTableSize = kBuckets.length;
        } else if (typeof kBuckets === 'object') {
          routingTableSize = Object.keys(kBuckets).length;
        }
      }

      return {
        timestamp: Date.now(),
        enabled: true,
        mode: dht.clientMode ? 'client' : 'server',
        routingTableSize,
        // Add more DHT-specific metrics as needed
      };
    } catch (error: any) {
      throw new Error(`Failed to get DHT status: ${error.message}`);
    }
  }

  /**
   * Get transport and connection statistics
   * @param request.params.nodeAddress - Optional: specific node to query (defaults to this monitor's node)
   */
  async _tool_get_transport_stats(request: oRequest): Promise<any> {
    const { nodeAddress } = request.params as any;

    // If querying a remote node, forward the request
    if (nodeAddress) {
      try {
        const result = await this.use(new oAddress(nodeAddress), {
          method: 'get_libp2p_metrics',
          params: {},
        });

        const metrics = result.result.data;
        if (!metrics || !metrics.available) {
          throw new Error(`libp2p not available on node ${nodeAddress}`);
        }

        return {
          timestamp: Date.now(),
          nodeAddress,
          connectionCount: metrics.connectionCount,
          protocols: metrics.protocols,
          multiaddrs: metrics.multiaddrs,
          inboundConnections: metrics.inboundConnections,
          outboundConnections: metrics.outboundConnections,
          streamCount: metrics.streamCount,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to get transport stats from ${nodeAddress}: ${error.message}`,
        );
      }
    }

    // Otherwise, query this node's libp2p instance
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available on monitor');
    }

    try {
      const connections = p2pNode.getConnections();
      const dialQueue = (p2pNode.services as any).connectionManager?.dialQueue;

      const connectionStats = connections.map((conn: any) => ({
        remotePeer: conn.remotePeer.toString(),
        remoteAddr: conn.remoteAddr.toString(),
        status: conn.status,
        direction: conn.direction,
        timeline: {
          open: (conn as any).timeline?.open,
          upgraded: (conn as any).timeline?.upgraded,
        },
        streams:
          (conn as any).streams?.map((stream: any) => ({
            id: stream.id,
            protocol: stream.protocol,
            direction: stream.direction,
            timeline: stream.timeline,
          })) || [],
      }));

      const protocols = p2pNode.getProtocols();

      return {
        timestamp: Date.now(),
        connectionCount: connections.length,
        connections: connectionStats,
        protocols: Array.from(protocols),
        multiaddrs: p2pNode.getMultiaddrs().map((ma: any) => ma.toString()),
        status: p2pNode.status,
      };
    } catch (error: any) {
      throw new Error(`Failed to get transport stats: ${error.message}`);
    }
  }

  /**
   * Get connection manager status
   * @param request.params.nodeAddress - Optional: specific node to query (defaults to this monitor's node)
   */
  async _tool_get_connection_manager_status(request: oRequest): Promise<any> {
    const { nodeAddress } = request.params as any;

    // If querying a remote node, forward the request
    if (nodeAddress) {
      try {
        const result = await this.use(new oAddress(nodeAddress), {
          method: 'get_libp2p_metrics',
          params: {},
        });

        const metrics = result.result.data;
        if (!metrics || !metrics.available) {
          throw new Error(`libp2p not available on node ${nodeAddress}`);
        }

        return {
          timestamp: Date.now(),
          nodeAddress,
          totalConnections: metrics.connectionCount,
          uniquePeers: metrics.peerCount,
          inboundConnections: metrics.inboundConnections,
          outboundConnections: metrics.outboundConnections,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to get connection manager status from ${nodeAddress}: ${error.message}`,
        );
      }
    }

    // Otherwise, query this node's libp2p instance
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available on monitor');
    }

    try {
      const connections = p2pNode.getConnections();

      // Group connections by peer
      const peerConnections = new Map<string, number>();
      for (const conn of connections) {
        const peerId = conn.remotePeer.toString();
        peerConnections.set(peerId, (peerConnections.get(peerId) || 0) + 1);
      }

      // Connection directions
      const inbound = connections.filter(
        (c: any) => c.direction === 'inbound',
      ).length;
      const outbound = connections.filter(
        (c: any) => c.direction === 'outbound',
      ).length;

      return {
        timestamp: Date.now(),
        totalConnections: connections.length,
        uniquePeers: peerConnections.size,
        inboundConnections: inbound,
        outboundConnections: outbound,
        connectionsPerPeer: Object.fromEntries(peerConnections),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to get connection manager status: ${error.message}`,
      );
    }
  }

  /**
   * Get all libp2p metrics in one call
   * @param request.params.nodeAddress - Optional: specific node to query (defaults to all nodes)
   */
  async _tool_get_all_libp2p_metrics(request: oRequest): Promise<any> {
    const { nodeAddress } = request.params as any;

    // If querying a specific node, get all its metrics
    if (nodeAddress) {
      try {
        const [
          peerInfoResult,
          dhtStatusResult,
          transportStatsResult,
          connectionManagerStatusResult,
        ] = await Promise.all([
          this.use(this.address, {
            method: 'get_peer_info',
            params: { nodeAddress },
          }),
          this.use(this.address, {
            method: 'get_dht_status',
            params: { nodeAddress },
          }),
          this.use(this.address, {
            method: 'get_transport_stats',
            params: { nodeAddress },
          }),
          this.use(this.address, {
            method: 'get_connection_manager_status',
            params: { nodeAddress },
          }),
        ]);

        return {
          timestamp: Date.now(),
          nodeAddress,
          peerInfo: peerInfoResult.result.data,
          dhtStatus: dhtStatusResult.result.data,
          transportStats: transportStatsResult.result.data,
          connectionManagerStatus: connectionManagerStatusResult.result.data,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to get all libp2p metrics from ${nodeAddress}: ${error.message}`,
        );
      }
    }

    // Otherwise, get metrics from all nodes
    if (!this.metricsStore) {
      throw new Error('MetricsStore not configured');
    }

    try {
      const allNodes = this.metricsStore.getAllTrackedNodes();
      const nodeMetrics: any = {};

      for (const address of allNodes) {
        const latestMetrics = this.metricsStore.getLatestMetrics(address);
        if (latestMetrics?.libp2pMetrics?.available) {
          nodeMetrics[address] = latestMetrics.libp2pMetrics;
        }
      }

      return {
        timestamp: Date.now(),
        nodeCount: Object.keys(nodeMetrics).length,
        totalNodes: allNodes.length,
        nodes: nodeMetrics,
      };
    } catch (error: any) {
      throw new Error(`Failed to get all libp2p metrics: ${error.message}`);
    }
  }

  /**
   * Ping a specific peer
   */
  async _tool_ping_peer(request: oRequest): Promise<any> {
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available');
    }

    const { peerId } = request.params;

    if (!peerId) {
      throw new Error('peerId is required');
    }

    try {
      const ping = (p2pNode.services as any).ping;

      if (!ping) {
        throw new Error('Ping service not configured');
      }

      const startTime = Date.now();
      const latency = await ping.ping(peerId);
      const endTime = Date.now();

      return {
        peerId,
        latency,
        responseTime: endTime - startTime,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      throw new Error(`Failed to ping peer: ${error.message}`);
    }
  }
}
