# @olane/os

**Address**: `o://os` (system-level)  
**Type**: Runtime System  
**Domain**: Operating System / Infrastructure

## Overview

`@olane/os` is the runtime system for Olane OS - the agentic operating system where agents (human or AI) are the users, tools are the applications, and Olane packages provide the infrastructure. OlaneOS manages the lifecycle, coordination, and execution of tools, nodes, and applications in a distributed environment.

Think of OlaneOS as the orchestration layer that:
- Starts and manages leader nodes for discovery and coordination
- Launches and supervises worker nodes containing tools
- Routes requests between agents and nodes
- Maintains system configuration and state
- Provides graceful lifecycle management (start, stop, restart)

## What You'll Learn

- How to create and start an Olane OS instance
- How to configure leaders and nodes in your OS
- How to manage OS instance lifecycle
- How to route requests to nodes
- How to persist and manage configuration

## Prerequisites

- Node.js 20+
- Basic understanding of the [Three-Layer Model](../../docs/understanding/three-layer-model.mdx)
- Familiarity with [Tools, Nodes, and Applications](../../docs/TOOL_NODE_APPLICATION_DISTINCTION.md)

**Time estimate**: 15-20 minutes

## Installation

```bash
pnpm install @olane/os
```

### Peer Dependencies

OlaneOS requires the following peer dependencies:

```bash
pnpm install @olane/o-core @olane/o-config @olane/o-protocol \
  @olane/o-tool @olane/o-tools-common @olane/o-tool-registry \
  @olane/o-intelligence @olane/o-leader @olane/o-lane @olane/o-storage
```

## Quick Start

### Basic OS Instance

```typescript
import { OlaneOS } from '@olane/os';
import { NodeType, oAddress } from '@olane/o-core';

// Create OS instance
const os = new OlaneOS({
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader'),
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://node'),
      leader: null,
      parent: null,
    },
  ],
});

// Start the OS
await os.start();

// Use a node via the OS
const response = await os.use(
  new oAddress('o://node'),
  {
    method: 'some_tool',
    params: { /* ... */ }
  }
);

// Check response using the standard wrapping structure
if (response.result.success) {
  console.log('Data:', response.result.data);
} else {
  console.error('Error:', response.result.error);
}

// Stop the OS gracefully
await os.stop();
```

### Expected Output

```
OS instance started...
Root leader at: o://leader
Nodes: 1 worker node(s)
Status: RUNNING
```

## Architecture

### System Components

OlaneOS manages three primary components:

| Component | Type | Purpose | Address Pattern |
|-----------|------|---------|-----------------|
| **Root Leader** | oLeaderNode | Discovery, coordination, registry | `o://leader` |
| **Leaders** | oLeaderNode[] | Load-balanced leader instances | `o://leader/*` |
| **Nodes** | oLaneTool[] | Worker nodes with tools | `o://*` |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: USERS (Agents)                                │
│  ✓ Humans (via CLI, web, API)                           │
│  ✓ AI (GPT-4, Claude, Gemini)                           │
└─────────────────────────────────────────────────────────┘
                        ⬇ sends requests
┌─────────────────────────────────────────────────────────┐
│  OlaneOS Runtime                                        │
│                                                          │
│  ┌───────────────────────────────────────────────┐     │
│  │  Entry Point Router (round-robin)             │     │
│  └───────────────────────────────────────────────┘     │
│                     ⬇                                   │
│  ┌────────────────┐      ┌────────────────────────┐    │
│  │  Root Leader   │──────│  Node 1 (oLaneTool)    │    │
│  │  o://leader    │      │  • Tools: [A, B, C]    │    │
│  │  • Discovery   │      │  • Capabilities        │    │
│  │  • Registry    │      └────────────────────────┘    │
│  │  • Coordination│                                     │
│  └────────────────┘      ┌────────────────────────┐    │
│         │                │  Node 2 (oLaneTool)    │    │
│         └────────────────│  • Tools: [D, E, F]    │    │
│                          │  • Capabilities        │    │
│                          └────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                        ⬇ manages
┌─────────────────────────────────────────────────────────┐
│  Layer 3: INFRASTRUCTURE (Olane OS)                     │
│  • Network discovery (libp2p)                           │
│  • Message routing                                      │
│  • Configuration persistence                            │
└─────────────────────────────────────────────────────────┘
```

## Core Concepts

### OS Instance Lifecycle

OlaneOS follows a clear lifecycle with four states:

```typescript
enum OlaneOSSystemStatus {
  STARTING = 'starting',   // Initializing configuration and nodes
  RUNNING = 'running',     // Operational and accepting requests
  STOPPING = 'stopping',   // Gracefully shutting down nodes
  STOPPED = 'stopped'      // Fully stopped
}
```

#### Lifecycle Flow

```
STOPPED → start() → STARTING → [initialize] → RUNNING
   ⬆                                              │
   │                                              │
   └───────── stop() ← STOPPING ← [shutdown] ────┘
