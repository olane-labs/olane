---
title: "oCore Class - Core Node Implementation"
description: "Complete API reference for the oCore abstract class, the foundation of all Olane network nodes"
---

# oCore Class

The `oCore` class is the abstract base class that all Olane network nodes extend. It provides the core functionality for peer-to-peer communication, state management, and network participation.

## Class Definition

```typescript
abstract class oCore extends oObject {
  public address: oAddress;
  public state: NodeState;
  public errors: Error[];
  public connectionManager: oConnectionManager;
  public hierarchyManager: oHierarchyManager;
  public metrics: oMetrics;
  public requestManager: oRequestManager;
  public router: oRouter;
}
```

## Constructor

```typescript
constructor(readonly config: oCoreConfig)
```

Creates a new oCore instance with the specified configuration.

**Parameters:**

- `config: oCoreConfig` - Node configuration object

**oCoreConfig Properties:**

```typescript
interface oCoreConfig {
  address: oAddress;           // Node's network address
  type?: NodeType;            // Node type (LEADER, WORKER, etc.)
  name?: string;              // Human-readable node name
  description?: string;       // Node description
  parent?: oAddress;          // Parent node address
  leader?: oAddress;          // Network leader address
  methods?: { [key: string]: oMethod }; // Available methods
  dependencies?: any[];       // Node dependencies
}
```

**Example:**

```typescript
const node = new MyNode({
  address: new oAddress('o://my-network/worker-1'),
  type: NodeType.WORKER,
  name: 'worker-node-1',
  description: 'Processing worker for data analysis',
  parent: new oAddress('o://my-network'),
  methods: {
    process: {
      name: 'process',
      description: 'Process data',
      parameters: {
        data: { type: 'object', required: true }
      }
    }
  }
});
```

## Properties

### `address: oAddress`

The node's current address in the network. This may differ from the static address if the node has been moved or reassigned.

```typescript
console.log('Node address:', node.address.toString());
// Output: o://my-network/worker-1
```

### `state: NodeState`

Current state of the node. Possible values:

- `NodeState.STOPPED` - Node is not running
- `NodeState.STARTING` - Node is initializing
- `NodeState.RUNNING` - Node is active and processing requests
- `NodeState.STOPPING` - Node is shutting down
- `NodeState.ERROR` - Node encountered an error

```typescript
if (node.state === NodeState.RUNNING) {
  console.log('Node is ready to process requests');
}
```

### `errors: Error[]`

Array of errors encountered by the node. Useful for debugging and monitoring.

```typescript
if (node.errors.length > 0) {
  console.log('Node errors:', node.errors.map(e => e.message));
}
```

### `connectionManager: oConnectionManager`

Manages connections to other nodes in the network. Handles connection pooling, caching, and transport abstraction.

### `hierarchyManager: oHierarchyManager`

Manages the node's position in the network hierarchy, including parent-child relationships and leader connections.

### `metrics: oMetrics`

Collects and provides access to node performance metrics.

```typescript
console.log('Request count:', node.metrics.requestCount);
console.log('Error rate:', node.metrics.errorRate);
```

### `requestManager: oRequestManager`

Manages incoming and outgoing requests, including request tracking and timeout handling.

### `router: oRouter`

Handles address resolution and routing decisions for network communication.

## Core Methods

### `start(): Promise<void>`

Starts the node and transitions it through the startup process.

