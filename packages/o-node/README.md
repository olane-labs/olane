# @olane/o-node

The production distribution layer of Olane OS - build tool nodes that AI agents use, with real P2P networking via libp2p.

[![npm version](https://badge.fury.io/js/%40olane%2Fo-node.svg)](https://www.npmjs.com/package/@olane/o-node)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## What is o-node?

**o-node** is the **production-ready distribution layer** of Olane OS - like Ubuntu is to the Linux kernel. While [@olane/o-core](../o-core) defines the abstract kernel, o-node is the actual working OS that uses [libp2p](https://libp2p.io/) for real peer-to-peer networking, discovery, and distributed communication.

### The Three-Layer Model

```
┌─────────────────────────────────────────────┐
│  USERS: AI Agents (LLMs)                    │
│  - GPT-4, Claude, Gemini, etc.              │
│  - Natural language interfaces              │
│  - Intelligent reasoning brains             │
└─────────────────────────────────────────────┘
                    ⬇ use
┌─────────────────────────────────────────────┐
│  APPLICATIONS: Tool Nodes (you build)       │
│  - Domain-specific capabilities             │
│  - Business integrations (APIs, DBs)        │
│  - Specialized tools and services           │
└─────────────────────────────────────────────┘
                    ⬇ run on
┌─────────────────────────────────────────────┐
│  OPERATING SYSTEM: Olane Runtime (o-node)   │
│  - P2P networking (libp2p)                  │
│  - Tool node discovery                      │
│  - IPC & routing                            │
│  - Process management                       │
└─────────────────────────────────────────────┘
```

**Key Insight**: You build **tool nodes** (specialized applications) using o-node, which **AI agents** (LLMs) use as intelligent users to accomplish tasks.

## Key Features

- 🌐 **Peer-to-Peer Networking** - Built on libp2p for true decentralized communication
- 🔍 **Automatic Discovery** - DHT-based tool node discovery and routing
- 🔒 **Secure by Default** - Encrypted connections with connection gating
- 🚀 **Production Ready** - Battle-tested libp2p stack with NAT traversal
- 🏗️ **Multiple Node Types** - Server, client, and WebSocket-optimized variants
- 📡 **Network Registration** - Automatic registration with leader nodes
- 🔄 **Persistent Identity** - Seed-based peer IDs for consistent tool node identity
- 🛡️ **Hierarchical Security** - Parent-child access control built-in
- 🧠 **Generalist-Specialist Architecture** - One LLM brain serves many specialized tool nodes

## Relationship to o-core

```
┌─────────────────────────────────────┐
│      o-node (This Package)          │
│   Production Distribution Layer     │
│                                     │
│  • Real P2P networking (libp2p)     │
│  • Tool node discovery & routing    │
│  • Network registration             │
│  • Ready-to-use variants            │
└─────────────────────────────────────┘
              ⬇ implements
┌─────────────────────────────────────┐
│          @olane/o-core              │
│         Abstract Kernel             │
│                                     │
│  • Abstract base classes            │
│  • Router & connection interfaces   │
│  • Transport-agnostic design        │
│  • Core lifecycle management        │
└─────────────────────────────────────┘
```

**Think of it as**: o-core is the **Linux kernel**, o-node is the **Ubuntu distribution**

**Use o-node when:** Building tool nodes that AI agents will use (production systems)  
**Use o-core when:** Building custom transport implementations or experimental architectures

## Installation

```bash
npm install @olane/o-node @olane/o-core @olane/o-protocol @olane/o-config @olane/o-tool
```

## Quick Start

### Creating Your First P2P Tool Node

```typescript
import { oServerNode, oNodeAddress } from '@olane/o-node';
import { NodeType, oRequest } from '@olane/o-core';

// Create a server node (listens for connections)
class MyToolNode extends oServerNode {
  constructor(address: string) {
    super({
      address: new oNodeAddress(address),
      type: NodeType.AGENT,
      description: 'My first tool node for AI agents',
      leader: null, // We'll be our own network for now
      parent: null,
      methods: {
        greet: {
          name: 'greet',
          description: 'Greets the caller',
          parameters: {
            name: { type: 'string', required: true }
          }
        }
      }
    });
  }

  // Implement your tool node's logic
  async execute(request: oRequest): Promise<any> {
    const { method, params } = request;
    
    if (method === 'greet') {
      return { 
        message: `Hello, ${params.name}! I'm a tool node that AI agents can use.`,
        peerId: this.peerId.toString()
      };
    }
    
    throw new Error(`Unknown method: ${method}`);
  }
}