```

### Entry Point Routing

OlaneOS uses round-robin routing to distribute requests across nodes:

```typescript
// Requests are automatically load-balanced
const response1 = await os.use(address, params); // → Node 1
const response2 = await os.use(address, params); // → Node 2
const response3 = await os.use(address, params); // → Node 1
// Access data via response.result.data on each response
```

This provides:
- **Load distribution** across worker nodes
- **Fault tolerance** if nodes fail
- **Scalability** by adding more node instances

### Response Structure

When calling tools via `os.use()`, responses follow a standard wrapped structure:

```typescript
{
  jsonrpc: "2.0",
  id: "request-id",
  result: {
    success: boolean,    // Whether the call succeeded
    data: any,           // The return value on success
    error?: string       // Error message on failure
  }
}
```

Always access response fields through the `result` property:

```typescript
const response = await os.use(address, {
  method: 'some_method',
  params: { /* ... */ }
});

// Check success
if (response.result.success) {
  const data = response.result.data;    // Access return value
} else {
  const error = response.result.error;  // Access error message
}
```

> **Common mistake**: Accessing `response.success` or `response.data` directly will not work. Always use `response.result.success`, `response.result.data`, and `response.result.error`.

### Configuration Management

OlaneOS supports two configuration approaches:

**1. Programmatic Configuration** (ephemeral)
```typescript
const os = new OlaneOS({
  nodes: [/* node configs */],
  lanes: [/* saved plans */],
  noIndexNetwork: false
});
```

**2. File-Based Configuration** (persistent)
```typescript
const os = new OlaneOS({
  configFilePath: '/path/to/config.json'
});
```

Configuration files follow this structure:

```json
{
  "name": "my-olane-os",
  "version": "0.0.1",
  "description": "My Olane OS instance",
  "port": 4999,
  "oNetworkConfig": {
    "nodes": [
      {
        "type": "leader",
        "address": { "value": "o://leader" },
        "network": {
          "listeners": ["/ip4/0.0.0.0/tcp/4999"]
        }
      },
      {
        "type": "node",
        "address": { "value": "o://my-node" }
      }
    ],
    "lanes": [],
    "noIndexNetwork": false
  }
}
```

## Configuration Reference

### OlaneOSConfig Interface

```typescript
interface OlaneOSConfig {
  // Path to persistent configuration file
  configFilePath?: string;
  
  // Network metadata
  network?: {
    name?: string;
    version?: string;
    description?: string;
    icon?: string;
    website?: string;
    networkId?: string;
    port?: number;
  };
  
  // Node configurations to start
  nodes?: oNodeConfig[];
  
  // Saved plans/lanes to run on startup
  lanes?: string[];
  
  // Skip network indexing on startup
  noIndexNetwork?: boolean;
  
