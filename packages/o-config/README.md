# @olane/o-config

Pre-configured libp2p setup for Olane OS networking - batteries included, ready to use.

[![npm version](https://badge.fury.io/js/%40olane%2Fo-config.svg)](https://www.npmjs.com/package/@olane/o-config)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## TL;DR {#tldr}

**o-config** bundles libp2p and networking utilities with sensible defaults so you don't have to configure complex P2P networking yourself. Import it, use the defaults, and you're ready to build distributed systems on Olane OS.

## What is o-config? {#what-is-o-config}

**o-config** is the **networking configuration layer** for Olane OS. Instead of manually setting up libp2p with dozens of configuration options, o-config provides:

- **Pre-configured libp2p settings** - Production-ready defaults for transports, encryption, multiplexing
- **Unified exports** - All libp2p modules in one place
- **Helper functions** - Quick node creation with `createNode()`
- **Multiple transports** - TCP, WebSocket, WebTransport, and Memory (for testing)
- **DHT & Discovery** - Distributed hash table and peer discovery out of the box

## Quick Start {#quick-start}

### Installation

```bash
npm install @olane/o-config
```

### Create Your First libp2p Node

```typescript
import { createNode, defaultLibp2pConfig } from '@olane/o-config';

// Create a libp2p node with default configuration
const node = await createNode(defaultLibp2pConfig);

// Start the node
await node.start();

console.log('Node started!');
console.log('Peer ID:', node.peerId.toString());
console.log('Listening on:', node.getMultiaddrs());

// Stop when done
await node.stop();
```

### Custom Configuration

```typescript
import { createNode, tcp, webSockets } from '@olane/o-config';

// Create node with custom transports and listeners
const node = await createNode({
  listeners: [
    '/ip4/0.0.0.0/tcp/4001',      // Listen on TCP port 4001
    '/ip4/0.0.0.0/tcp/4002/ws'    // Listen on WebSocket port 4002
  ],
  transports: [tcp(), webSockets()],  // Only TCP and WebSocket
  connectionManager: {
    minConnections: 5,
    maxConnections: 50
  }
});

await node.start();
```

## How It Works {#how-it-works}

**o-config** provides a **default libp2p configuration** optimized for Olane OS networks. Instead of manually configuring:

- Transports (TCP, WebSocket, WebTransport, Memory)
- Connection encryption (Noise protocol)
- Stream multiplexing (Yamux)
- Services (DHT, Identify, Ping)
- Connection management
- Peer discovery

...you get all of this pre-configured and ready to use.

### Default Configuration

```typescript
{
  // Listen on all network interfaces
  listeners: ['/ip4/0.0.0.0/tcp/0', '/ip6/::/tcp/0'],
  
  // Multiple transport protocols
  transports: [webTransport(), webSockets(), tcp(), memory()],
  
  // Noise protocol for encryption
  connectionEncrypters: [noise()],
  
  // Yamux for multiplexing
  streamMuxers: [yamux()],
  
  // Built-in services
  services: {
    ping: ping(),                    // Health checks
    identify: identify(),            // Peer identification
    dht: kadDHT({                   // Distributed hash table
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false,
      kBucketSize: 20
    })
  }
}
```

## API Reference {#api-reference}

### `createNode(config?)` {#create-node}

Creates a configured libp2p node.

**Parameters:**
- `config` (Libp2pConfig, optional): Custom configuration to merge with defaults

**Returns:** `Promise<Libp2p>` - A libp2p node instance

**Example:**

```typescript
import { createNode } from '@olane/o-config';

// Use defaults
const node1 = await createNode();

// Customize
const node2 = await createNode({
  listeners: ['/ip4/0.0.0.0/tcp/4001'],
  connectionManager: {
    minConnections: 10,
    maxConnections: 100
  }
});
```

---

### `defaultLibp2pConfig` {#default-libp2p-config}

Pre-configured libp2p settings ready to use.

**Type:** `Libp2pConfig`

**Properties:**
- `listeners`: Default listening addresses (IPv4 and IPv6 on TCP port 0)
- `transports`: Array of transport protocols
- `connectionEncrypters`: Noise protocol
- `streamMuxers`: Yamux multiplexer
- `services`: DHT, ping, and identify services

**Example:**

```typescript
import { createNode, defaultLibp2pConfig } from '@olane/o-config';

// Use as-is
const node = await createNode(defaultLibp2pConfig);

// Extend with custom settings
const customNode = await createNode({
  ...defaultLibp2pConfig,
  listeners: ['/ip4/127.0.0.1/tcp/4001'],
  connectionManager: {
    minConnections: 5
  }
});
```

---

### Transport Functions {#transport-functions}

Pre-configured transport protocol factories.

#### `tcp()` {#tcp}

TCP transport for direct network connections.

```typescript
import { tcp } from '@olane/o-config';

const node = await createNode({
  transports: [tcp()],
  listeners: ['/ip4/0.0.0.0/tcp/4001']
});
```

#### `webSockets()` {#websockets}

WebSocket transport for browser compatibility.

```typescript
import { webSockets } from '@olane/o-config';

const node = await createNode({
  transports: [webSockets()],
  listeners: ['/ip4/0.0.0.0/tcp/4001/ws']
});
```

#### `webTransport()` {#webtransport}

WebTransport for modern browser support.

```typescript
import { webTransport } from '@olane/o-config';

const node = await createNode({
  transports: [webTransport()]
});
```

#### `memory()` {#memory}

In-memory transport for testing (no network required).

```typescript
import { memory } from '@olane/o-config';

const node = await createNode({
  transports: [memory()],
  listeners: ['/memory/test-network']
});
```

---

### Encryption & Multiplexing {#encryption-multiplexing}

#### `noise()` {#noise}

Noise protocol for connection encryption.

```typescript
import { noise } from '@olane/o-config';

const node = await createNode({
  connectionEncrypters: [noise()]
});
```

#### `yamux()` {#yamux}

Yamux stream multiplexer.

```typescript
import { yamux } from '@olane/o-config';

const node = await createNode({
  streamMuxers: [yamux()]
});
```

---

### Services {#services}

#### `ping()` {#ping}

Ping service for connection health checks.

```typescript
import { ping } from '@olane/o-config';

const node = await createNode({
  services: {
    ping: ping()
  }
});

// Use it
await node.services.ping.ping(remotePeerId);
```

#### `identify()` {#identify}

Peer identification service.

```typescript
import { identify } from '@olane/o-config';

const node = await createNode({
  services: {
    identify: identify()
  }
});
```

#### `kadDHT()` {#kad-dht}

Kademlia distributed hash table for peer and content routing.

```typescript
import { kadDHT, removePublicAddressesMapper } from '@olane/o-config';

const node = await createNode({
  services: {
    dht: kadDHT({
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false,  // Server mode for providing content
      kBucketSize: 20     // Number of peers per k-bucket
    })
  }
});
```

---

### Discovery {#discovery}

#### `bootstrap(config)` {#bootstrap}

Bootstrap peer discovery.

```typescript
import { bootstrap } from '@olane/o-config';

const node = await createNode({
  peerDiscovery: [
    bootstrap({
      list: [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
      ]
    })
  ]
});
```

**Parameters:**
- `config.list` (string[], required): Array of bootstrap peer multiaddresses

---

### Utilities {#utilities}

#### `multiaddr(address)` {#multiaddr}

Create multiaddress objects.

```typescript
import { multiaddr } from '@olane/o-config';

const addr = multiaddr('/ip4/127.0.0.1/tcp/4001');
console.log(addr.toString());  // "/ip4/127.0.0.1/tcp/4001"
```

#### `pipe(...streams)` {#pipe}

Stream piping utility from it-pipe.

```typescript
import { pipe } from '@olane/o-config';

// Pipe data through streams
await pipe(
  source,
  transform,
  sink
);
```

#### `all(iterator)` {#all}

Collect all values from an async iterator.

```typescript
import { all } from '@olane/o-config';

const values = await all(asyncIterator);
console.log(values);  // Array of all values
```

---

### Peer ID Generation {#peer-id-generation}

#### `createFromPrivKey(privateKey)` {#create-from-priv-key}

Create a peer ID from a private key.

```typescript
import { createFromPrivKey } from '@olane/o-config';

const peerId = await createFromPrivKey(privateKey);
```

#### `createEd25519PeerId()` {#create-ed25519-peer-id}

Generate a new Ed25519 peer ID.

```typescript
import { createEd25519PeerId } from '@olane/o-config';

const peerId = await createEd25519PeerId();
console.log(peerId.toString());
```

---

### Type Definitions {#type-definitions}

#### `Libp2pConfig` {#libp2p-config-type}

Configuration interface for libp2p nodes.

```typescript
interface Libp2pConfig extends Libp2pInit {
  listeners?: string[];              // Listen addresses
  transports?: any[];                // Transport protocols
  connectionEncrypters?: any[];      // Encryption protocols
  streamMuxers?: any[];              // Multiplexing protocols
  services?: Record<string, any>;    // libp2p services
}
```

## Common Use Cases {#common-use-cases}

### Use Case 1: Basic P2P Network {#use-case-basic}

Create two nodes that can communicate.

```typescript
import { createNode, defaultLibp2pConfig } from '@olane/o-config';

// Create first node
const node1 = await createNode(defaultLibp2pConfig);
await node1.start();

// Create second node
const node2 = await createNode(defaultLibp2pConfig);
await node2.start();

// Connect them
await node1.dial(node2.getMultiaddrs());

console.log('Nodes connected!');
console.log('Node 1 peers:', await node1.getPeers());
```

---

### Use Case 2: Testing with Memory Transport {#use-case-testing}

Run tests without network access.

```typescript
import { createNode, memory } from '@olane/o-config';

// Create nodes with in-memory transport
const node1 = await createNode({
  transports: [memory()],
  listeners: ['/memory/test-network']
});

const node2 = await createNode({
  transports: [memory()],
  listeners: ['/memory/test-network']
});

await node1.start();
await node2.start();

// Nodes can communicate without any network
await node1.dial(node2.getMultiaddrs());
```

---

### Use Case 3: Browser-Compatible Node {#use-case-browser}

WebSocket-only configuration for browser environments.

```typescript
import { createNode, webSockets } from '@olane/o-config';

// Browser-compatible configuration
const node = await createNode({
  transports: [webSockets()],
  listeners: ['/ip4/0.0.0.0/tcp/4001/ws']
});

await node.start();

// This node can communicate with other WebSocket nodes
```

---

### Use Case 4: Production Server Node {#use-case-production}

Full-featured server with multiple transports.

```typescript
import { 
  createNode, 
  tcp, 
  webSockets, 
  webTransport,
  bootstrap,
  kadDHT,
  removePublicAddressesMapper
} from '@olane/o-config';

const node = await createNode({
  // Listen on multiple ports and protocols
  listeners: [
    '/ip4/0.0.0.0/tcp/4001',          // TCP
    '/ip4/0.0.0.0/tcp/4002/ws',       // WebSocket
    '/ip6/::/tcp/4001',                // IPv6 TCP
    '/ip6/::/tcp/4002/ws'              // IPv6 WebSocket
  ],
  
  // Support multiple transports
  transports: [tcp(), webSockets(), webTransport()],
  
  // Connection management
  connectionManager: {
    minConnections: 10,
    maxConnections: 200,
    pollInterval: 2000,
    autoDialInterval: 10000
  },
  
  // Bootstrap from known peers
  peerDiscovery: [
    bootstrap({
      list: [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
      ]
    })
  ],
  
  // DHT for content routing
  services: {
    dht: kadDHT({
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false,
      kBucketSize: 20
    })
  }
});

await node.start();
console.log('Production node running on:', node.getMultiaddrs());
```

---

### Use Case 5: Custom Protocol Handler {#use-case-custom-protocol}

Register custom protocol handlers.

```typescript
import { createNode, defaultLibp2pConfig, pipe } from '@olane/o-config';

const node = await createNode(defaultLibp2pConfig);
await node.start();

// Register custom protocol
await node.handle('/my-app/1.0.0', async ({ stream }) => {
  await pipe(
    stream,
    async function* (source) {
      for await (const msg of source) {
        // Process incoming message
        const data = new TextDecoder().decode(msg.subarray());
        console.log('Received:', data);
        
        // Send response
        const response = `Echo: ${data}`;
        yield new TextEncoder().encode(response);
      }
    },
    stream
  );
});

console.log('Custom protocol handler registered');
```

## Troubleshooting {#troubleshooting}

### Error: "No transports available"

**Solution:** Make sure you've included at least one transport in your configuration.

```typescript
// ❌ Wrong - no transports
const node = await createNode({
  listeners: ['/ip4/0.0.0.0/tcp/4001']
});

// ✅ Correct - includes TCP transport
import { tcp } from '@olane/o-config';

const node = await createNode({
  transports: [tcp()],
  listeners: ['/ip4/0.0.0.0/tcp/4001']
});
```

---

### Error: "Transport not supported"

**Solution:** Match your transport to your listener addresses.

```typescript
// ❌ Wrong - WebSocket listener but only TCP transport
import { tcp } from '@olane/o-config';

const node = await createNode({
  transports: [tcp()],
  listeners: ['/ip4/0.0.0.0/tcp/4001/ws']  // /ws requires webSockets()
});

// ✅ Correct - matching transports and listeners
import { tcp, webSockets } from '@olane/o-config';

const node = await createNode({
  transports: [tcp(), webSockets()],
  listeners: [
    '/ip4/0.0.0.0/tcp/4001',      // TCP
    '/ip4/0.0.0.0/tcp/4002/ws'    // WebSocket
  ]
});
```

---

### Error: "Port already in use"

**Solution:** Use port 0 for automatic port assignment, or specify a free port.

```typescript
// Use port 0 for automatic assignment
const node = await createNode({
  listeners: ['/ip4/0.0.0.0/tcp/0']  // OS chooses available port
});

await node.start();
console.log('Listening on:', node.getMultiaddrs());
```

---

### Warning: "DHT in client mode"

**Solution:** If you want to provide content on the network, set `clientMode: false`.

```typescript
import { kadDHT, removePublicAddressesMapper } from '@olane/o-config';

const node = await createNode({
  services: {
    dht: kadDHT({
      clientMode: false,  // Server mode - can provide content
      peerInfoMapper: removePublicAddressesMapper,
      kBucketSize: 20
    })
  }
});
```

## Testing {#testing}

```bash
# Run all tests
npm test

# Node.js tests only
npm run test:node

# Browser tests only
npm run test:browser
```

## Development {#development}

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run in development mode
npm run dev

# Lint code
npm run lint
```

## Related Packages {#related-packages}

- [@olane/o-node](../o-node) - Production P2P node implementation (uses o-config)
- [@olane/o-core](../o-core) - Abstract kernel and base classes
- [@olane/o-protocol](../o-protocol) - Protocol definitions
- [@olane/o-tool](../o-tool) - Tool system for node capabilities

## Documentation {#documentation}

- [o-node Documentation](../o-node/README.md) - See how o-config is used in practice
- [libp2p Documentation](https://docs.libp2p.io/) - Deep dive into libp2p concepts
- [Full Olane Documentation](https://olane.com/docs)

## Support {#support}

- [GitHub Issues](https://github.com/olane-labs/olane/issues)
- [Community Forum](https://olane.com/community)
- [Email Support](mailto:support@olane.com)

## Contributing {#contributing}

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License {#license}

ISC © Olane Inc.

---

**Part of the Olane OS ecosystem** - Pre-configured networking for distributed systems. o-config provides the foundation for P2P communication in Olane OS, letting you focus on building tool nodes instead of configuring libp2p.
