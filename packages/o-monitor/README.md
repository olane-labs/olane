# @olane/o-monitor

Comprehensive monitoring and observability tool for Olane OS networks.

## Overview

`o-monitor` provides a unified monitoring solution that integrates libp2p metrics with Olane-specific observability, offering both Prometheus-compatible metrics and a REST API for network health monitoring.

## Features

- **libp2p Metrics Integration** - Leverage `@libp2p/prometheus-metrics` for network observability
- **Node Health Monitoring** - Track success/error rates, active requests, and performance
- **Service Heartbeat Tracking** - Monitor service liveness and detect stale nodes
- **Prometheus Endpoint** - Standard `/metrics` endpoint for Prometheus scraping
- **REST API** - JSON endpoints for dashboards and custom integrations
- **Registry Integration** - Fast health checks for the service registry
- **Automatic Polling** - Configurable background collection of node metrics
- **Time-Series Storage** - In-memory metrics history for trend analysis

## Installation

```bash
npm install @olane/o-monitor
```

## Quick Start

### Basic Setup

```typescript
import { MonitorTool } from '@olane/o-monitor';
import { oAddress } from '@olane/o-core';

// Create monitor tool
const monitor = new MonitorTool({
  address: new oAddress('o://monitor'),
  leader: new oAddress('o://leader'),
  httpPort: 9090,
  enableHTTP: true
});

await monitor.start();

// Monitor is now running:
// - HTTP server on port 9090
// - Prometheus metrics at http://localhost:9090/metrics
// - REST API at http://localhost:9090/api/*
```

### Integration with Olane OS

```typescript
import { oOlaneOS } from '@olane/o-os';
import { MonitorTool } from '@olane/o-monitor';

const os = new oOlaneOS(config);
await os.start();

// Add monitor tool to OS
const monitor = new MonitorTool({
  leader: oAddress.leader(),
  httpPort: 9090
});
await monitor.start();
os.rootLeader?.addChildNode(monitor);
```

## Configuration

### Environment Variables

```bash
# HTTP Server
MONITOR_HTTP_PORT=9090              # HTTP server port (default: 9090)
MONITOR_HTTP_ENABLED=true           # Enable HTTP server (default: true)

# Automatic Polling
MONITOR_AUTO_POLL=true              # Enable automatic node polling (default: true)
MONITOR_POLLING_INTERVAL=60000      # Polling interval in ms (default: 60000)

# Cleanup
MONITOR_CLEANUP_INTERVAL=3600000    # Metrics cleanup interval (default: 1 hour)

# LibP2P Metrics Polling
LIBP2P_METRICS_AUTO_POLL=true       # Enable automatic libp2p metrics polling (default: false)
LIBP2P_METRICS_POLLING_INTERVAL=60000 # Polling interval in ms (default: 60000)

# Optional Heartbeat (for all nodes)
MONITOR_ENABLED=true                # Enable heartbeat from all nodes
MONITOR_ADDRESS=o://monitor         # Monitor address for heartbeats
MONITOR_HEARTBEAT_INTERVAL=30000    # Heartbeat interval in ms (default: 30000)
```

### TypeScript Configuration

```typescript
const monitor = new MonitorTool({
  address: new oAddress('o://monitor'),
  leader: new oAddress('o://leader'),
  httpPort: 9090,
  enableHTTP: true,
  name: 'network-monitor',
  description: 'Production monitoring for Olane network'
});
```

## API Reference

### Tool Methods

All methods are accessible via `monitor.use({ method: '...', params: {...} })`

#### `record_heartbeat`

Record a heartbeat from a node.

**Parameters:**
- `address` (string): Node address
- `timestamp` (number, optional): Heartbeat timestamp
- `metrics` (object, optional): Additional metrics

**Returns:**
```typescript
{
  message: 'Heartbeat recorded',
  address: 'o://node',
  timestamp: 1234567890
}
```

#### `get_service_status`

Get health status of a specific service.

**Parameters:**
- `address` (string): Service address

**Returns:**
```typescript
{
  address: 'o://storage',
  lastHeartbeat: 1234567890,
  isAlive: true,
  timeSinceHeartbeat: 5000,
  metrics: { ... }
}
```

#### `get_network_status`

Get comprehensive network health summary.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  summary: {
    totalNodes: 10,
    aliveNodes: 9,
    staleNodes: 1,
    totalMetricEntries: 500
  },
  staleServices: ['o://old-service'],
  registryData: {
    registeredNodes: 10,
    nodes: [...]
  },
  libp2pData: {
    totalConnections: 5,
    uniquePeers: 3,
    ...
  }
}
```

#### `get_node_metrics`

Get metrics for a specific node.

**Parameters:**
- `address` (string): Node address

**Returns:**
```typescript
{
  address: 'o://storage',
  latestMetrics: {
    timestamp: 1234567890,
    successCount: 100,
    errorCount: 2,
    activeRequests: 5,
    state: 'RUNNING',
    uptime: 3600,
    memoryUsage: { ... }
  },
  historicalMetrics: [...],
  lastHeartbeat: 1234567890,
  isAlive: true
}
```

#### `collect_metrics`

Manually trigger collection from all registered nodes.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  collected: 10,
  failed: 0,
  results: [...],
  errors: []
}
```