// Start the tool node
const toolNode = new MyToolNode('o://my-tool');
await toolNode.start();

console.log('Tool node running at:', toolNode.transports);
console.log('Peer ID:', toolNode.peerId.toString());

// AI agents can now use this tool node via its o:// address
const response = await toolNode.use(
  toolNode.address,
  { method: 'greet', params: { name: 'World' } }
);

console.log(response.result);
// { message: "Hello, World! I'm a tool node that AI agents can use.", peerId: "..." }

await toolNode.stop();
```

### Creating a Network of Tool Nodes

```typescript
import { oServerNode, oNodeAddress } from '@olane/o-node';
import { NodeType } from '@olane/o-core';

// 1. Create a leader node (network coordinator for tool nodes)
const leader = new oServerNode({
  address: new oNodeAddress('o://leader'),
  type: NodeType.LEADER,
  description: 'Network coordinator',
  leader: null,
  parent: null
});

await leader.start();
console.log('Leader started:', leader.transports[0].toString());

// 2. Create tool nodes that connect to the leader
const salesTool = new oServerNode({
  address: new oNodeAddress('o://sales-tool'),
  type: NodeType.AGENT,
  description: 'Sales analysis tool for AI agents',
  leader: new oNodeAddress('o://leader', leader.transports),
  parent: new oNodeAddress('o://leader', leader.transports)
});

const analyticsTool = new oServerNode({
  address: new oNodeAddress('o://analytics-tool'),
  type: NodeType.AGENT,
  description: 'Data analytics tool for AI agents',
  leader: new oNodeAddress('o://leader', leader.transports),
  parent: new oNodeAddress('o://leader', leader.transports)
});

await salesTool.start();
await analyticsTool.start();

// 3. Tool nodes can now communicate (and AI agents can discover them)!
const response = await salesTool.use(
  new oNodeAddress('o://analytics-tool'),
  { method: 'analyze', params: { data: 'sales-data' } }
);

console.log('Tool node IPC successful! AI agents can now use these tools.');
```

### Persistent Tool Node Identity with Seeds

```typescript
import { oServerNode, oNodeAddress } from '@olane/o-node';

// Create a tool node with a seed for consistent peer ID
const toolNode = new oServerNode({
  address: new oNodeAddress('o://my-service-tool'),
  type: NodeType.AGENT,
  leader: leaderAddress,
  parent: leaderAddress,
  seed: 'my-secure-seed-string' // Same seed = same peer ID every restart
});

await toolNode.start();

// This peer ID will be the same every time with this seed
// Critical for tool nodes that agents depend on finding reliably
console.log('Consistent Peer ID:', toolNode.peerId.toString());

// Important: Secure your seed in production!
// Use environment variables or secure key management
```

## Core Concepts

### libp2p Networking

o-node uses libp2p for all networking, providing:

- **Multiple Transports**: TCP, WebSocket, WebRTC, QUIC
- **Peer Discovery**: DHT, mDNS, bootstrap nodes
- **Content Routing**: Distributed hash table (DHT)
- **NAT Traversal**: Automatic hole-punching and relaying
- **Multiplexing**: Multiple streams over single connection
- **Security**: Noise protocol encryption by default

```typescript
// libp2p transports are automatically configured
const node = new oServerNode(config);
await node.start();

// Access the libp2p node directly if needed
console.log('Protocols:', node.p2pNode.getProtocols());
console.log('Connections:', node.p2pNode.getConnections());
console.log('Multiaddrs:', node.p2pNode.getMultiaddrs());
```

### Multiaddresses

o-node uses libp2p multiaddresses for network addressing:

```typescript
// A multiaddress contains all connection info
const multiaddr = '/ip4/192.168.1.100/tcp/4001/p2p/12D3KooW...';

// Multiaddresses are wrapped in oNodeTransport
const transport = new oNodeTransport(multiaddr);
const address = new oNodeAddress('o://my-agent', [transport]);