**Process Flow:**
1. Validates node is in STOPPED state
2. Sets state to STARTING
3. Calls `initialize()` to set up components
4. Attempts network registration (errors are logged but don't fail startup)
5. Sets state to RUNNING on success

**Throws:** `Error` if node is not in STOPPED state or initialization fails

**Example:**

```typescript
const node = new MyNode(config);
try {
  await node.start();
  console.log('Node started successfully');
} catch (error) {
  console.error('Failed to start node:', error);
  // Check node.errors for detailed error information
}
```

**Error Handling:**

```typescript
try {
  await node.start();
} catch (error) {
  console.error('Startup failed:', error.message);
  
  // Check for specific error conditions
  if (node.state === NodeState.ERROR) {
    console.log('Node errors:', node.errors);
    // Perform error recovery or cleanup
  }
}
```

### `stop(): Promise<void>`

Stops the node gracefully and performs cleanup operations.

**Process Flow:**
1. Sets state to STOPPING
2. Calls `teardown()` for resource cleanup
3. Sets state to STOPPED on success

**Example:**

```typescript
// Graceful shutdown
try {
  await node.stop();
  console.log('Node stopped successfully');
} catch (error) {
  console.error('Error during shutdown:', error);
}
```

**With Signal Handling:**

```typescript
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  try {
    await node.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
```

### `use(address: oAddress, data?): Promise<oResponse>`

Sends a request to another node in the network and returns the response.

**Parameters:**

- `address: oAddress` - Target node address (must be valid o:// address)
- `data?: object` - Optional request data
  - `method?: string` - Method name to invoke on target node
  - `params?: { [key: string]: any }` - Parameters to pass to the method
  - `id?: string` - Unique request identifier for tracking

**Returns:** `Promise<oResponse>` - Response from the target node

**Throws:** 
- `Error` - For invalid addresses or connection failures
- `oError` - For errors returned by the target node

**Basic Usage:**

```typescript
// Simple request with no parameters
const response = await node.use(
  new oAddress('o://status-service/health')
);
console.log('Service status:', response.result);
```

**Method Invocation:**

```typescript
// Call a specific method with parameters
const response = await node.use(
  new oAddress('o://calculator/math'),
  {
    method: 'add',
    params: { a: 5, b: 3 },
    id: 'calc-001'
  }
);
console.log('Result:', response.result); // { result: 8 }
```

**Error Handling:**

```typescript
try {
  const response = await node.use(
    new oAddress('o://unreliable-service/process'),
    { method: 'process', params: { data: 'test' } }
  );
  console.log('Success:', response.result);
} catch (error) {
  if (error instanceof oError) {
    console.error(`Service error ${error.code}: ${error.message}`);
    console.error('Error context:', error.context);
  } else {
    console.error('Connection or address error:', error.message);
  }
}
```

**Advanced Usage with Request Tracking:**

```typescript
const requestId = `req-${Date.now()}`;
const response = await node.use(
  new oAddress('o://data-processor/analyze'),
  {
    method: 'analyzeData',
    params: {
      dataset: 'user-behavior-2024',
      algorithm: 'clustering'
    },
    id: requestId
  }
);

// Track the request
console.log(`Request ${requestId} completed:`, response.result);
```

## Hierarchy Management

### `addChildNode(node: oCore): void`

Adds a child node to this node's hierarchy.

```typescript
const parentNode = new MyNode(parentConfig);
const childNode = new MyNode(childConfig);

parentNode.addChildNode(childNode);
console.log('Child node added:', childNode.address.toString());
```

### `removeChildNode(node: oCore): void`

Removes a child node from this node's hierarchy.

```typescript
parentNode.removeChildNode(childNode);
console.log('Child node removed');
```

## Getters

### `dependencies: oDependency[]`

Returns the node's dependencies as oDependency objects.

```typescript
const deps = node.dependencies;
deps.forEach(dep => {
  console.log('Dependency:', dep.name, 'Version:', dep.version);
});
```

### `methods: { [key: string]: oMethod }`

Returns the methods available on this node.

```typescript
const methods = node.methods;
Object.keys(methods).forEach(methodName => {
  console.log('Available method:', methodName);
  console.log('Description:', methods[methodName].description);
});
```

### `description: string`

Returns the node's description.

```typescript
console.log('Node description:', node.description);
```

### `staticAddress: oAddress`

Returns the node's configured static address (may differ from current address).

```typescript
console.log('Static address:', node.staticAddress.toString());
console.log('Current address:', node.address.toString());
```

### `type: NodeType`

Returns the node's type.

```typescript
console.log('Node type:', node.type);
// Possible values: LEADER, WORKER, BRIDGE, UNKNOWN
```

### `transports: oTransport[]`

Returns the available transports for this node.

```typescript
const transports = node.transports;
transports.forEach(transport => {
  console.log('Transport type:', transport.type);
});
```

### `parent: oAddress | null`

Returns the parent node address, if any.

```typescript
if (node.parent) {
  console.log('Parent node:', node.parent.toString());
} else {
  console.log('This is a root node');
}
```

## Utility Methods

### `whoami(): Promise<any>`

Returns information about the current node.

```typescript
const info = await node.whoami();
console.log('Node info:', {
  address: info.address,
  type: info.type,
  description: info.description,
  methods: Object.keys(info.methods)
});
```

**Example Response:**

```json
{
  "address": "o://my-network/worker-1",
  "type": "WORKER",
  "description": "Data processing worker",
  "methods": {
    "process": {
      "name": "process",
      "description": "Process data",
      "parameters": {
        "data": { "type": "object", "required": true }
      }
    }
  }
}
```

## Abstract Methods (Must Implement)

These methods must be implemented by concrete subclasses:

### `configureTransports(): any[]`

Configure and return the network transports for this node.

```typescript
configureTransports() {
  return [
    new WebSocketTransport({ port: 8080 }),
    new LibP2PTransport({ 
      peerId: this.peerId,
      addresses: ['/ip4/0.0.0.0/tcp/9000']
    })
  ];
}
```

### `connect(nextHopAddress: oAddress, targetAddress: oAddress): Promise<oConnection>`

Establish a connection to another node.

```typescript
async connect(nextHopAddress: oAddress, targetAddress: oAddress): Promise<oConnection> {
  return await this.connectionManager.connect({
    nextHopAddress,
    targetAddress,
    timeout: 5000
  });
}
```

### `initializeRouter(): void`

Initialize the routing system for this node.

```typescript
initializeRouter() {
  this.router = new MyRouter({
    node: this,
    resolvers: [
    new MethodResolver(),
    new StorageResolver(),
    new SearchResolver()
    ]
  });
}
```

### `register(): Promise<void>`

Register the node with the network.

```typescript
async register() {
  if (this.parent) {
    await this.use(this.parent, {
      method: 'registerChild',
      params: { address: this.address.toString() }
    });
  }
}
```

### `unregister(): Promise<void>`

Unregister the node from the network.

```typescript
async unregister() {
  if (this.parent) {
    await this.use(this.parent, {
      method: 'unregisterChild',
      params: { address: this.address.toString() }
    });
  }
}
```

## Lifecycle Hooks

### `initialize(): Promise<void>`

Override this method to perform custom initialization logic.

```typescript
async initialize() {
  await super.initialize();
  
  // Custom initialization
  this.database = new Database(this.config.dbPath);
  await this.database.connect();
  
  this.cache = new Cache({ maxSize: 1000 });
  
  console.log('Node initialized with custom components');
}
```

### `teardown(): Promise<void>`

Override this method to perform custom cleanup logic.

```typescript
async teardown() {
  // Custom cleanup
  if (this.database) {
    await this.database.disconnect();
  }
  
  if (this.cache) {
    this.cache.clear();
  }
  
  await super.teardown();
  console.log('Node teardown complete');
}
```

## Complete Implementation Example

```typescript
import { 
  oCore, 
  oAddress, 
  NodeType, 
  oConnection, 
  oTransport,
  WebSocketTransport,
  oRouter
} from '@olane/o-core';

class DataProcessorNode extends oCore {
  private processor: DataProcessor;
  
  constructor(address: string, processorConfig: any) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'data-processor',
      description: 'High-performance data processing node',
      methods: {
        process: {
          name: 'process',
          description: 'Process data with specified algorithm',
          parameters: {
            data: { type: 'object', required: true },
            algorithm: { type: 'string', required: false, default: 'default' }
          }
        },
        status: {
          name: 'status',
          description: 'Get processing status',
          parameters: {}
        }
      }
    });
    
    this.processor = new DataProcessor(processorConfig);
  }
  
  // Implement abstract methods
  configureTransports() {
    return [
      new WebSocketTransport({ 
        port: this.config.port || 8080,
        host: this.config.host || '0.0.0.0'
      })
    ];
  }
  
  async connect(nextHopAddress: oAddress, targetAddress: oAddress): Promise<oConnection> {
    return await this.connectionManager.connect({
      nextHopAddress,
      targetAddress,
      timeout: 10000,
      retries: 3
    });
  }
  
  initializeRouter() {
    this.router = new MyRouter({
      node: this,
      resolvers: [
        new MethodResolver(),
        new ProcessingResolver()
      ]
    });
  }
  
  async register() {
    if (this.parent) {
      try {
        await this.use(this.parent, {
          method: 'registerWorker',
          params: { 
            address: this.address.toString(),
            capabilities: ['data-processing', 'analytics'],
            maxLoad: 100
          }
        });
        this.logger.info('Successfully registered with parent');
      } catch (error) {
        this.logger.error('Failed to register with parent:', error);
        throw error;
      }
    }
  }
  
  async unregister() {
    if (this.parent) {
      await this.use(this.parent, {
        method: 'unregisterWorker',
        params: { address: this.address.toString() }
      });
    }
  }
  
  // Custom initialization
  async initialize() {
    await super.initialize();
    await this.processor.initialize();
    this.logger.info('Data processor initialized');
  }
  
  // Custom cleanup
  async teardown() {
    await this.processor.shutdown();
    await super.teardown();
    this.logger.info('Data processor shut down');
  }
  
  // Handle incoming requests
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'process':
        return await this.processor.process(params.data, params.algorithm);
      
      case 'status':
        return {
          status: 'running',
          queueLength: this.processor.queueLength,
          uptime: process.uptime()
        };
      
      default:
        throw new oError('METHOD_NOT_FOUND', `Method ${method} not supported`);
    }
  }
}

// Usage
const node = new DataProcessorNode('o://my-network/processor-1', {
  maxConcurrency: 10,
  timeout: 30000
});

await node.start();
console.log('Data processor node is running');
```
