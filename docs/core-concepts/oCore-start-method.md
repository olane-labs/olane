---
title: "oCore.start() Method - Node Startup and Initialization"
description: "Complete API documentation for the oCore.start() method that initializes and starts nodes in the Olane network infrastructure"
---

# oCore.start() Method

The `start()` method is responsible for initializing and starting nodes within the Olane superintelligent network infrastructure. This method handles the complete startup lifecycle including state management, initialization, registration, network advertising, and error handling.

## Implementation Hierarchy

- **oCore.start()** - Base implementation with core startup logic
- **oNode.start()** - Extended implementation that adds network advertising after successful startup

## Method Signature

```typescript
public async start(): Promise<void>
```

## Overview

The `start()` method performs a controlled startup sequence for nodes in the Olane network. It manages state transitions from `STOPPED` to `RUNNING` while handling initialization and registration processes. If any errors occur during startup, the node transitions to an `ERROR` state and performs cleanup.

## State Management

The method implements strict state management using the `NodeState` enum:

- **STOPPED** → **STARTING** → **RUNNING** (success path)
- **STOPPED** → **STARTING** → **ERROR** (failure path)

### NodeState Values

| State | Description |
|-------|-------------|
| `STOPPED` | Node is completely stopped and ready to start |
| `STARTING` | Node is in the process of starting up |
| `RUNNING` | Node is fully operational and ready to handle requests |
| `ERROR` | Node encountered an error and is in a failed state |

## Startup Process

The startup sequence follows these steps:

### oCore.start() - Base Implementation

#### 1. State Validation
```typescript
if (this.state !== NodeState.STOPPED) {
  this.logger.warn('Node is not stopped, skipping start');
  return;
}
```
- Validates that the node is in `STOPPED` state before starting
- Prevents multiple concurrent startup attempts
- Logs a warning and returns early if node is not stopped

#### 2. State Transition to STARTING
```typescript
this.state = NodeState.STARTING;
```
- Updates the node state to indicate startup is in progress
- Other processes can check this state to understand node status

#### 3. Initialization Phase
```typescript
await this.initialize();
```
- Calls the abstract `initialize()` method
- For oNode: Configures libp2p, creates P2P node, initializes connection manager
- Sets up internal components and dependencies

#### 4. Registration Phase
```typescript
await this.register().catch((error) => {
  this.logger.error('Failed to register node', error);
});
```
- Registers the node with the network hierarchy
- For oNode: Commits node details to the leader's registry
- Uses `.catch()` to handle registration failures gracefully
- Logs registration errors but doesn't stop the startup process
- Registration failures are non-fatal to allow local operation

#### 5. Success State Transition
```typescript
this.state = NodeState.RUNNING;
```
- Updates state to `RUNNING` when startup completes successfully
- Node is now ready to handle network requests and operations

### oNode.start() - Extended Implementation

#### 6. Network Advertising (oNode only)
```typescript
async start(): Promise<void> {
  await super.start();
  await NetworkUtils.advertiseToNetwork(
    this.address,
    this.staticAddress,
    this.p2pNode,
  );
}
```
- Calls the parent `oCore.start()` method first
- Advertises both absolute and static addresses to the DHT network
- Enables peer discovery through content routing
- Uses timeout protection to prevent hanging on isolated nodes
- Advertising failures are logged but don't cause startup failure

## Error Handling

The method implements comprehensive error handling with automatic cleanup:

```typescript
catch (error) {
  this.logger.error('Failed to start node', error);
  this.errors.push(error as Error);
  this.state = NodeState.ERROR;
  await this.teardown();
}
```

### Error Response Process

1. **Error Logging**: All startup errors are logged with context
2. **Error Storage**: Errors are stored in the `errors` array for debugging
3. **State Update**: Node state is set to `ERROR` to indicate failure
4. **Cleanup**: `teardown()` method is called to clean up partial initialization

## Usage Examples

### Basic Node Startup