  // In-progress operations
  inProgress?: string[];
}
```

### Node Configuration

Each node in the `nodes` array follows the `oNodeConfig` interface:

```typescript
{
  type: NodeType.LEADER | NodeType.NODE,
  address: oAddress,
  leader: oAddress | null,
  parent: oAddress | null,
  network?: {
    listeners?: string[]  // libp2p listener addresses
  }
}
```

## API Reference

### OlaneOS Class

#### Constructor

```typescript
constructor(config: OlaneOSConfig)
```

Creates a new OlaneOS instance with the specified configuration.

**Parameters**:
- `config` - Configuration object or file path

**Example**:
```typescript
const os = new OlaneOS({
  configFilePath: './config.json'
});
```

#### start()

```typescript
async start(): Promise<{ peerId: string; transports: oTransport[] }>
```

Starts the OS instance, initializes configuration, launches all nodes, and runs saved plans.

**Returns**:
```typescript
{
  peerId: string,           // Peer ID of root leader
  transports: oTransport[]  // Active network transports
}
```

**Lifecycle**:
1. Load configuration from file (if specified)
2. Start leader nodes
3. Start worker nodes
4. Run saved plans/lanes
5. Index network (unless `noIndexNetwork: true`)
6. Set status to `RUNNING`

**Example**:
```typescript
const { peerId, transports } = await os.start();
console.log(`OS started with peer ID: ${peerId}`);
```

#### stop()

```typescript
async stop(): Promise<void>
```

Gracefully stops all nodes in the OS instance.

**Lifecycle**:
1. Set status to `STOPPING`
2. Stop all worker nodes in parallel
3. Stop all leader nodes in parallel
4. Stop root leader
5. Set status to `STOPPED`

**Example**:
```typescript
await os.stop();
console.log('OS stopped successfully');
```

#### restart()

```typescript
async restart(): Promise<void>
```

Restarts the OS instance by stopping and starting again.

**Example**:
```typescript
await os.restart();
```

#### use()

```typescript
async use(address: oAddress, params: any): Promise<any>
```

Routes a request to a node via the entry point router.

**Parameters**:
- `address` - Target node address (e.g., `o://node/tool`)
- `params` - Request parameters including method and params

**Returns**: A wrapped response object with the following structure:
```typescript
{
  jsonrpc: "2.0",
  id: "request-id",
  result: {
    success: boolean,    // Whether the call succeeded
    data: any,           // Response data on success
    error?: string       // Error message on failure
  }
}
```

**Example**:
```typescript
const response = await os.use(
  new oAddress('o://financial-analyst'),
  {
    method: 'intent',
    params: {
      intent: 'Analyze Q4 revenue trends'
    }
  }
);

if (response.result.success) {
  console.log('Analysis:', response.result.data);
} else {
  console.error('Failed:', response.result.error);
}
```

#### addNode()

```typescript
async addNode(node: oLaneTool | oLeaderNode): Promise<void>
```

Dynamically adds a node to a running OS instance.

**Requirements**:
- OS must be in `RUNNING` status
- At least one existing node must be present

**Example**:
```typescript
import { oLaneTool } from '@olane/o-lane';

const newNode = new oLaneTool({
  address: new oAddress('o://new-node'),
  leader: os.rootLeader?.address
});

await os.addNode(newNode);
```

#### addLeader()

```typescript
addLeader(leader: oLeaderNode): void
```

Adds a leader node to the OS instance. First leader added becomes the root leader.

**Example**:
```typescript
import { oLeaderNode } from '@olane/o-leader';

const leader = new oLeaderNode({
  address: new oAddress('o://leader'),
  leader: null,
  parent: null
});

os.addLeader(leader);
```

### Properties

#### status

```typescript
readonly status: OlaneOSSystemStatus
```

Current status of the OS instance.

**Values**:
- `STARTING` - Initialization in progress
- `RUNNING` - Operational
- `STOPPING` - Shutdown in progress
- `STOPPED` - Not running

#### rootLeader

```typescript
readonly rootLeader: oLeaderNode | null
```

Reference to the root leader node (provides discovery and coordination).

**Example**:
```typescript
if (os.rootLeader) {
  console.log(`Root leader: ${os.rootLeader.address.toString()}`);
  console.log(`Peer ID: ${os.rootLeader.peerId.toString()}`);
}
```

## Configuration Manager

### ConfigManager Class

Static utility class for managing OS instance configurations.

#### initialize()

```typescript
static async initialize(): Promise<void>
```

Ensures config directories exist and creates default config file if needed.

#### getConfig()

```typescript
static async getConfig(): Promise<CLIConfig>
```

Retrieves the CLI configuration.

#### saveOSConfig()

```typescript
static async saveOSConfig(config: OlaneOSInstanceConfig): Promise<void>
```

Persists an OS instance configuration to disk.

**Example**:
```typescript
import { ConfigManager } from '@olane/os';

await ConfigManager.saveOSConfig({
  name: 'production-os',
  version: '1.0.0',
  description: 'Production OS instance',
  port: 4999,
  status: OlaneOSSystemStatus.STOPPED,
  oNetworkConfig: {
    nodes: [/* ... */]
  }
});
```

#### getOSConfig()

```typescript
static async getOSConfig(name: string): Promise<OlaneOSInstanceConfig | null>
```

Loads an OS instance configuration by name.