// When connecting, o-node uses these multiaddresses
await agent.use(address, { method: 'ping' });
```

### Network Registration

Agents automatically register with leader nodes:

```typescript
class MyAgent extends oServerNode {
  async register(): Promise<void> {
    // Automatically called during start()
    // Registers with leader's registry service
    await this.use(RegistryAddress, {
      method: 'commit',
      params: {
        peerId: this.peerId.toString(),
        address: this.address.toString(),
        protocols: this.p2pNode.getProtocols(),
        transports: this.transports,
        staticAddress: this.staticAddress.toString()
      }
    });
  }
}
```

### Hierarchical Addressing

Agents can be organized hierarchically with automatic address encapsulation:

```typescript
// Parent address
const parent = new oNodeAddress('o://company');

// Child address will be encapsulated
const child = new oNodeAddress('o://sales');

// When child starts with parent, address becomes: o://company/sales
const childAgent = new oServerNode({
  address: child,
  parent: new oNodeAddress('o://company', parentTransports),
  leader: leaderAddress
});

await childAgent.start();
console.log(childAgent.address.toString()); // "o://company/sales"
```

### Connection Security

o-node implements connection gating for hierarchical security:

```typescript
// Child nodes only accept connections from their parent
connectionGater: {
  denyInboundEncryptedConnection: (peerId, maConn) => {
    // Only parent can call us
    if (this.parentPeerId === peerId.toString()) {
      return false; // Allow
    }
    // Deny all others
    return true;
  }
}
```

## Node Types

o-node provides specialized node implementations for different use cases:

### 1. oServerNode - Full-Featured Server

Best for: Long-running services, leader nodes, infrastructure agents

```typescript
import { oServerNode } from '@olane/o-node';

const server = new oServerNode({
  address: new oNodeAddress('o://my-service'),
  type: NodeType.AGENT,
  leader: leaderAddress,
  parent: parentAddress
});

await server.start();

// Listens on multiple transports:
// - TCP (IPv4 and IPv6)
// - WebSocket (IPv4 and IPv6)
// - Memory transport (for testing)
```

Features:
- ✅ Accepts incoming connections
- ✅ Full DHT participation
- ✅ Network advertising
- ✅ Suitable for 24/7 operation

### 2. oNode - Base Implementation

Best for: Custom configurations, specialized transports

```typescript
import { oNode } from '@olane/o-node';

class CustomNode extends oNode {
  configureTransports(): any[] {
    // Customize your transport configuration
    return [customTransport1, customTransport2];
  }
}
```

### 3. Client & WebSocket Variants

```typescript
// Client node (lightweight, dial-only)
import { oClientNode } from '@olane/o-node';

const client = new oClientNode({
  address: new oNodeAddress('o://client'),
  leader: leaderAddress
});

// WebSocket-only node (browser-compatible)
import { oWebSocketNode } from '@olane/o-node';

const wsNode = new oWebSocketNode({
  address: new oNodeAddress('o://ws-agent'),
  leader: leaderAddress
});
```

## Advanced Usage

### Custom Network Configuration

```typescript
import { oServerNode } from '@olane/o-node';
import { tcp, webSockets } from '@olane/o-config';

const agent = new oServerNode({
  address: new oNodeAddress('o://custom'),
  type: NodeType.AGENT,
  leader: leaderAddress,
  parent: parentAddress,
  network: {
    // Custom listeners
    listeners: [
      '/ip4/0.0.0.0/tcp/4001',
      '/ip4/0.0.0.0/tcp/4002/ws'
    ],
    
    // Custom transports
    transports: [tcp(), webSockets()],
    
    // Connection management
    connectionManager: {
      minConnections: 5,
      maxConnections: 50,
      pollInterval: 2000,
      autoDialInterval: 10000,
      dialTimeout: 30000
    },
    
    // Peer discovery
    peerDiscovery: [
      bootstrap({
        list: ['/dnsaddr/bootstrap.libp2p.io/p2p/...']
      })
    ]
  }
});

await agent.start();
```

### Custom Connection Gating

```typescript
const agent = new oServerNode({
  address: new oNodeAddress('o://secure'),
  type: NodeType.AGENT,
  leader: leaderAddress,
  parent: parentAddress,
  network: {
    connectionGater: {
      // Who can connect to us?
      denyInboundEncryptedConnection: (peerId, maConn) => {
        // Allow parent
        if (peerId.toString() === parentPeerId) {
          return false;
        }
        
        // Allow whitelisted peers
        if (whitelist.includes(peerId.toString())) {
          return false;
        }
        
        // Deny everyone else
        return true;
      },
      
      // Who can we connect to?
      denyOutboundEncryptedConnection: (peerId, maConn) => {
        // Custom outbound logic
        return false; // Allow all outbound
      }
    }
  }
});
```

### Network Utilities

```typescript
import { NetworkUtils } from '@olane/o-node';

