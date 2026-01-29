import { oNodeTool } from '@olane/o-node';
import type { oRequest } from '@olane/o-core';
import { StreamManagerEvent } from '@olane/o-node';
import { identify, Libp2pConfig, ping } from '@olane/o-config';
import { circuitRelayServer } from '@libp2p/circuit-relay-v2';

/**
 * Standard receiver tool (uses base connection manager)
 * Tracks received requests and identified streams
 */
export class RelayTestTool extends oNodeTool {
  public receivedRequests: oRequest[] = [];
  public identifiedStreams: Array<{ streamId: string; role: string }> = [];
  private eventListenersSetup = false;

  constructor(config: any) {
    super({
      ...config,
      runOnLimitedConnection: true,
    });
  }

  async configure(): Promise<Libp2pConfig> {
    const config = await super.configure();
    config.services = {
      identify: identify({
        maxOutboundStreams: Infinity,
        maxInboundStreams: Infinity,
        runOnLimitedConnection: true,
      }),
      ping: ping({
        maxOutboundStreams: Infinity,
        maxInboundStreams: Infinity,
        runOnLimitedConnection: true,
      }),
      relay: circuitRelayServer({
        reservations: {
          maxReservations: Infinity, // need to figure this out
          reservationClearInterval: 60_000 * 5, // 15 minutes
          defaultDurationLimit: 60_000 * 15, // 15 minutes
          defaultDataLimit: BigInt(1024 * 1024 * 10000), // 10GB
        },
      }),
    };
    config.listeners = config.listeners?.filter(
      (l) => l.indexOf('/memory/') === -1,
    );
    config.connectionManager = {
      ...(config?.connectionManager || {}),
      maxConnections: 500,
      maxParallelDials: 100,
      maxDialQueueLength: 100,
      maxPeerAddrsToDial: 25,
    };
    return config;
  }

  /**
   * Set up event listeners for stream identification
   * Call this after tool is started
   */
  setupStreamListeners(connection: any): void {
    if (this.eventListenersSetup || !connection?.streamManager) {
      return;
    }

    this.eventListenersSetup = true;

    // Listen for stream identification events
    connection.streamManager.on(
      StreamManagerEvent.StreamIdentified,
      (data: any) => {
        this.identifiedStreams.push({
          streamId: data.streamId,
          role: data.role,
        });
      },
    );
  }

  /**
   * Get the first connection (for accessing stream manager)
   */
  getFirstConnection(): any {
    const firstEntry = Array.from(
      (this.connectionManager as any)?.cachedConnections?.values() || [],
    );
    return (firstEntry?.[0] as any)[0];
  }
}