**Example**:
```typescript
const config = await ConfigManager.getOSConfig('production-os');
if (config) {
  console.log(`Found OS: ${config.name}`);
}
```

#### listOSInstances()

```typescript
static async listOSInstances(): Promise<OlaneOSInstanceConfig[]>
```

Lists all saved OS instance configurations.

**Example**:
```typescript
const instances = await ConfigManager.listOSInstances();
instances.forEach(instance => {
  console.log(`${instance.name} - ${instance.status}`);
});
```

#### deleteOSInstance()

```typescript
static async deleteOSInstance(name: string): Promise<void>
```

Deletes a saved OS instance configuration.

## Use Cases

### Use Case 1: Development Environment

Create a local development OS instance for testing nodes and tools.

```typescript
import { OlaneOS } from '@olane/os';
import { NodeType, oAddress, setupGracefulShutdown } from '@olane/o-core';

const devOS = new OlaneOS({
  network: {
    name: 'dev-environment',
    port: 4999
  },
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader'),
      leader: null,
      parent: null,
      network: {
        listeners: ['/ip4/127.0.0.1/tcp/4999']
      }
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://dev-node'),
      leader: null,
      parent: null
    }
  ],
  noIndexNetwork: true  // Skip indexing for faster startup
});

// Graceful shutdown on Ctrl+C
setupGracefulShutdown(
  async () => {
    console.log('Shutting down dev environment...');
    await devOS.stop();
  },
  { timeout: 30000 }
);

await devOS.start();
console.log('Development OS ready!');
```

### Use Case 2: Production Multi-Node System

Deploy a production OS with multiple worker nodes and persistent configuration.

```typescript
import { OlaneOS, ConfigManager } from '@olane/os';
import { NodeType, oAddress } from '@olane/o-core';

// Save production configuration
await ConfigManager.saveOSConfig({
  name: 'production-os',
  version: '1.0.0',
  description: 'Production CRM application',
  port: 5000,
  status: OlaneOSSystemStatus.STOPPED,
  oNetworkConfig: {
    configFilePath: '/etc/olane/production-config.json',
    network: {
      name: 'production-crm',
      port: 5000,
      networkId: 'prod-001'
    },
    nodes: [
      {
        type: NodeType.LEADER,
        address: new oAddress('o://leader'),
        network: {
          listeners: ['/ip4/0.0.0.0/tcp/5000']
        }
      },
      {
        type: NodeType.NODE,
        address: new oAddress('o://crm/customers')
      },
      {
        type: NodeType.NODE,
        address: new oAddress('o://crm/sales')
      },
      {
        type: NodeType.NODE,
        address: new oAddress('o://crm/analytics')
      }
    ]
  }
});

// Load and start from saved config
const config = await ConfigManager.getOSConfig('production-os');
const prodOS = new OlaneOS(config!.oNetworkConfig!);
await prodOS.start();
```

### Use Case 3: Dynamic Node Addition

Add nodes to a running OS instance without restart.

```typescript
import { OlaneOS } from '@olane/os';
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// Start minimal OS
const os = new OlaneOS({
  nodes: [
    { type: NodeType.LEADER, address: new oAddress('o://leader') },
    { type: NodeType.NODE, address: new oAddress('o://base') }
  ]
});

await os.start();

// Later, add new capability dynamically
const newNode = new oLaneTool({
  address: new oAddress('o://new-capability'),
  leader: os.rootLeader?.address,
  parent: os.rootLeader?.address
});

await os.addNode(newNode);
console.log('New capability added without restart!');
```

### Use Case 4: Saved Plans Execution

Automatically run saved plans/lanes on OS startup.

```typescript
import { OlaneOS } from '@olane/os';

const os = new OlaneOS({
  configFilePath: './config.json',
  lanes: [
    'o://monitor/system-health',  // Auto-runs on startup
    'o://backup/daily-snapshot'   // Auto-runs on startup
  ]
});

await os.start();
// Saved plans execute automatically during startup
```

## Advanced Usage

### Custom Entry Point Selection

Override the default round-robin routing:

```typescript
class CustomOS extends OlaneOS {
  entryNode() {
    // Custom routing logic (e.g., based on load, region, etc.)
    return this.selectOptimalNode();
  }
  
  private selectOptimalNode() {
    // Your custom selection algorithm
  }
}
```

### Monitoring OS Health

