---
title: "@olane/o-core - Core Node Implementation"
description: "Core abstract implementation for Olane network nodes with P2P communication, routing, and hierarchical organization"
---

# @olane/o-core

The `@olane/o-core` package provides the foundational abstract implementation for Olane network nodes. It enables peer-to-peer communication, hierarchical network organization, and intelligent routing within the Olane superintelligent network infrastructure.

## Overview

Olane Core (`o-core`) is the heart of every node in the Olane network. It provides:

- **Addressable P2P Communication**: Nodes communicate using the `o://` protocol with hierarchical addressing
- **Intelligent Routing**: Automatic resolution and routing of requests across the network
- **Connection Management**: Efficient connection pooling and transport abstraction
- **Hierarchical Organization**: Support for parent-child node relationships and network leaders
- **State Management**: Comprehensive lifecycle management with proper startup/shutdown procedures
- **Error Handling**: Structured error propagation with detailed error codes and context

## Installation

```bash
npm install @olane/o-core
```

## Quick Start

### Basic Node Implementation

```typescript
import { oCore, oAddress, NodeType } from '@olane/o-core';
import { oTransport } from '@olane/o-core';

class MyNode extends oCore {
  constructor(address: string) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'my-node',
      description: 'A simple Olane network node'
    });
  }

  // Implement required abstract methods
  configureTransports() {
    return []; // Add your transport configurations
  }

  async connect(nextHopAddress: oAddress, targetAddress: oAddress) {
    // Implement connection logic
    return await this.connectionManager.connect({
      nextHopAddress,
      targetAddress
    });
  }

  initializeRouter() {
    // Initialize routing logic
  }

  async register() {
    // Register with network
  }

  async unregister() {
    // Unregister from network
  }
}

// Usage
const node = new MyNode('o://my-network/worker');
await node.start();

// Communicate with other nodes
const response = await node.use(
  new oAddress('o://calculator/add'),
  {
    method: 'add',
    params: { a: 5, b: 3 }
  }
);

console.log(response.result); // { result: 8 }
```

### Network Communication

```typescript
// Send a request to another node
const response = await node.use(
  new oAddress('o://file-server/upload'),
  {
    method: 'uploadFile',
    params: {
      filename: 'document.pdf',
      content: fileBuffer
    },
    id: 'upload-001'
  }
);

// Handle the response
if (response.result.success) {
  console.log('File uploaded successfully:', response.result.fileId);
} else {
  console.error('Upload failed:', response.result.error);
}
```

## Core Concepts

### The o:// Protocol

The `o://` protocol is Olane's addressing system that enables hierarchical, human-readable addresses:

- `o://my-network` - Root network address
- `o://my-network/mcp/linear` - MCP server for Linear integration
- `o://my-network/storage/documents` - Document storage node
- `o://my-network/ai/gpt4` - AI processing node

### Node States

Every Olane node progresses through these states:

- **STOPPED**: Initial state, node is not running
- **STARTING**: Node is initializing and registering
- **RUNNING**: Node is active and processing requests
- **STOPPING**: Node is shutting down gracefully
- **ERROR**: Node encountered an error and needs attention

### Hierarchical Organization

Nodes can be organized in hierarchies:

```typescript
// Parent node
const parentNode = new MyNode('o://company-network');

// Child nodes
const workerNode = new MyNode('o://company-network/worker-1');
const storageNode = new MyNode('o://company-network/storage');

// Establish hierarchy
parentNode.addChildNode(workerNode);
parentNode.addChildNode(storageNode);
```

## API Reference

### oCore Class

The main abstract class that all Olane nodes extend.

#### Constructor

```typescript
constructor(config: oCoreConfig)
```

**Parameters:**
- `config.address` - The node's address in the network
- `config.type` - Node type (LEADER, WORKER, BRIDGE, etc.)
- `config.name` - Human-readable node name
- `config.description` - Node description
- `config.parent` - Parent node address (optional)
- `config.leader` - Network leader address (optional)
- `config.methods` - Available methods this node provides
- `config.dependencies` - Node dependencies

#### Core Methods

##### `start(): Promise<void>`

Starts the node and transitions it to RUNNING state.

```typescript
const node = new MyNode('o://my-network/worker');
try {
  await node.start();
  console.log('Node is now running');
} catch (error) {
  console.error('Failed to start node:', error);
}
```

**Process:**
1. Validates node is in STOPPED state
2. Sets state to STARTING
3. Calls `initialize()` to set up components
4. Attempts network registration
5. Sets state to RUNNING on success

**Throws:** Error if node is not in STOPPED state or initialization fails

