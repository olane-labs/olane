// Main exports
export { MonitorTool } from './monitor.tool.js';
export type { MonitorToolConfig } from './monitor.tool.js';

// Provider exports
export { HeartbeatProvider } from './providers/heartbeat.provider.js';
export { NodeHealthProvider } from './providers/node-health.provider.js';
export { LibP2PMetricsProvider } from './providers/libp2p-metrics.provider.js';

// Utility exports
export { MetricsStore } from './utils/metrics-store.js';
export type { MetricEntry, HeartbeatEntry } from './utils/metrics-store.js';

// HTTP server exports
export { MonitorHTTPServer } from './http/server.js';
export type { MonitorHTTPServerConfig } from './http/server.js';

// Prometheus exports
export { prometheusMetrics } from '@libp2p/prometheus-metrics';