```typescript
import { OlaneOS, OlaneOSSystemStatus } from '@olane/os';

const os = new OlaneOS(config);
await os.start();

// Monitor status
setInterval(() => {
  console.log(`OS Status: ${os.status}`);
  console.log(`Root Leader: ${os.rootLeader?.peerId}`);
  console.log(`Active Transports: ${os.rootLeader?.transports.length}`);
}, 5000);
```

### Multi-Instance Management

```typescript
import { ConfigManager } from '@olane/os';

// List all OS instances
const instances = await ConfigManager.listOSInstances();

// Start specific instance
const targetInstance = instances.find(i => i.name === 'staging-os');
if (targetInstance) {
  const os = new OlaneOS(targetInstance.oNetworkConfig!);
  await os.start();
}

// Clean up old instances
for (const instance of instances) {
  if (instance.status === OlaneOSSystemStatus.STOPPED) {
    await ConfigManager.deleteOSInstance(instance.name);
  }
}
```

## Best Practices

### 1. Always Use Graceful Shutdown

```typescript
import { setupGracefulShutdown } from '@olane/o-core';

setupGracefulShutdown(
  async () => {
    await os.stop();
  },
  {
    timeout: 30000,
    onTimeout: () => {
      console.error('Forced shutdown after timeout');
    }
  }
);
```

### 2. Persist Critical Configurations

```typescript
// Use file-based config for production
const os = new OlaneOS({
  configFilePath: process.env.OLANE_CONFIG_PATH || './config.json'
});
```

### 3. Monitor OS Lifecycle

```typescript
const os = new OlaneOS(config);

// Before starting
console.log('Initial status:', os.status); // STOPPED

await os.start();
console.log('After start:', os.status); // RUNNING

await os.stop();
console.log('After stop:', os.status); // STOPPED
```

### 4. Handle Startup Errors

```typescript
try {
  await os.start();
} catch (error) {
  console.error('Failed to start OS:', error);
  
  // Attempt cleanup
  if (os.status !== OlaneOSSystemStatus.STOPPED) {
    await os.stop();
  }
  
  process.exit(1);
}
```

### 5. Use Network Indexing Appropriately

```typescript
// Development: Skip indexing for faster startup
const devOS = new OlaneOS({
  noIndexNetwork: true,
  nodes: [/* ... */]
});

// Production: Enable indexing for discovery
const prodOS = new OlaneOS({
  noIndexNetwork: false,  // Indexes all nodes on startup
  nodes: [/* ... */]
});
```

## Troubleshooting

### Issue: OS fails to start

**Symptom**: Error "No nodes found in config"

**Solution**: Ensure your configuration includes at least one leader and one worker node:

```typescript
const os = new OlaneOS({
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader')
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://worker')
    }
  ]
});
```

### Issue: Cannot add node to running OS

**Symptom**: Error "OS instance is not running"

**Solution**: Ensure OS has started before adding nodes:

```typescript
await os.start();
// Wait for RUNNING status
while (os.status !== OlaneOSSystemStatus.RUNNING) {
  await new Promise(resolve => setTimeout(resolve, 100));
}
// Now safe to add nodes
await os.addNode(newNode);
```

### Issue: Config file not loading

**Symptom**: Warning "No config file path provided, using default config"

**Solution**: Verify the config file path exists and is accessible:

```typescript
import fs from 'fs-extra';

const configPath = './config.json';
await fs.ensureFile(configPath);

const os = new OlaneOS({
  configFilePath: configPath
});
```

### Issue: Port already in use

**Symptom**: Error binding to network port

**Solution**: Change the port in your configuration:

```typescript
const os = new OlaneOS({
  network: {
    port: 5000  // Use different port
  },
  nodes: [
    {
      type: NodeType.LEADER,
      network: {
        listeners: ['/ip4/0.0.0.0/tcp/5000']
      }
    }
  ]
});
```

## Related Documentation

- [Three-Layer Model](../../docs/understanding/three-layer-model.mdx) - Understanding the Olane OS architecture
- [Tools, Nodes, and Applications](../../docs/TOOL_NODE_APPLICATION_DISTINCTION.md) - Terminology and patterns
- [@olane/o-leader](../o-leader/README.md) - Leader node for discovery and coordination
- [@olane/o-lane](../o-lane/README.md) - Complex nodes with autonomous execution
- [@olane/o-node](../o-node/README.md) - Simple node implementation

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

ISC © oLane Inc.

---

**Package Version**: 0.8.3
**Status**: Active development