#### `get_performance_report`

Analyze network performance and identify issues.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  summary: {
    total: 10,
    healthy: 7,
    slow: 2,
    errorProne: 1
  },
  slowNodes: [...],
  errorProneNodes: [...],
  healthyNodes: [...]
}
```

#### `get_stale_services`

Get all services without recent heartbeats.

**Returns:**
```typescript
{
  count: 1,
  staleServices: [
    {
      address: 'o://old-service',
      lastHeartbeat: 1234560000,
      timeSinceHeartbeat: 90000
    }
  ]
}
```

#### `get_peer_info`

Get libp2p peer information.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  peerCount: 5,
  peers: [
    {
      peerId: '12D3KooW...',
      addresses: [...],
      protocols: ['/olane/1.0.0'],
      metadata: {},
      tags: {}
    }
  ],
  selfPeerId: '12D3KooW...',
  selfMultiaddrs: ['/ip4/...']
}
```

#### `get_dht_status`

Get DHT (Distributed Hash Table) status.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  enabled: true,
  mode: 'server',
  routingTableSize: 20
}
```

#### `get_libp2p_metrics`

Get all libp2p metrics in one call.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  peerInfo: { ... },
  dhtStatus: { ... },
  transportStats: { ... },
  connectionManagerStatus: { ... }
}
```

#### `collect_libp2p_metrics`

Manually trigger collection of libp2p metrics into MetricsStore.

**Returns:**
```typescript
{
  message: 'libp2p metrics collected',
  timestamp: 1234567890,
  metrics: {
    peerCount: 10,
    connectionCount: 5,
    inboundConnections: 2,
    outboundConnections: 3,
    dhtEnabled: true,
    dhtMode: 'server',
    dhtRoutingTableSize: 20,
    protocols: ['/olane/1.0.0', '/ipfs/id/1.0.0'],
    selfPeerId: '12D3KooW...',
    multiaddrs: ['/ip4/127.0.0.1/tcp/4001']
  }
}
```

#### `get_stored_libp2p_metrics`

Get historical libp2p metrics from MetricsStore.

**Returns:**
```typescript
{
  timestamp: 1234567890,
  latest: {
    peerCount: 10,
    connectionCount: 5,
    inboundConnections: 2,
    outboundConnections: 3,
    dhtEnabled: true,
    dhtMode: 'server',
    dhtRoutingTableSize: 20
  },
  history: [
    {
      timestamp: 1234567000,
      metrics: { ... }
    }
  ]
}
```

## HTTP API Endpoints

### Prometheus Metrics

```bash
GET /metrics
```

Returns Prometheus-formatted metrics including:

**Olane-specific metrics:**
- `olane_node_success_count{node_address="o://storage"}` - Success count per node
- `olane_node_error_count{node_address="o://storage"}` - Error count per node
- `olane_node_active_requests{node_address="o://storage"}` - Active requests per node
- `olane_service_last_heartbeat_timestamp{node_address="o://storage"}` - Last heartbeat timestamp
- `olane_network_node_count` - Total nodes in network

**libp2p metrics** (when polling is enabled):
- `libp2p_peer_count` - Number of known peers
- `libp2p_connection_count` - Total active connections
- `libp2p_inbound_connections` - Inbound connections
- `libp2p_outbound_connections` - Outbound connections
- `libp2p_dht_routing_table_size` - DHT routing table size

**Native libp2p metrics** (from @libp2p/prometheus-metrics when registry is shared):
- `libp2p_data_transfer_bytes_total` - Network I/O
- `libp2p_kad_dht_wan_query_time_seconds` - DHT query latency

**Default Node.js metrics:**
- `process_cpu_user_seconds_total` - CPU usage
- `nodejs_memory_usage_bytes` - Memory usage
- And many more...

### REST API

#### Health Check

```bash
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

#### Network Status

```bash
GET /api/network/status
```

Returns comprehensive network health summary.

#### All Nodes

```bash
GET /api/nodes
```

Returns list of all tracked nodes with latest metrics.

#### Specific Node

```bash
GET /api/nodes/o%3A%2F%2Fstorage
```

Returns detailed metrics for a specific node (URL-encode the address).

#### Stale Services

```bash
GET /api/services/stale
```

Returns list of services without recent heartbeats.

#### Metrics Summary

```bash
GET /api/summary
```

Returns aggregated network statistics.

## Usage Examples

### Manual Metrics Collection

```typescript
import { oAddress } from '@olane/o-core';

// Trigger collection from all nodes
const result = await monitor.use({
  method: 'collect_metrics',
  params: {}
});

console.log(`Collected metrics from ${result.collected} nodes`);
```

### Check Service Health (Registry Integration)

```typescript
// Fast health check using heartbeat cache
const status = await monitor.use({
  method: 'get_service_status',
  params: { address: 'o://storage' }
});

