import { oAddress, oRequest } from '@olane/o-core';
import { oNodeToolConfig, oNodeTool } from '@olane/o-node';
import { MetricsStore } from '../utils/metrics-store.js';

export interface HeartbeatProviderConfig extends oNodeToolConfig {
  metricsStore: MetricsStore;
}

/**
 * Heartbeat Provider - Tracks service heartbeats and liveness
 * Child node: o://monitor/heartbeat
 */
export class HeartbeatProvider extends oNodeTool {
  private metricsStore: MetricsStore;

  constructor(config: HeartbeatProviderConfig) {
    super({
      ...config,
      address: new oAddress('o://heartbeat'),
      name: 'heartbeat-provider',
      description: 'Tracks service heartbeats and liveness',
    });
    this.metricsStore = config.metricsStore;
  }

  /**
   * Record a heartbeat from a node
   */
  async _tool_record_heartbeat(request: oRequest): Promise<any> {
    const { address, metrics, timestamp } = request.params;

    if (!address) {
      throw new Error('Address is required for heartbeat');
    }

    this.metricsStore.recordHeartbeat(address as string, metrics);

    this.logger.debug(`Recorded heartbeat from ${address}`);

    return {
      message: 'Heartbeat recorded',
      address,
      timestamp: timestamp || Date.now(),
    };
  }

  /**
   * Get heartbeat status for a specific service
   */
  async _tool_get_service_status(request: oRequest): Promise<any> {
    const { address } = request.params;

    if (!address) {
      throw new Error('Address is required');
    }

    const heartbeat = this.metricsStore.getLastHeartbeat(address as string);
    const isAlive = this.metricsStore.isNodeAlive(address as string);

    return {
      address,
      lastHeartbeat: heartbeat?.timestamp || null,
      isAlive,
      timeSinceHeartbeat: heartbeat ? Date.now() - heartbeat.timestamp : null,
      metrics: heartbeat?.metrics || null,
    };
  }

  /**
   * Get all stale services (no recent heartbeat)
   */
  async _tool_get_stale_services(request: oRequest): Promise<any> {
    const staleServices = this.metricsStore.getStaleServices();
    const details = staleServices.map((address) => {
      const heartbeat = this.metricsStore.getLastHeartbeat(address);
      return {
        address,
        lastHeartbeat: heartbeat?.timestamp || null,
        timeSinceHeartbeat: heartbeat ? Date.now() - heartbeat.timestamp : null,
      };
    });

    return {
      count: staleServices.length,
      staleServices: details,
    };
  }

  /**
   * Get all active heartbeats
   */
  async _tool_get_all_heartbeats(request: oRequest): Promise<any> {
    const heartbeats = this.metricsStore.getAllHeartbeats();

    return {
      count: heartbeats.length,
      heartbeats: heartbeats.map((hb) => ({
        address: hb.address,
        timestamp: hb.timestamp,
        timeSince: Date.now() - hb.timestamp,
        isAlive: this.metricsStore.isNodeAlive(hb.address),
      })),
    };
  }

  /**
   * Check if a specific service is alive
   */
  async _tool_is_service_alive(request: oRequest): Promise<any> {
    const { address } = request.params;

    if (!address) {
      throw new Error('Address is required');
    }

    const isAlive = this.metricsStore.isNodeAlive(address as string);
    const heartbeat = this.metricsStore.getLastHeartbeat(address as string);

    return {
      address,
      isAlive,
      lastHeartbeat: heartbeat?.timestamp || null,
    };
  }
}
