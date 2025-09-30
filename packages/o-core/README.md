# @olane/o-core

The kernel layer of Olane OS - an agentic operating system where AI agents are the users, and you build tool nodes as applications.

[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://www.npmjs.com/package/@olane/o-core)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## What is o-core?

**o-core** is the **kernel layer** of Olane OS - the foundational runtime for building tool nodes that AI agents use. Think of it as the Linux kernel: it defines how processes work (lifecycle, IPC, addressing, routing) but doesn't implement specific transport layers.

### The Three-Layer Model

```
AI Agents (LLMs) → use → Tool Nodes (you build) → run on → Olane OS (o-core)
```

- **AI Agents (Users)**: GPT-4, Claude, etc. - the intelligent users
- **Tool Nodes (Applications)**: Domain-specific capabilities you build
- **o-core (OS Kernel)**: The runtime infrastructure that makes it all work

This is **NOT** a network framework or API library - it's the abstract operating system layer that makes inter-process communication (IPC), resource addressing, and hierarchical organization possible.

## Key Features

- 🏗️ **Tool Node Runtime**: Base infrastructure for creating tool node processes that agents use
- 📍 **Hierarchical Addressing**: `o://` protocol for filesystem-like tool node addressing
- 🔀 **Intelligent Routing**: Automatic request routing through tool node hierarchies
- 🔌 **Transport-Agnostic**: Abstract layer - works with any communication layer (libp2p, HTTP, custom)
- 🌳 **Hierarchy Management**: Built-in parent-child relationships between tool nodes
- 🔄 **Lifecycle Management**: Complete process state management and graceful shutdown
- 📊 **Observable**: Built-in metrics, logging, and request tracking
- 🛡️ **Fault-Tolerant**: Error handling, graceful degradation, and automatic cleanup

## Installation

```bash
npm install @olane/o-core @olane/o-protocol
```

## Quick Start

### Creating Your First Tool Node

```typescript
import { oCore, oAddress, NodeType, NodeState } from '@olane/o-core';
import { oRequest, oResponse } from '@olane/o-core';

// Extend oCore to create your tool node
class MyToolNode extends oCore {
  constructor(address: string) {
    super({
      address: new oAddress(address),
      type: NodeType.AGENT, // Type remains AGENT for now (legacy naming)
      description: 'My first tool node',
      methods: {
        greet: {
          name: 'greet',
          description: 'Greets the user',
          parameters: {
            name: { type: 'string', required: true }
          }
        }
      }
    });
  }

  // Implement required abstract methods
  async execute(request: oRequest): Promise<any> {
    const { method, params } = request;
    
    if (method === 'greet') {
      return { message: `Hello, ${params.name}!` };
    }
    
    throw new Error(`Unknown method: ${method}`);
  }

  configureTransports(): any[] {
    // Configure your transport layer (libp2p, HTTP, etc.)
    return [];
  }

  async connect(nextHop: oAddress, target: oAddress) {
    // Implement connection logic
    return this.connectionManager.connect({ nextHop, target });
  }

  initializeRouter(): void {
    // Initialize routing logic
    this.router = new MyRouter();
  }

  async register(): Promise<void> {
    // Register with parent or leader node
    console.log('Tool node registered');
  }

  async unregister(): Promise<void> {
    // Cleanup registration
    console.log('Tool node unregistered');
  }
}

// Create and start your tool node
const toolNode = new MyToolNode('o://company/customer-service');
await toolNode.start();

// AI agents can now use this tool node via its o:// address
const response = await toolNode.use(
  new oAddress('o://company/customer-service'),
  {
    method: 'greet',
    params: { name: 'Alice' }
  }
);

console.log(response.result); // { message: "Hello, Alice!" }

// Stop the tool node gracefully
await toolNode.stop();
```

### Tool Node Communication (IPC)

```typescript
// Tool Node A can communicate with Tool Node B using o:// addresses
const salesTool = new MyToolNode('o://company/sales');
const analyticsTool = new MyToolNode('o://company/analytics');

await salesTool.start();
await analyticsTool.start();

// Sales tool calls analytics tool (inter-process communication)
const result = await salesTool.use(
  new oAddress('o://company/analytics'),
  {
    method: 'analyze',
    params: { data: salesData }
  }
);
```

### Hierarchical Organization

```typescript
// Create a parent-child hierarchy of tool nodes
const parent = new MyToolNode('o://company');
const child1 = new MyToolNode('o://company/sales');
const child2 = new MyToolNode('o://company/marketing');

await parent.start();
await child1.start();
await child2.start();

// Register children with parent
parent.addChildNode(child1);
parent.addChildNode(child2);

// Child tool nodes automatically inherit context from parent
// Routing happens automatically through the hierarchy
```

## Core Concepts

### Tool Node Lifecycle States

Tool nodes (processes) transition through the following states:

- `STOPPED` - Initial state, tool node is not running
- `STARTING` - Tool node is initializing
- `RUNNING` - Tool node is active and processing requests
- `STOPPING` - Tool node is shutting down gracefully
- `ERROR` - Tool node encountered an error

```typescript
console.log(toolNode.state); // NodeState.RUNNING

await toolNode.stop();
console.log(toolNode.state); // NodeState.STOPPED
```

### The o:// Protocol

Addresses in Olane OS follow a hierarchical filesystem-like pattern:

```typescript
// Hierarchical addresses
const address1 = new oAddress('o://company/finance/accounting');
const address2 = new oAddress('o://users/alice/inbox');

// Address operations
console.log(address1.paths);        // "company/finance/accounting"
console.log(address1.root);         // "o://company"
console.log(address1.validate());   // true

// Static vs dynamic addresses
const staticAddr = address1.toStaticAddress();
console.log(staticAddr.toString()); // "o://accounting"
```

**📖 For complete details on address resolution, routing algorithms, and custom resolvers, see the [Router System documentation](./src/router/README.md).**

### Request/Response Pattern

All inter-process communication (IPC) follows a request/response pattern using JSON-RPC 2.0:

```typescript
// Making a request from one tool node to another
const response: oResponse = await toolNode.use(
  new oAddress('o://target/toolnode'),
  {
    method: 'processData',
    params: { key: 'value' },
    id: 'unique-request-id'
  }
);

// Handling errors
try {
  const response = await toolNode.use(targetAddress, requestData);
  console.log(response.result);
} catch (error) {
  if (error instanceof oError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```

**📖 Learn more about JSON-RPC messaging, request states, and connection lifecycle in the [Connection System documentation](./src/connection/README.md).**

### Metrics and Observability

Every tool node tracks metrics automatically:

```typescript
// Access tool node metrics
console.log(toolNode.metrics.successCount);
console.log(toolNode.metrics.errorCount);

// Built-in logging
toolNode.logger.debug('Debug message');
toolNode.logger.info('Info message');
toolNode.logger.warn('Warning message');
toolNode.logger.error('Error message');
```

## Architecture

### Abstract Base Class

`oCore` is an abstract base class that provides:

- **Lifecycle Management**: `start()`, `stop()`, `initialize()`, `teardown()`
- **Communication**: `use()`, `use()`, `connect()`
- **Routing**: `router`, `initializeRouter()`
- **Hierarchy**: `addChildNode()`, `removeChildNode()`, `hierarchyManager`
- **State Management**: `state`, `NodeState` enum
- **Observability**: `metrics`, `logger`, `requestManager`

### Key Components

#### 1. Router System (oAddress & oRouter)
Hierarchical addressing and intelligent routing for tool nodes

```typescript
const addr = new oAddress('o://domain/subdomain/resource');
addr.validate();           // Check if address is valid
addr.toStaticAddress();   // Convert to static address
addr.toCID();             // Convert to Content ID

// Router determines the next hop in the network
const { nextHopAddress, targetAddress } = await router.translate(
  address,
  node
);
```

**📚 [View detailed Router System documentation →](./src/router/README.md)**

#### 2. Connection System (oConnection & oConnectionManager)
Inter-Process Communication (IPC) layer for tool-node-to-tool-node messaging

```typescript
// Connections are cached and reused
const connection = await connectionManager.connect({
  nextHop: nextHopAddress,
  target: targetAddress
});

// Send data over the connection
const response = await connection.send({
  address: 'o://target/service',
  payload: { key: 'value' }
});
```

**📚 [View detailed Connection System documentation →](./src/connection/README.md)**

#### 3. oHierarchyManager
Manages parent-child relationships between tool nodes

```typescript
toolNode.hierarchyManager.addChild(childAddress);
toolNode.hierarchyManager.removeChild(childAddress);
console.log(toolNode.hierarchyManager.children);
```

## Advanced Usage

### Custom Transport & Connection Implementation

```typescript
import { oTransport, TransportType, oConnection, oConnectionConfig } from '@olane/o-core';

class MyCustomTransport extends oTransport {
  constructor() {
    super(TransportType.CUSTOM);
  }

  async send(data: any): Promise<any> {
    // Implement your transport logic (HTTP, WebSocket, etc.)
  }
}

// Custom connection implementation
class MyConnection extends oConnection {
  async transmit(request: oRequest): Promise<oResponse> {
    // Implement your connection logic
    const response = await fetch(this.nextHopAddress.toString(), {
      method: 'POST',
      body: request.toString()
    });
    return new oResponse(await response.json());
  }
}

class MyToolNode extends oCore {
  configureTransports(): any[] {
    return [new MyCustomTransport()];
  }
}
```

**📖 For connection pooling, retry logic, middleware, and transport-specific implementations, see the [Connection System documentation](./src/connection/README.md).**

### Custom Router Implementation

```typescript
import { oRouter, RouteResponse } from '@olane/o-core';

class MyRouter extends oRouter {
  async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
    // Implement custom routing logic
    return {
      nextHopAddress: calculatedNextHop,
      targetAddress: address
    };
  }

  isInternal(address: oAddress, node: oCore): boolean {
    // Determine if address is internal to this node
    return address.root === node.address.root;
  }

  async route(request: oRouterRequest, node: oCore): Promise<RouteResponse> {
    // Handle routing requests
  }
}
```

**📖 For advanced routing patterns, custom resolvers, and hierarchical routing strategies, see the [Router System documentation](./src/router/README.md).**

### Error Handling

```typescript
import { oError, oErrorCodes } from '@olane/o-core';

// In your execute method
async execute(request: oRequest): Promise<any> {
  if (!isValid(request.params)) {
    throw new oError(
      oErrorCodes.INVALID_PARAMS,
      'Invalid parameters provided'
    );
  }

  try {
    return await processRequest(request);
  } catch (error) {
    throw new oError(
      oErrorCodes.EXECUTION_ERROR,
      error.message
    );
  }
}
```

### Graceful Shutdown

```typescript
import { setupGracefulShutdown } from '@olane/o-core';

const toolNode = new MyToolNode('o://my/toolnode');
await toolNode.start();

// Setup graceful shutdown handlers
setupGracefulShutdown(async () => {
  console.log('Shutting down gracefully...');
  await toolNode.stop();
});

// Tool node will automatically stop on SIGINT/SIGTERM
```

## API Reference

### oCore Class

Abstract base class for building tool nodes.

#### Properties
- `address: oAddress` - The tool node's hierarchical address
- `state: NodeState` - Current lifecycle state
- `metrics: oMetrics` - Performance and usage metrics
- `hierarchyManager: oHierarchyManager` - Manages child nodes
- `router: oRouter` - Routing logic
- `connectionManager: oConnectionManager` - Connection pooling

#### Methods
- `async start(): Promise<void>` - Start the tool node
- `async stop(): Promise<void>` - Stop the tool node gracefully
- `async use(address, data?): Promise<oResponse>` - Communicate with another tool node (IPC)
- `async execute(request): Promise<any>` - Execute a request (abstract - you implement this)
- `addChildNode(node): void` - Add a child tool node
- `removeChildNode(node): void` - Remove a child tool node
- `async whoami(): Promise<any>` - Get tool node information

### oAddress Class

#### Methods
- `validate(): boolean` - Validate address format
- `toStaticAddress(): oAddress` - Convert to static address
- `toString(): string` - Get string representation
- `equals(other): boolean` - Compare addresses
- `async toCID(): Promise<CID>` - Convert to Content ID

### oError Class

#### Constructor
```typescript
new oError(code: oErrorCodes, message: string, data?: any)
```

#### Methods
- `toJSON(): object` - Serialize error
- `static fromJSON(json): oError` - Deserialize error

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

# Run in development mode
npm run dev

# Lint the code
npm run lint
```

## Use Cases

o-core enables you to:

1. **Build Specialized Tool Nodes** with unique o:// addresses and capabilities
2. **Create Hierarchical Tool Networks** that AI agents discover and use
3. **Route Requests Intelligently** through tool node hierarchies
4. **Manage Tool Node Lifecycles** with automatic cleanup and error handling
5. **Share Knowledge and Capabilities** across tool networks through addressable resources

## What o-core is NOT

- ❌ **Not a network framework** - It's the OS kernel for tool nodes
- ❌ **Not an orchestration tool** - It enables emergent coordination, not explicit workflows
- ❌ **Not a REST API** - It's a runtime for inter-process communication (IPC)
- ❌ **Not a complete solution** - It's an abstract foundation; use o-node for production
- ❌ **Not what you use directly** - Extend it or use higher-level packages (o-node, o-tool, o-lane)

## Related Packages

- `@olane/o-protocol` - Protocol definitions and types
- `@olane/o-node` - Complete node implementation (extends o-core)
- `@olane/o-tool` - Tool system for agent capabilities
- `@olane/o-storage` - Storage layer for agent state
- `@olane/o-network-cli` - CLI for managing agent networks

## Component Documentation

For in-depth documentation on specific o-core components, see:

- **[Router System](./src/router/README.md)** - Deep dive into the `o://` protocol, address resolution, routing logic, and custom resolvers
- **[Connection System](./src/connection/README.md)** - Complete guide to IPC, JSON-RPC messaging, connection pooling, and transport implementations

## Documentation

- [Full Documentation](https://olane.com/docs)
- [Quickstart Guide](https://olane.com/docs/quickstart)
- [Architecture Overview](https://olane.com/docs/architecture/overview)
- [API Reference](https://olane.com/docs/api)

## Support

- [GitHub Issues](https://github.com/olane-labs/olane/issues)
- [Community Forum](https://olane.com/community)
- [Email Support](mailto:support@olane.com)

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

ISC © Olane Inc.

---

**Part of the Olane OS ecosystem** - An agentic operating system where AI agents are the users and you build tool nodes as applications.