// Advertise your service on the network
await NetworkUtils.advertiseToNetwork(
  address,
  staticAddress,
  p2pNode
);

// Find a peer on the network
const peer = await NetworkUtils.findPeer(p2pNode, peerId);

// Find a node by address
const { transports } = await NetworkUtils.findNode(p2pNode, address);
```

### Direct libp2p Access

When you need low-level control:

```typescript
const agent = new oServerNode(config);
await agent.start();

// Access the underlying libp2p node
const libp2p = agent.p2pNode;

// Direct libp2p operations
const connections = libp2p.getConnections();
const peers = await libp2p.peerStore.all();
const protocols = libp2p.getProtocols();

// Listen for libp2p events
libp2p.addEventListener('peer:connect', (evt) => {
  console.log('Peer connected:', evt.detail.toString());
});

libp2p.addEventListener('peer:disconnect', (evt) => {
  console.log('Peer disconnected:', evt.detail.toString());
});

// Manual dialing
const connection = await libp2p.dial(multiaddr);
const stream = await connection.newStream('/my-protocol/1.0.0');
```

### Implementing Custom Protocols

```typescript
import { oServerNode } from '@olane/o-node';
import { pipe } from '@olane/o-config';

class CustomProtocolNode extends oServerNode {
  async initialize(): Promise<void> {
    await super.initialize();
    
    // Register custom protocol handler
    await this.p2pNode.handle('/my-custom-protocol/1.0.0', async ({ stream }) => {
      pipe(
        stream,
        async function* (source) {
          for await (const msg of source) {
            // Process incoming messages
            const data = new TextDecoder().decode(msg.subarray());
            const response = await handleCustomMessage(data);
            yield new TextEncoder().encode(response);
          }
        },
        stream
      );
    });
  }
}
```

### Memory Transport for Testing

```typescript
import { oServerNode, oNodeAddress } from '@olane/o-node';

// Create nodes with memory transport (no network required)
const agent1 = new oServerNode({
  address: new oNodeAddress('o://agent1'),
  type: NodeType.AGENT,
  leader: null,
  parent: null,
  network: {
    listeners: ['/memory/test-network']
  }
});

const agent2 = new oServerNode({
  address: new oNodeAddress('o://agent2'),
  type: NodeType.AGENT,
  leader: new oNodeAddress('o://agent1', agent1.transports),
  parent: new oNodeAddress('o://agent1', agent1.transports)
});

await agent1.start();
await agent2.start();