if (!status.isAlive) {
  console.log(`Service ${status.address} is stale!`);
}
```

### Enable Heartbeats for All Nodes

Set environment variables before starting nodes:

```bash
export MONITOR_ENABLED=true
export MONITOR_ADDRESS=o://monitor
export MONITOR_HEARTBEAT_INTERVAL=30000
```

Now all nodes will automatically send heartbeats to the monitor every 30 seconds.

### Query Prometheus Metrics

```bash
# Get metrics for Prometheus scraping
curl http://localhost:9090/metrics

# Query specific metric
curl http://localhost:9090/metrics | grep olane_node_success_count
```

### Get Network Performance Report

```typescript
const report = await monitor.use({
  method: 'get_performance_report',
  params: {}
});

console.log(`Healthy nodes: ${report.summary.healthy}`);
console.log(`Slow nodes: ${report.summary.slow}`);
console.log(`Error-prone nodes: ${report.summary.errorProne}`);

// Inspect problematic nodes
for (const node of report.errorProneNodes) {
  console.log(`${node.address}: ${node.errorRate.toFixed(2)}% error rate`);
}
```

### Monitor libp2p Network

```typescript
// Get peer information
const peerInfo = await monitor.use({
  method: 'get_peer_info',
  params: {}
});

console.log(`Connected to ${peerInfo.peerCount} peers`);

// Get DHT status
const dhtStatus = await monitor.use({
  method: 'get_dht_status',
  params: {}
});

console.log(`DHT mode: ${dhtStatus.mode}`);
console.log(`Routing table size: ${dhtStatus.routingTableSize}`);
```

### Integrate with Prometheus & Grafana

1. **Configure Prometheus** (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: 'olane-monitor'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

2. **Start Prometheus**:

```bash
prometheus --config.file=prometheus.yml
```

3. **Add to Grafana**:
   - Add Prometheus data source
   - Import dashboards using metrics like `olane_node_success_count`
   - Create alerts on `olane_service_last_heartbeat_timestamp`

## Architecture

### Child Nodes

MonitorTool spawns three child provider nodes:

1. **HeartbeatProvider** (`o://monitor/heartbeat`)
   - Receives and tracks heartbeats from nodes
   - Provides fast liveness checks
   - Detects stale services

2. **NodeHealthProvider** (`o://monitor/health`)
   - Polls nodes for metrics
   - Collects success/error counts
   - Analyzes performance issues
   - Supports automatic background polling

3. **LibP2PMetricsProvider** (`o://monitor/libp2p`)
   - Extracts libp2p network metrics
   - Provides peer information
   - Monitors DHT and connections
   - Tracks transport statistics

### Metrics Storage

- In-memory time-series storage
- Configurable retention (default: 1000 entries per node)
- Automatic cleanup of old data
- Heartbeat timeout: 60 seconds

### Data Flow

```
┌─────────────┐
│ Olane Nodes │ ──(heartbeat)──► ┌──────────────────┐
└─────────────┘                   │ MonitorTool      │
                                  │                  │
┌─────────────┐                   │ ┌──────────────┐ │
│ Registry    │ ──(poll)────────► │ │ Heartbeat    │ │
└─────────────┘                   │ │ Provider     │ │
                                  │ └──────────────┘ │
┌─────────────┐                   │                  │
│ Prometheus  │ ◄──(scrape)────── │ ┌──────────────┐ │
└─────────────┘                   │ │ Node Health  │ │
                                  │ │ Provider     │ │
┌─────────────┐                   │ └──────────────┘ │
│ Grafana     │ ◄──(query)──────► │                  │
└─────────────┘                   │ ┌──────────────┐ │
                                  │ │ LibP2P       │ │
                                  │ │ Provider     │ │
                                  │ └──────────────┘ │
                                  │                  │
                                  │ HTTP Server      │
                                  │ :9090            │
                                  └──────────────────┘
```

## Best Practices

1. **Always start the monitor early** in your OS initialization
2. **Use environment variables** for configuration in production
3. **Enable heartbeats** for critical services only (to reduce network overhead)
4. **Set appropriate polling intervals** based on your network size
5. **Monitor the `/api/services/stale` endpoint** for service failures
6. **Use Prometheus for long-term metrics** storage and alerting
7. **Query the REST API** for real-time dashboards

## Troubleshooting

### Monitor HTTP server won't start

**Issue:** Port already in use

**Solution:**
```bash
export MONITOR_HTTP_PORT=9091
```

### No metrics appearing

**Issue:** Nodes not being polled

**Solution:**
```bash
# Enable automatic polling
export MONITOR_AUTO_POLL=true
export MONITOR_POLLING_INTERVAL=60000
```

### Heartbeats not received

**Issue:** Nodes not configured to send heartbeats

**Solution:** Set environment variables on all nodes:
```bash
export MONITOR_ENABLED=true
export MONITOR_ADDRESS=o://monitor
```

### High memory usage

**Issue:** Too many metrics entries

**Solution:** Reduce cleanup interval:
```bash
export MONITOR_CLEANUP_INTERVAL=1800000  # 30 minutes
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

ISC © oLane Inc.
