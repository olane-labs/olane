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
   * Collect libp2p metrics and store in MetricsStore
   */
  private async collectAndStoreMetrics(): Promise<void> {
    if (!this.metricsStore) return;

    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      this.logger.warn('libp2p node not available for metrics collection');
      return;
    }

    try {
      // Get basic connection stats
      const connections = p2pNode.getConnections();
      const peers = await p2pNode.peerStore.all();

      const inbound = connections.filter(
        (c: any) => c.direction === 'inbound',
      ).length;
      const outbound = connections.filter(
        (c: any) => c.direction === 'outbound',
      ).length;

      // Get DHT info if available
      const services = p2pNode.services as any;
      const dht = services?.dht;
      const routingTable = dht?.routingTable;
      const kBuckets = routingTable?.kb || null;
      let routingTableSize = 0;

      if (kBuckets) {
        // Handle both array and object-like structures
        if (Array.isArray(kBuckets)) {
          for (const bucket of kBuckets) {
            routingTableSize += bucket.peers?.length || 0;
          }
        } else if (typeof kBuckets === 'object') {
          // If it's an object, iterate over its values
          for (const bucket of Object.values(kBuckets)) {
            routingTableSize += (bucket as any)?.peers?.length || 0;
          }
        }
      }

      const libp2pMetrics = {
        peerCount: peers.length,
        connectionCount: connections.length,
        inboundConnections: inbound,
        outboundConnections: outbound,
        dhtEnabled: !!dht,
        dhtMode: dht?.clientMode ? 'client' : 'server',
        dhtRoutingTableSize: routingTableSize,
        protocols: Array.from(p2pNode.getProtocols()),
        selfPeerId: p2pNode.peerId.toString(),
        multiaddrs: p2pNode.getMultiaddrs().map((ma: any) => ma.toString()),
      };

      // Store in MetricsStore with a well-known address
      this.metricsStore.storeMetrics('o://libp2p-network', {
        successCount: 0,
        errorCount: 0,
        activeRequests: connections.length,
        libp2pMetrics,
      });

      this.logger.debug(
        `Collected libp2p metrics: ${peers.length} peers, ${connections.length} connections`,
      );
    } catch (error: any) {
      this.logger.error('Error collecting libp2p metrics:', error);
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
   * Manually trigger libp2p metrics collection
   */
  async _tool_collect_libp2p_metrics(request: oRequest): Promise<any> {
    await this.collectAndStoreMetrics();

    const metrics = this.metricsStore?.getLatestMetrics('o://libp2p-network');

    return {
      message: 'libp2p metrics collected',
      timestamp: Date.now(),
      metrics: metrics?.libp2pMetrics || null,
    };
  }

  /**
   * Get stored libp2p metrics from MetricsStore
   */
  async _tool_get_stored_libp2p_metrics(request: oRequest): Promise<any> {
    if (!this.metricsStore) {
      throw new Error('MetricsStore not configured');
    }

    const latestMetrics =
      this.metricsStore.getLatestMetrics('o://libp2p-network');
    const allMetrics = this.metricsStore.getAllMetrics('o://libp2p-network');

    return {
      timestamp: Date.now(),
      latest: latestMetrics?.libp2pMetrics || null,
      history: allMetrics
        .filter((m) => m.libp2pMetrics)
        .map((m) => ({
          timestamp: m.timestamp,
          metrics: m.libp2pMetrics,
        })),
    };
  }

  /**
   * Get peer information from libp2p peer store
   */
  async _tool_get_peer_info(request: oRequest): Promise<any> {
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available');
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
   */
  async _tool_get_dht_status(request: oRequest): Promise<any> {
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available');
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
   */
  async _tool_get_transport_stats(request: oRequest): Promise<any> {
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available');
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
   */
  async _tool_get_connection_manager_status(request: oRequest): Promise<any> {
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available');
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
   */
  async _tool_get_all_libp2p_metrics(request: oRequest): Promise<any> {
    const p2pNode = (this as any).p2pNode;
    if (!p2pNode) {
      throw new Error('libp2p node not available');
    }

    try {
      const [peerInfo, dhtStatus, transportStats, connectionManagerStatus] =
        await Promise.all([
          this.use(this.address, {
            method: 'get_peer_info',
            params: {},
          }),
          this.use(this.address, {
            method: 'get_dht_status',
            params: {},
          }),
          this.use(this.address, {
            method: 'get_transport_stats',
            params: {},
          }),
          this.use(this.address, {
            method: 'get_connection_manager_status',
            params: {},
          }),
        ]);

      return {
        timestamp: Date.now(),
        peerInfo,
        dhtStatus,
        transportStats,
        connectionManagerStatus,
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