```typescript
import { oCore, NodeState } from '@olane/o-core';

// Create a node instance
const node = new MyNodeImplementation(config);

// Check initial state
console.log(node.state); // NodeState.STOPPED

// Start the node
try {
  await node.start();
  console.log(node.state); // NodeState.RUNNING
  console.log('Node started successfully');
} catch (error) {
  console.error('Node startup failed:', error);
  console.log(node.state); // NodeState.ERROR
}
```

### Startup with State Monitoring

```typescript
import { oCore, NodeState } from '@olane/o-core';

async function startNodeWithMonitoring(node: oCore): Promise<boolean> {
  console.log(`Initial state: ${node.state}`);
  
  if (node.state !== NodeState.STOPPED) {
    console.log('Node is not in STOPPED state, cannot start');
    return false;
  }
  
  try {
    await node.start();
    
    if (node.state === NodeState.RUNNING) {
      console.log('Node started successfully');
      return true;
    } else {
      console.log(`Unexpected state after start: ${node.state}`);
      return false;
    }
  } catch (error) {
    console.error('Startup failed:', error);
    console.log(`Error state: ${node.state}`);
    console.log('Errors:', node.errors);
    return false;
  }
}
```

### Network Node Startup (oNode)

```typescript
import { oNode } from '@olane/o-node';
import { oNodeAddress } from '@olane/o-node';
import { NodeType } from '@olane/o-core';

// Create a network node with leader configuration
const networkNode = new oNode({
  address: new oNodeAddress('o://my-network/worker-1'),
  leader: new oNodeAddress('o://my-network/leader'),
  parent: new oNodeAddress('o://my-network/parent'),
  type: NodeType.WORKER,
  name: 'worker-node-1',
  seed: 'deterministic-seed-for-peer-id' // Optional: for consistent peer ID
});

// Start the network node
await networkNode.start();

// After startup, the node has:
// 1. Initialized libp2p P2P networking
// 2. Registered with the leader node
// 3. Advertised its addresses to the DHT network
console.log(`Node ${networkNode.address.toString()} is running`);
console.log(`Peer ID: ${networkNode.peerId.toString()}`);
console.log(`Transports: ${networkNode.transports.map(t => t.toString())}`);
```

## Error Scenarios

### Common Startup Failures

1. **Invalid Configuration**
   ```typescript
   // Node with invalid address
   const invalidNode = new oNode({
     address: new oNodeAddress('invalid://address')
   });
   
   await invalidNode.start(); // Will fail during address validation in initialize()
   ```

2. **Network Registration Failure**
   ```typescript
   // Node with unreachable leader
   const isolatedNode = new oNode({
     address: new oNodeAddress('o://isolated/node'),
     leader: new oNodeAddress('o://unreachable/leader')
   });
   
   await isolatedNode.start(); // Registration will fail but node continues startup
   ```

3. **P2P Network Issues**
   ```typescript
   // Node with conflicting network configuration
   const conflictedNode = new oNode({
     address: new oNodeAddress('o://network/worker'),
     network: {
       listeners: ['/ip4/127.0.0.1/tcp/8080'], // Port already in use
     }
   });
   
   await conflictedNode.start(); // Will fail during libp2p initialization
   ```

4. **DHT Advertising Timeout**
   ```typescript
   // Node in isolated network environment
   const isolatedNode = new oNode({
     address: new oNodeAddress('o://isolated/node')
   });
   
   await isolatedNode.start(); 
   // Node starts successfully but DHT advertising may timeout
   // This is logged but doesn't cause startup failure
   ```

## Integration with Node Lifecycle

The `start()` method is part of the complete node lifecycle:

```typescript
// Complete oNode lifecycle
const node = new oNode(config);

// Startup sequence
await node.start();        // STOPPED → STARTING → RUNNING
// 1. Initialize libp2p P2P node
// 2. Register with leader node  
// 3. Advertise to DHT network

// Operation
await node.use(address);   // Handle network requests via P2P

// Shutdown
await node.stop();         // RUNNING → STOPPING → STOPPED
// Stops P2P node and unregisters from network
```

## oNode Initialization Details

### Libp2p Configuration

During the `initialize()` phase, oNode performs extensive P2P network configuration:

```typescript
async initialize(): Promise<void> {
  // 1. Validate node state and address
  if (this.p2pNode && this.state !== NodeState.STOPPED) {
    throw new Error('Node is not in a valid state to be initialized');
  }
  
  // 2. Configure libp2p with transports, connection management, and security
  const params = await this.configure();
  this.p2pNode = await createNode(params);
  
  // 3. Initialize router and hierarchy management
  this.initializeRouter();
  
  // 4. Set up transports and peer ID
  this.address.setTransports(this.transports);
  this.peerId = this.p2pNode.peerId;
  
  // 5. Initialize connection manager for P2P communications
  this.connectionManager = new oNodeConnectionManager({
    p2pNode: this.p2pNode,
  });
  
  // 6. Add address resolver for network routing
  this.router.addResolver(new oNodeResolver(this.address));
}
```

### Network Registration Process

The `register()` method commits node details to the leader's registry:

```typescript
async register(): Promise<void> {
  // Skip registration for leader nodes
  if (this.type === NodeType.LEADER) {
    return;
  }
  
  // Register with leader using restricted registry address
  const address = new oNodeAddress(RestrictedAddresses.REGISTRY);
  
  const params = {
    method: 'commit',
    params: {
      peerId: this.peerId.toString(),
      address: this.address.toString(),
      protocols: this.p2pNode.getProtocols(),
      transports: this.transports,
      staticAddress: this.staticAddress.toString(),
    },
  };
  
  await this.use(address, params);
}
```

### DHT Network Advertising

After successful startup, oNode advertises its presence to the DHT:

```typescript
// Advertises both absolute and static addresses
await NetworkUtils.advertiseToNetwork(
  this.address,        // Current absolute address
  this.staticAddress,  // Static configuration address  
  this.p2pNode,       // libp2p node instance
);
```

This enables peer discovery through content routing, allowing other nodes to find and connect to this node.

## Best Practices

### 1. Always Check State Before Starting
```typescript
if (node.state === NodeState.STOPPED) {
  await node.start();
} else {
  console.log(`Cannot start node in state: ${node.state}`);
}
```

### 2. Handle Startup Errors Gracefully
```typescript
try {
  await node.start();
} catch (error) {
  // Log the error
  console.error('Node startup failed:', error);
  
  // Check for specific error types
  if (node.errors.length > 0) {
    node.errors.forEach((err, index) => {
      console.error(`Error ${index + 1}:`, err.message);
    });
  }
  
  // Attempt cleanup if needed
  if (node.state === NodeState.ERROR) {
    await node.teardown();
  }
}
```

### 3. Wait for Full Startup and Network Readiness
```typescript
async function waitForNodeReady(node: oNode, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  await node.start();
  
  // Wait for node to be fully running
  while (node.state === NodeState.STARTING && Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (node.state !== NodeState.RUNNING) {
    return false;
  }
  
  // For oNode, also verify P2P node is ready
  if (node.p2pNode && node.p2pNode.status !== 'started') {
    return false;
  }
  
  return true;
}
```

### 4. Use Seeds for Deterministic Peer IDs
```typescript
// For production deployments, use seeds to ensure consistent peer IDs
const node = new oNode({
  address: new oNodeAddress('o://network/worker'),
  seed: process.env.NODE_SEED || 'fallback-seed',
  // ... other config
});

await node.start();
console.log(`Consistent Peer ID: ${node.peerId.toString()}`);
```

## Related Methods

- [`stop()`](./oCore-stop-method.md) - Gracefully stops the node
- [`initialize()`](./oCore-initialize-method.md) - Abstract method for node-specific initialization
- [`register()`](./oCore-register-method.md) - Abstract method for network registration
- [`teardown()`](./oCore-teardown-method.md) - Cleanup method called on errors

## See Also

- [Node State Management](../concepts/node-states.md)
- [Network Registration](../concepts/network-registration.md)
- [Error Handling Patterns](../patterns/error-handling.md)
- [Node Lifecycle](../concepts/node-lifecycle.md)
