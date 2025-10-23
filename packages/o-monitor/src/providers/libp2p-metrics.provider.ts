import { oAddress, oRequest } from '@olane/o-core';
import { oNodeToolConfig, oNodeTool } from '@olane/o-node';

/**
 * LibP2P Metrics Provider - Extracts metrics from libp2p node
 * Child node: o://monitor/libp2p
 */
export class LibP2PMetricsProvider extends oNodeTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://libp2p'),
      name: 'libp2p-metrics-provider',
      description: 'Extracts and exposes libp2p network metrics',
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
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

      return {
        timestamp: Date.now(),
        enabled: true,
        mode: dht.clientMode ? 'client' : 'server',
        routingTableSize: kBuckets ? kBuckets.length : 0,
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
      const dialQueue = (p2pNode.services as any).connectionManager
        ?.dialQueue;

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
          this._tool_get_peer_info(request),
          this._tool_get_dht_status(request),
          this._tool_get_transport_stats(request),
          this._tool_get_connection_manager_status(request),
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