// Agents can communicate in-memory (perfect for tests!)
const response = await agent1.use(agent2.address, {
  method: 'test',
  params: {}
});
```

## API Reference

### oNode Class

Extends `oToolBase` from `@olane/o-tool`, which extends `oCore` from `@olane/o-core`.

#### Constructor

```typescript
new oNode(config: oNodeConfig)
```

#### Configuration

```typescript
interface oNodeConfig extends oCoreConfig {
  leader: oNodeAddress | null;    // Leader node address with transports
  parent: oNodeAddress | null;    // Parent node address with transports
  seed?: string;                  // Seed for consistent peer ID
  network?: Libp2pConfig;        // libp2p configuration
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `p2pNode` | `Libp2p` | Underlying libp2p node instance |
| `peerId` | `PeerId` | This node's libp2p peer ID |
| `transports` | `oNodeTransport[]` | Available network transports |
| `address` | `oNodeAddress` | Full hierarchical address |
| `staticAddress` | `oNodeAddress` | Static (non-hierarchical) address |
| `leader` | `oNodeAddress \| null` | Leader node reference |
| `hierarchyManager` | `oNodeHierarchyManager` | Hierarchy management |

#### Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `async start()` | Start the node and join network | `Promise<void>` |
| `async stop()` | Stop the node gracefully | `Promise<void>` |
| `async initialize()` | Initialize libp2p and connections | `Promise<void>` |
| `async register()` | Register with leader node | `Promise<void>` |
| `async unregister()` | Unregister from leader | `Promise<void>` |
| `async connect(nextHop, target)` | Connect to another node | `Promise<oNodeConnection>` |
| `configureTransports()` | Configure libp2p transports | `any[]` |

### oNodeAddress Class

Extends `oAddress` from `@olane/o-core` with libp2p transport support.

```typescript
// Create with transports
const address = new oNodeAddress(
  'o://my-agent',
  [transport1, transport2]
);

// Get libp2p-specific transports
const libp2pTransports = address.libp2pTransports;

// Convert to multiaddresses
const multiaddrs = libp2pTransports.map(t => t.toMultiaddr());
```

### oNodeConnection Class

Extends `oConnection` from `@olane/o-core` with libp2p stream support.

```typescript
// Connection uses libp2p streams
class oNodeConnection extends oConnection {
  protected p2pConnection: Connection;
  
  async transmit(request: oRequest): Promise<oResponse> {
    // Creates new stream, sends request, waits for response
  }
}
```

### oNodeRouter Class

Extends `oRouter` from `@olane/o-core` with libp2p routing.

```typescript
class oNodeRouter extends oRouter {
  async translate(address, node): Promise<RouteResponse> {
    // Resolves address to next hop with libp2p transports
  }
  
  isInternal(address, node): boolean {
    // Determines if address is in local network
  }
}
```

## Network Architecture Patterns

### Hub-and-Spoke (Star) Network

Best for: Centralized control, simple management

```typescript
// Leader (hub)
const leader = new oServerNode({
  address: new oNodeAddress('o://leader'),
  type: NodeType.LEADER,
  leader: null,
  parent: null
});

await leader.start();

// Spokes (all connect to leader)
const agents = await Promise.all([
  createAgent('o://agent1', leader.transports),
  createAgent('o://agent2', leader.transports),
  createAgent('o://agent3', leader.transports)
]);

// All communication routes through leader
```

### Hierarchical Network

Best for: Large-scale deployments, organizational structure

```typescript
// Root leader
const root = await createLeader('o://company');

// Department leaders
const finance = await createAgent('o://company/finance', root);
const engineering = await createAgent('o://company/engineering', root);

// Team agents
const financeTeam1 = await createAgent('o://company/finance/accounting', finance);
const financeTeam2 = await createAgent('o://company/finance/payroll', finance);

// Agents inherit hierarchy automatically
```

### Mesh Network

Best for: High availability, redundancy

```typescript
// All agents connect to multiple peers
const agents = await Promise.all([
  createAgent('o://agent1'),
  createAgent('o://agent2'),
  createAgent('o://agent3')
]);

// Configure each agent to know about all others
// libp2p will handle mesh routing automatically
```

## Best Practices

### 1. Always Use Seeds in Production

```typescript
// ✅ Good - Consistent peer ID
const agent = new oServerNode({
  address: new oNodeAddress('o://service'),
  seed: process.env.AGENT_SEED, // From secure source
  leader: leaderAddress
});

// ❌ Bad - Peer ID changes on every restart
const agent = new oServerNode({
  address: new oNodeAddress('o://service'),
  // No seed - temporary peer ID
  leader: leaderAddress
});
```

### 2. Handle Network Events

```typescript
const agent = new oServerNode(config);
await agent.start();

// Monitor connection health
agent.p2pNode.addEventListener('peer:connect', (evt) => {
  console.log('Connected to:', evt.detail.toString());
});

agent.p2pNode.addEventListener('peer:disconnect', (evt) => {
  console.warn('Disconnected from:', evt.detail.toString());
  // Implement reconnection logic if needed
});

agent.p2pNode.addEventListener('connection:prune', () => {
  console.log('Pruned inactive connections');
});
```

### 3. Configure Connection Limits

```typescript
const agent = new oServerNode({
  address: new oNodeAddress('o://service'),
  leader: leaderAddress,
  network: {
    connectionManager: {
      minConnections: 10,     // Stay connected to at least 10 peers
      maxConnections: 100,    // Don't exceed 100 connections
      pollInterval: 2000,     // Check every 2 seconds
      autoDialInterval: 10000 // Dial new peers every 10 seconds
    }
  }
});
```

### 4. Implement Graceful Shutdown

```typescript
import { setupGracefulShutdown } from '@olane/o-core';

const agent = new oServerNode(config);
await agent.start();

setupGracefulShutdown(async () => {
  console.log('Shutting down gracefully...');
  
  // Unregister from network
  await agent.unregister();
  
  // Close connections
  await agent.stop();
  
  console.log('Shutdown complete');
});
```

### 5. Use Memory Transport for Tests

```typescript
// test.spec.ts
describe('Agent Communication', () => {
  it('should communicate between agents', async () => {
    const agent1 = new oServerNode({
      address: new oNodeAddress('o://test1'),
      network: { listeners: ['/memory/test'] }
    });
    
    const agent2 = new oServerNode({
      address: new oNodeAddress('o://test2'),
      leader: new oNodeAddress('o://test1', agent1.transports)
    });
    
    await agent1.start();
    await agent2.start();
    
    const response = await agent1.use(agent2.address, {
      method: 'test'
    });
    
    expect(response.result).toBeDefined();
    
    await agent1.stop();
    await agent2.stop();
  });
});
```

### 6. Monitor Network Health

```typescript
class MonitoredNode extends oServerNode {
  private healthCheckInterval?: NodeJS.Timeout;
  
  async start(): Promise<void> {
    await super.start();
    
    // Start health monitoring
    this.healthCheckInterval = setInterval(() => {
      const connections = this.p2pNode.getConnections();
      const peers = this.p2pNode.getPeers();
      
      console.log('Health Check:', {
        connections: connections.length,
        peers: peers.length,
        protocols: this.p2pNode.getProtocols()
      });
      
      // Alert if disconnected
      if (connections.length === 0 && this.leader) {
        console.warn('No active connections! Attempting reconnect...');
        this.reconnectToLeader();
      }
    }, 30000); // Every 30 seconds
  }
  
  async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    await super.stop();
  }
  
  private async reconnectToLeader(): Promise<void> {
    if (!this.leader) return;
    
    try {
      await this.register();
      console.log('Reconnected to leader');
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }
}
```

## Performance Considerations

1. **Connection Pooling** - o-node manages connection reuse automatically
2. **Stream Multiplexing** - Multiple requests over single connection
3. **DHT Caching** - Peer information is cached locally
4. **NAT Traversal** - Automatic hole-punching and relay fallback
5. **Concurrent Requests** - Handle multiple requests simultaneously

## Troubleshooting

### Connection Issues

```typescript
// Enable debug logging
import debug from 'debug';

debug.enable('libp2p:*');
debug.enable('o-protocol:*');

const agent = new oServerNode(config);
await agent.start();
```

### "Can not dial self" Error

```typescript
// This means you're trying to connect to your own address
// Make sure leader/parent addresses have the correct transports

// ❌ Wrong
const agent = new oServerNode({
  address: new oNodeAddress('o://agent'),
  leader: new oNodeAddress('o://leader') // Missing transports!
});

// ✅ Correct
const agent = new oServerNode({
  address: new oNodeAddress('o://agent'),
  leader: new oNodeAddress('o://leader', leaderTransports)
});
```

### Peer Discovery Issues

```typescript
// Add bootstrap nodes for better discovery
const agent = new oServerNode({
  address: new oNodeAddress('o://agent'),
  leader: leaderAddress,
  network: {
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
        ]
      })
    ]
  }
});
```

## Testing

```bash
# Run tests
npm test

# Run tests in Node.js
npm run test:node

# Run tests in browser
npm run test:browser
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run in development mode with debug output
npm run dev

# Update o-core dependency
npm run update:lib

# Lint the code
npm run lint
```

## Related Packages

- `@olane/o-core` - Abstract agent runtime (this implements it)
- `@olane/o-config` - libp2p configuration and utilities
- `@olane/o-protocol` - Protocol definitions and types
- `@olane/o-tool` - Tool system for agent capabilities
- `@olane/o-network-cli` - CLI for managing agent networks

## Documentation

- [o-core Documentation](../o-core/README.md) - Understand the abstract runtime
- [o-core Router System](../o-core/src/router/README.md) - Deep dive into routing
- [o-core Connection System](../o-core/src/connection/README.md) - IPC layer details
- [Full Documentation](https://olane.com/docs)
- [libp2p Documentation](https://docs.libp2p.io/)

## Support

- [GitHub Issues](https://github.com/olane-labs/olane/issues)
- [Community Forum](https://olane.com/community)
- [Email Support](mailto:support@olane.com)

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

ISC © Olane Inc.

---

**Part of the Olane OS ecosystem** - The production distribution layer where you build tool nodes that AI agents use. An agentic operating system where AI agents are the users, tool nodes are the applications, and Olane provides the runtime.