##### `stop(): Promise<void>`

Stops the node and performs cleanup.

```typescript
await node.stop();
console.log('Node stopped successfully');
```

**Process:**
1. Sets state to STOPPING
2. Calls `teardown()` for cleanup
3. Sets state to STOPPED

##### `use(address: oAddress, data?): Promise<oResponse>`

Sends a request to another node in the network.

```typescript
const response = await node.use(
  new oAddress('o://calculator/multiply'),
  {
    method: 'multiply',
    params: { x: 6, y: 7 },
    id: 'calc-002'
  }
);
```

**Parameters:**
- `address` - Target node address (must start with 'o://')
- `data.method` - Method to invoke on target node
- `data.params` - Parameters to pass to the method
- `data.id` - Unique request identifier

**Returns:** Promise resolving to oResponse with result

**Throws:** 
- Error for invalid addresses
- oError for target node errors

#### Abstract Methods (Must Implement)

##### `configureTransports(): any[]`

Configure network transports for the node.

```typescript
configureTransports() {
  return [
    new WebSocketTransport({ port: 8080 }),
    new LibP2PTransport({ peerId: this.peerId })
  ];
}
```

##### `connect(nextHopAddress: oAddress, targetAddress: oAddress): Promise<oConnection>`

Establish connection to another node.

##### `initializeRouter(): void`

Set up routing logic for address resolution.

##### `register(): Promise<void>`

Register node with the network.

##### `unregister(): Promise<void>`

Unregister node from the network.

### oAddress Class

Represents an address in the Olane network.

#### Constructor

```typescript
constructor(value: string, transports?: oTransport[])
```

#### Methods

##### `validate(): boolean`

Validates the address format (must start with 'o://').

```typescript
const addr = new oAddress('o://my-network/storage');
console.log(addr.validate()); // true

const invalid = new oAddress('http://example.com');
console.log(invalid.validate()); // false
```

##### `equals(other: oAddress): boolean`

Compares two addresses for equality.

```typescript
const addr1 = new oAddress('o://network/node');
const addr2 = new oAddress('o://network/node');
console.log(addr1.equals(addr2)); // true
```

#### Properties

- `value: string` - The full address string
- `paths: string` - Address without the 'o://' prefix
- `root: string` - Root network address
- `transports: oTransport[]` - Available transports for this address

### Connection System

#### oConnectionManager

Abstract base class for managing connections between nodes.

```typescript
abstract class oConnectionManager extends oObject {
  abstract connect(config: oConnectionConfig): Promise<oConnection>;
  isCached(address: oAddress): boolean;
  getCachedConnection(address: oAddress): oConnection | null;
}
```

#### oConnection

Represents an active connection to another node.

```typescript
// Send data over a connection
const response = await connection.send({
  address: 'o://target/method',
  payload: { data: 'example' },
  id: 'request-123'
});
```

### Transport System

#### oTransport

Abstract base class for network transports.

```typescript
abstract class oTransport extends oObject {
  readonly type: TransportType;
  readonly value: any;
  
  abstract toString(): string;
}
```

**Transport Types:**
- `LIBP2P` - Peer-to-peer networking
- `WEBSOCKET` - WebSocket connections
- `HTTP` - HTTP-based transport
- `CUSTOM` - Custom transport implementations

### Router System

#### oRouter

Handles address resolution and routing within the network.

```typescript
abstract class oRouter extends oObject {
  abstract translate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }>;
  
  abstract isInternal(address: oAddress): boolean;
  addResolver(resolver: oAddressResolver): void;
}
```

## Error Handling

### oError Class

Structured error handling with codes and context.

```typescript
try {
  const response = await node.use(invalidAddress);
} catch (error) {
  if (error instanceof oError) {
    console.error(`Node error ${error.code}: ${error.message}`);
    console.error('Context:', error.context);
  } else {
    console.error('System error:', error.message);
  }
}
```

## Advanced Usage

### Custom Resolvers

Add custom address resolution logic:

```typescript
import { oAddressResolver } from '@olane/o-core';

class DatabaseResolver extends oAddressResolver {
  async resolve(address: oAddress): Promise<oAddress[]> {
    // Custom resolution logic for database addresses
    if (address.paths.startsWith('db/')) {
      return [new oAddress('o://database-server' + address.paths)];
    }
    return [];
  }
}

// Add to router
node.router.addResolver(new DatabaseResolver());
```

### Metrics and Monitoring

```typescript
// Access node metrics
console.log('Request count:', node.metrics.requestCount);
console.log('Error rate:', node.metrics.errorRate);
console.log('Uptime:', node.metrics.uptime);

// Custom metrics
node.metrics.increment('custom.counter');
node.metrics.gauge('custom.value', 42);
```

### Graceful Shutdown

```typescript
import { gracefulShutdown } from '@olane/o-core';

// Set up graceful shutdown
gracefulShutdown(async () => {
  console.log('Shutting down gracefully...');
  await node.stop();
  console.log('Node stopped');
});
```

## Best Practices

### Node Implementation

1. **Always implement all abstract methods** - The oCore class requires several abstract methods to be implemented
2. **Handle errors gracefully** - Use try-catch blocks and proper error propagation
3. **Validate addresses** - Always validate addresses before using them
4. **Use connection caching** - Leverage the built-in connection caching for efficiency
5. **Implement proper cleanup** - Override the `teardown()` method for resource cleanup

### Network Design

1. **Use hierarchical addressing** - Design your address space hierarchically for better organization
2. **Implement health checks** - Add health check endpoints to your nodes
3. **Monitor performance** - Use the built-in metrics system for monitoring
4. **Plan for scale** - Design your network topology to handle growth
5. **Secure communications** - Implement proper authentication and encryption

### Error Handling

1. **Use structured errors** - Prefer oError over generic Error objects
2. **Log contextual information** - Include relevant context in error messages
3. **Implement retry logic** - Add retry mechanisms for transient failures
4. **Monitor error rates** - Track and alert on error rate increases

## Examples

### File Storage Node

```typescript
import { oCore, oAddress, NodeType } from '@olane/o-core';

class FileStorageNode extends oCore {
  private files: Map<string, Buffer> = new Map();

  constructor() {
    super({
      address: new oAddress('o://my-network/storage'),
      type: NodeType.WORKER,
      name: 'file-storage',
      description: 'File storage and retrieval node',
      methods: {
        store: {
          name: 'store',
          description: 'Store a file',
          parameters: {
            filename: { type: 'string', required: true },
            content: { type: 'buffer', required: true }
          }
        },
        retrieve: {
          name: 'retrieve',
          description: 'Retrieve a file',
          parameters: {
            filename: { type: 'string', required: true }
          }
        }
      }
    });
  }

  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'store':
        this.files.set(params.filename, params.content);
        return { success: true, filename: params.filename };
      
      case 'retrieve':
        const content = this.files.get(params.filename);
        if (!content) {
          throw new oError('FILE_NOT_FOUND', `File ${params.filename} not found`);
        }
        return { content, filename: params.filename };
      
      default:
        throw new oError('METHOD_NOT_FOUND', `Method ${method} not supported`);
    }
  }

  // Implement abstract methods...
}
```

### AI Processing Node

```typescript
class AIProcessingNode extends oCore {
  constructor() {
    super({
      address: new oAddress('o://my-network/ai/processor'),
      type: NodeType.WORKER,
      name: 'ai-processor',
      description: 'AI text processing and analysis',
      methods: {
        analyze: {
          name: 'analyze',
          description: 'Analyze text content',
          parameters: {
            text: { type: 'string', required: true },
            type: { type: 'string', required: false }
          }
        }
      }
    });
  }

  async handleRequest(method: string, params: any): Promise<any> {
    if (method === 'analyze') {
      // Simulate AI processing
      const analysis = {
        sentiment: 'positive',
        keywords: params.text.split(' ').slice(0, 5),
        summary: params.text.substring(0, 100) + '...',
        confidence: 0.95
      };
      
      return analysis;
    }
    
    throw new oError('METHOD_NOT_FOUND', `Method ${method} not supported`);
  }
}
```

## Troubleshooting

### Common Issues

#### Node Won't Start

```typescript
// Check node state
console.log('Node state:', node.state);
console.log('Errors:', node.errors);

// Ensure proper configuration
if (!node.address.validate()) {
  console.error('Invalid address format');
}
```

#### Connection Failures

```typescript
// Check transport configuration
console.log('Available transports:', node.transports);

// Verify target address
const targetAddr = new oAddress('o://target/node');
if (!targetAddr.validate()) {
  console.error('Invalid target address');
}
```

#### Routing Issues

```typescript
// Check address resolution
try {
  const { nextHopAddress, targetAddress } = await node.router.translate(address);
  console.log('Next hop:', nextHopAddress.toString());
  console.log('Target:', targetAddress.toString());
} catch (error) {
  console.error('Routing failed:', error);
}
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=o-protocol:* node your-app.js
```

## Contributing

See the main [Olane repository](https://github.com/olane-labs/olane) for contribution guidelines.

## License

Licensed under the Apache 2.0 License. See LICENSE file for details.
