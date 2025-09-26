---
title: "oNode Class - P2P Network Node Implementation"
description: "Complete API reference for the oNode class, enabling human and AI agents to join and participate in Olane networks"
---

# oNode Class

The `oNode` class is a concrete implementation of the `oCore` abstract class that enables humans and AI agents to join and participate in Olane peer-to-peer networks. It serves as the "digital front door" for both AI and human agents, providing a standardized way to communicate, collaborate, and share capabilities across the network.

## Overview

oNode transforms any entity (human or AI) into a network participant by:

1. **Network Participation**: Allows agents to utilize the Olane network infrastructure
2. **Capability Advertisement**: Advertises your capabilities and services to other network participants
3. **Cross-Agent Collaboration**: Enables seamless collaboration between different types of agents
4. **Device Continuity**: Supports following agents across multiple devices and interfaces

## Class Definition

```typescript
class oNode extends oCore {
  public peerId: PeerId;
  public p2pNode: Libp2p;
  public address: oNodeAddress;
  public config: oNodeConfig;
  public connectionManager: oNodeConnectionManager;
  public hierarchyManager: oNodeHierarchyManager;
}
```

## Constructor

```typescript
constructor(config: oNodeConfig)
```

Creates a new oNode instance with the specified configuration.

**Parameters:**

- `config: oNodeConfig` - Node configuration object extending oCoreConfig

**oNodeConfig Properties:**

```typescript
interface oNodeConfig extends oCoreConfig {
  leader: oNodeAddress | null;     // Network leader node address
  parent: oNodeAddress | null;     // Parent node address for hierarchical networks
  seed?: string;                   // Seed for generating consistent peer ID
  network?: Libp2pConfig;          // Custom libp2p network configuration
}
```

**Basic Example:**

```typescript
import { oNode, oNodeAddress } from '@olane/o-node';

const node = new oNode({
  address: new oNodeAddress('o://my-network/agent-1'),
  leader: new oNodeAddress('o://my-network'),
  parent: null,
  name: 'AI Assistant',
  description: 'General purpose AI agent',
  methods: {
    chat: {
      name: 'chat',
      description: 'Chat with the AI assistant',
      parameters: {
        message: { type: 'string', required: true }
      }
    }
  }
});
```

**Enterprise Network Example:**

```typescript
const enterpriseAgent = new oNode({
  address: new oNodeAddress('o://company-network/sales-ai'),
  leader: new oNodeAddress('o://company-network'),
  parent: new oNodeAddress('o://company-network/sales-dept'),
  seed: 'stable-seed-for-consistent-identity',
  name: 'Sales AI Assistant',
  description: 'AI assistant for sales team with CRM access',
  methods: {
    generateReport: {
      name: 'generateReport',
      description: 'Generate sales reports',
      parameters: {
        period: { type: 'string', required: true },
        format: { type: 'string', required: false, default: 'pdf' }
      }
    },
    scheduleFollowup: {
      name: 'scheduleFollowup',
      description: 'Schedule customer follow-up',
      parameters: {
        customerId: { type: 'string', required: true },
        date: { type: 'string', required: true }
      }
    }
  }
});
```

## Properties

### `peerId: PeerId`

The unique peer identifier for this node in the libp2p network. Generated automatically during initialization.

```typescript
console.log('Node peer ID:', node.peerId.toString());
// Output: 12D3KooWGBfKXTrJt8YJHNpGhQqpTz8qJmCL6aB9sKvFn2xEt4jH
```

### `p2pNode: Libp2p`

The underlying libp2p node instance that handles peer-to-peer networking, discovery, and transport protocols.

```typescript
// Access libp2p protocols
console.log('Supported protocols:', node.p2pNode.getProtocols());

// Get current connections
const connections = node.p2pNode.getConnections();
console.log(`Connected to ${connections.length} peers`);
```

### `address: oNodeAddress`

The node's current network address, which may be encapsulated within parent addresses in hierarchical networks.

```typescript
console.log('Current address:', node.address.toString());
// Output: o://company-network/sales-dept/sales-ai

console.log('Static address:', node.staticAddress.toString());
// Output: o://sales-ai
```

### `config: oNodeConfig`

The complete configuration object used to initialize the node.

```typescript
console.log('Leader address:', node.config.leader?.toString());
console.log('Parent address:', node.config.parent?.toString());
```

### `connectionManager: oNodeConnectionManager`

Manages connections to other nodes in the network, handling connection pooling, caching, and libp2p transport abstraction.

```typescript
// Connect to another node
const connection = await node.connectionManager.connect({
  address: new oNodeAddress('o://target-node'),
  nextHopAddress: new oNodeAddress('o://next-hop'),
  callerAddress: node.address
});
```

### `hierarchyManager: oNodeHierarchyManager`

Manages the node's position in the network hierarchy, including relationships with leaders, parents, and children.

```typescript
// Access hierarchy information
console.log('Leaders:', node.hierarchyManager.leaders);
console.log('Parents:', node.hierarchyManager.parents);
console.log('Children:', node.hierarchyManager.children);
```

## Core Methods

### `start(): Promise<void>`

Starts the node and makes it available on the network.

**Process Flow:**
1. Initializes the libp2p node with configured transports
2. Sets up connection and hierarchy managers
3. Registers with the network leader (if configured)
4. Advertises node capabilities to the network
5. Transitions state to RUNNING

```typescript
const node = new oNode({
  address: new oNodeAddress('o://my-agent'),
  leader: new oNodeAddress('o://network-leader'),
  parent: null
});

try {
  await node.start();
  console.log('Node started successfully');
  console.log('Available at:', node.transports.map(t => t.toString()));
} catch (error) {
  console.error('Failed to start node:', error);
}
```

**With Custom Network Configuration:**

```typescript
const node = new oNode({
  address: new oNodeAddress('o://custom-agent'),
  leader: new oNodeAddress('o://leader'),
  parent: null,
  network: {
    listeners: ['/ip4/0.0.0.0/tcp/9000'],
    connectionManager: {
      minConnections: 5,
      maxConnections: 50,
      dialTimeout: 10000
    }
  }
});

await node.start();
```

### `stop(): Promise<void>`

Gracefully stops the node and performs cleanup.

**Process Flow:**
1. Unregisters from the network leader
2. Closes all active connections
3. Stops the libp2p node
4. Performs cleanup operations
5. Transitions state to STOPPED

```typescript
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down node...');
  try {
    await node.stop();
    console.log('Node stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
```

### `use(address: oNodeAddress, data?): Promise<oResponse>`

Sends a request to another node in the network and returns the response.

**Parameters:**

- `address: oNodeAddress` - Target node address
- `data?: object` - Request data
  - `method?: string` - Method to invoke on target node
  - `params?: object` - Method parameters
  - `id?: string` - Request identifier for tracking

**Basic Communication:**

```typescript
// Simple request
const response = await node.use(
  new oNodeAddress('o://helper-agent/status')
);
console.log('Status:', response.result);
```

**Method Invocation:**

```typescript
// Call a specific method with parameters
const response = await node.use(
  new oNodeAddress('o://calculator-agent/math'),
  {
    method: 'calculate',
    params: {
      expression: '2 + 2 * 3',
      precision: 2
    },
    id: 'calc-001'
  }
);
console.log('Result:', response.result); // { result: 8 }
```

**Cross-Network Communication:**

```typescript
// Communicate with agent in different network
const response = await node.use(
  new oNodeAddress('o://external-network/data-processor/analyze'),
  {
    method: 'processDataset',
    params: {
      dataset: 'customer-behavior-2024',
      analysis: ['clustering', 'trends'],
      format: 'json'
    }
  }
);
console.log('Analysis results:', response.result);
```

**Error Handling:**

```typescript
try {
  const response = await node.use(
    new oNodeAddress('o://unreliable-agent/process'),
    { method: 'complexTask', params: { data: largeDataset } }
  );
  console.log('Success:', response.result);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.error('Request timed out');
  } else if (error.code === 'NODE_UNAVAILABLE') {
    console.error('Target node is not available');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

### `connect(nextHopAddress: oNodeAddress, targetAddress: oNodeAddress): Promise<oNodeConnection>`

Establishes a direct connection to another node for persistent communication.

**Parameters:**

- `nextHopAddress: oNodeAddress` - Next hop in the routing path
- `targetAddress: oNodeAddress` - Final destination address

**Returns:** `Promise<oNodeConnection>` - Connection object for ongoing communication

```typescript
// Establish persistent connection
const connection = await node.connect(
  new oNodeAddress('o://gateway-node'),
  new oNodeAddress('o://target-agent')
);

// Use connection for multiple requests
const result1 = await connection.send({ method: 'task1' });
const result2 = await connection.send({ method: 'task2' });

// Close connection when done
await connection.close();
```

## Network Registration

### `register(): Promise<void>`

Registers the node with the network leader, making it discoverable by other nodes.

**Automatic Registration:**
Registration happens automatically during `start()`, but you can manually register if needed:

```typescript
// Manual registration (usually not needed)
try {
  await node.register();
  console.log('Node registered with network');
} catch (error) {
  console.error('Registration failed:', error);
}
```

**Registration Data:**
The node sends the following information during registration:

```typescript
{
  peerId: "12D3KooWGBfKXTrJt8YJHNpGhQqpTz8qJmCL6aB9sKvFn2xEt4jH",
  address: "o://my-network/my-agent",
  protocols: ["/o/1.0.0", "/ipfs/id/1.0.0"],
  transports: [
    "/ip4/127.0.0.1/tcp/9000/p2p/12D3KooW...",
    "/memory/unique-id"
  ],
  staticAddress: "o://my-agent"
}
```

### `unregister(): Promise<void>`

Unregisters the node from the network, making it no longer discoverable.

```typescript
// Manual unregistration (happens automatically during stop())
await node.unregister();
console.log('Node unregistered from network');
```

## Network Configuration

### `networkConfig: Libp2pConfig`

Returns the effective libp2p configuration for the node.

```typescript
const config = node.networkConfig;
console.log('Listeners:', config.listeners);
console.log('Transports:', config.transports);
console.log('Connection limits:', config.connectionManager);
```

### `configureTransports(): any[]`

Configures the network transports available to the node. Override this method to customize transport behavior.

```typescript
class CustomNode extends oNode {
  configureTransports() {
    return [
      // Default transports
      ...super.configureTransports(),
      
      // Custom transport
      new CustomTransport({
        protocol: 'custom',
        options: { encryption: true }
      })
    ];
  }
}
```

## Hierarchy Management

### `parentPeerId: string | null`

Returns the peer ID of the parent node, if any.

```typescript
if (node.parentPeerId) {
  console.log('Parent peer ID:', node.parentPeerId);
} else {
  console.log('This is a root node');
}
```

### `parentTransports: oNodeTransport[]`

Returns the transport addresses of parent nodes.

```typescript
const parentTransports = node.parentTransports;
parentTransports.forEach(transport => {
  console.log('Parent transport:', transport.toString());
});
```

### `transports: oNodeTransport[]`

Returns all available transport addresses for this node.

```typescript
const transports = node.transports;
console.log('Node is available at:');
transports.forEach(transport => {
  console.log(`  ${transport.toString()}`);
});
```

## Address Management

### `staticAddress: oNodeAddress`

Returns the node's configured static address (before any hierarchical encapsulation).

```typescript
console.log('Static address:', node.staticAddress.toString());
console.log('Current address:', node.address.toString());

// Example output:
// Static address: o://my-agent
// Current address: o://company-network/department/my-agent
```

## Lifecycle Hooks

### `initialize(): Promise<void>`

Initializes the node's internal components. Override for custom initialization logic.

```typescript
class MyAgent extends oNode {
  private database: Database;
  
  async initialize() {
    await super.initialize();
    
    // Custom initialization
    this.database = new Database(this.config.dbPath);
    await this.database.connect();
    
    console.log('Custom agent initialized');
  }
}
```

### `teardown(): Promise<void>`

Performs cleanup operations. Override for custom cleanup logic.

```typescript
class MyAgent extends oNode {
  async teardown() {
    // Custom cleanup
    if (this.database) {
      await this.database.disconnect();
    }
    
    await super.teardown();
    console.log('Custom agent cleaned up');
  }
}
```

## Validation

### `validateJoinRequest(request: oRequest): Promise<any>`

Validates incoming join requests from other nodes. Override to implement custom validation logic.

```typescript
class SecureNode extends oNode {
  async validateJoinRequest(request: oRequest): Promise<any> {
    // Custom validation logic
    if (!request.headers?.authorization) {
      throw new Error('Authorization required');
    }
    
    const token = request.headers.authorization;
    const isValid = await this.validateToken(token);
    
    if (!isValid) {
      throw new Error('Invalid authorization token');
    }
    
    return { authorized: true, permissions: ['read', 'write'] };
  }
  
  private async validateToken(token: string): Promise<boolean> {
    // Token validation logic
    return token === 'valid-token';
  }
}
```

## Complete Implementation Examples

### Basic AI Agent

```typescript
import { oNode, oNodeAddress } from '@olane/o-node';

class AIAssistant extends oNode {
  constructor(networkAddress: string) {
    super({
      address: new oNodeAddress(`o://${networkAddress}/ai-assistant`),
      leader: new oNodeAddress(`o://${networkAddress}`),
      parent: null,
      name: 'AI Assistant',
      description: 'General purpose AI assistant',
      methods: {
        chat: {
          name: 'chat',
          description: 'Chat with the assistant',
          parameters: {
            message: { type: 'string', required: true },
            context: { type: 'object', required: false }
          }
        },
        analyze: {
          name: 'analyze',
          description: 'Analyze data or text',
          parameters: {
            data: { type: 'any', required: true },
            type: { type: 'string', required: true }
          }
        }
      }
    });
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'chat':
        return await this.processChat(params.message, params.context);
      
      case 'analyze':
        return await this.analyzeData(params.data, params.type);
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async processChat(message: string, context?: any): Promise<any> {
    // AI chat processing logic
    return {
      response: `I understand you said: "${message}"`,
      confidence: 0.95,
      context: context || {}
    };
  }
  
  private async analyzeData(data: any, type: string): Promise<any> {
    // Data analysis logic
    return {
      type,
      summary: `Analysis of ${type} data`,
      insights: ['insight1', 'insight2'],
      confidence: 0.87
    };
  }
}

// Usage
const assistant = new AIAssistant('my-company');
await assistant.start();
console.log('AI Assistant is ready');
```

### Human Agent Gateway

```typescript
import { oNode, oNodeAddress } from '@olane/o-node';

class HumanGateway extends oNode {
  private communicationChannels: Map<string, any> = new Map();
  
  constructor(networkAddress: string, userId: string) {
    super({
      address: new oNodeAddress(`o://${networkAddress}/human/${userId}`),
      leader: new oNodeAddress(`o://${networkAddress}`),
      parent: new oNodeAddress(`o://${networkAddress}/human`),
      name: `Human Agent - ${userId}`,
      description: 'Human agent gateway for cross-platform communication',
      methods: {
        sendMessage: {
          name: 'sendMessage',
          description: 'Send message to human via preferred channel',
          parameters: {
            message: { type: 'string', required: true },
            channel: { type: 'string', required: false },
            priority: { type: 'string', required: false, default: 'normal' }
          }
        },
        getCapabilities: {
          name: 'getCapabilities',
          description: 'Get human capabilities and availability',
          parameters: {}
        }
      }
    });
  }
  
  async initialize() {
    await super.initialize();
    
    // Initialize communication channels
    this.setupCommunicationChannels();
  }
  
  private setupCommunicationChannels() {
    // Setup various communication channels
    this.communicationChannels.set('slack', new SlackChannel());
    this.communicationChannels.set('email', new EmailChannel());
    this.communicationChannels.set('sms', new SMSChannel());
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'sendMessage':
        return await this.sendMessage(
          params.message, 
          params.channel, 
          params.priority
        );
      
      case 'getCapabilities':
        return await this.getCapabilities();
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async sendMessage(
    message: string, 
    channel?: string, 
    priority: string = 'normal'
  ): Promise<any> {
    // Select best channel based on availability and priority
    const selectedChannel = channel || this.selectBestChannel(priority);
    const channelHandler = this.communicationChannels.get(selectedChannel);
    
    if (!channelHandler) {
      throw new Error(`Channel ${selectedChannel} not available`);
    }
    
    const result = await channelHandler.send(message, { priority });
    
    return {
      sent: true,
      channel: selectedChannel,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    };
  }
  
  private async getCapabilities(): Promise<any> {
    return {
      available: true,
      channels: Array.from(this.communicationChannels.keys()),
      skills: [
        'decision-making',
        'creative-thinking',
        'domain-expertise',
        'api-access'
      ],
      availability: {
        timezone: 'UTC-8',
        workingHours: '9:00-17:00',
        currentStatus: 'available'
      }
    };
  }
  
  private selectBestChannel(priority: string): string {
    // Channel selection logic based on priority
    switch (priority) {
      case 'urgent':
        return 'sms';
      case 'high':
        return 'slack';
      case 'normal':
      default:
        return 'email';
    }
  }
}

// Usage
const humanGateway = new HumanGateway('company-network', 'john.doe');
await humanGateway.start();
console.log('Human gateway is ready');
```

### Multi-Device Agent

```typescript
import { oNode, oNodeAddress } from '@olane/o-node';

class MultiDeviceAgent extends oNode {
  private deviceSessions: Map<string, any> = new Map();
  private currentDevice: string | null = null;
  
  constructor(networkAddress: string, userId: string, deviceId: string) {
    super({
      address: new oNodeAddress(`o://${networkAddress}/user/${userId}/${deviceId}`),
      leader: new oNodeAddress(`o://${networkAddress}`),
      parent: new oNodeAddress(`o://${networkAddress}/user/${userId}`),
      seed: `${userId}-stable-seed`, // Consistent identity across devices
      name: `Multi-Device Agent - ${userId}`,
      description: 'Agent that follows user across multiple devices',
      methods: {
        switchDevice: {
          name: 'switchDevice',
          description: 'Switch active device context',
          parameters: {
            deviceId: { type: 'string', required: true }
          }
        },
        syncContext: {
          name: 'syncContext',
          description: 'Sync context between devices',
          parameters: {
            context: { type: 'object', required: true }
          }
        },
        getActiveDevice: {
          name: 'getActiveDevice',
          description: 'Get currently active device',
          parameters: {}
        }
      }
    });
    
    this.currentDevice = deviceId;
  }
  
  async initialize() {
    await super.initialize();
    
    // Register this device session
    this.deviceSessions.set(this.currentDevice!, {
      deviceId: this.currentDevice,
      lastActive: new Date(),
      capabilities: await this.detectDeviceCapabilities()
    });
    
    // Sync with other device instances
    await this.syncWithOtherDevices();
  }
  
  private async detectDeviceCapabilities(): Promise<string[]> {
    // Detect device-specific capabilities
    const capabilities = ['messaging'];
    
    // Add device-specific capabilities
    if (typeof window !== 'undefined') {
      capabilities.push('web-browser');
    }
    
    if (process.platform === 'darwin') {
      capabilities.push('macos-integration');
    }
    
    return capabilities;
  }
  
  private async syncWithOtherDevices(): Promise<void> {
    try {
      // Find other device instances for this user
      const parentAddress = this.config.parent!;
      const response = await this.use(parentAddress, {
        method: 'getDevices'
      });
      
      // Sync context with other devices
      for (const device of response.result.devices) {
        if (device.deviceId !== this.currentDevice) {
          await this.syncContextWithDevice(device.address);
        }
      }
    } catch (error) {
      this.logger.warn('Could not sync with other devices:', error);
    }
  }
  
  private async syncContextWithDevice(deviceAddress: string): Promise<void> {
    try {
      await this.use(new oNodeAddress(deviceAddress), {
        method: 'syncContext',
        params: {
          context: {
            deviceId: this.currentDevice,
            lastActive: new Date(),
            sessions: Array.from(this.deviceSessions.values())
          }
        }
      });
    } catch (error) {
      this.logger.warn(`Could not sync with device ${deviceAddress}:`, error);
    }
  }
  
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'switchDevice':
        return await this.switchDevice(params.deviceId);
      
      case 'syncContext':
        return await this.handleSyncContext(params.context);
      
      case 'getActiveDevice':
        return { activeDevice: this.currentDevice };
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  
  private async switchDevice(deviceId: string): Promise<any> {
    this.currentDevice = deviceId;
    
    // Update device session
    this.deviceSessions.set(deviceId, {
      deviceId,
      lastActive: new Date(),
      capabilities: await this.detectDeviceCapabilities()
    });
    
    // Notify other devices of the switch
    await this.syncWithOtherDevices();
    
    return {
      switched: true,
      activeDevice: deviceId,
      timestamp: new Date().toISOString()
    };
  }
  
  private async handleSyncContext(context: any): Promise<any> {
    // Merge context from other devices
    if (context.deviceId !== this.currentDevice) {
      this.deviceSessions.set(context.deviceId, {
        deviceId: context.deviceId,
        lastActive: new Date(context.lastActive),
        capabilities: context.capabilities || []
      });
    }
    
    return { synced: true };
  }
}

// Usage
const mobileAgent = new MultiDeviceAgent('personal-network', 'user123', 'mobile-001');
await mobileAgent.start();

const desktopAgent = new MultiDeviceAgent('personal-network', 'user123', 'desktop-001');
await desktopAgent.start();

console.log('Multi-device agents are ready');
```

## Best Practices

### 1. Consistent Identity

Use a stable seed for nodes that need consistent identity across restarts:

```typescript
const node = new oNode({
  address: new oNodeAddress('o://my-agent'),
  seed: 'stable-seed-for-consistent-peer-id',
  // ... other config
});
```

### 2. Error Handling

Always implement proper error handling for network operations:

```typescript
try {
  await node.start();
} catch (error) {
  console.error('Node startup failed:', error);
  
  // Check specific error conditions
  if (error.message.includes('Can not dial self')) {
    console.error('Network configuration issue - check leader/parent addresses');
  }
  
  // Implement retry logic if appropriate
  setTimeout(() => {
    node.start().catch(console.error);
  }, 5000);
}
```

### 3. Graceful Shutdown

Always implement graceful shutdown:

```typescript
const shutdown = async () => {
  try {
    await node.stop();
    console.log('Node stopped gracefully');
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### 4. Method Documentation

Always provide clear method documentation in your node configuration:

```typescript
const node = new oNode({
  // ... other config
  methods: {
    processData: {
      name: 'processData',
      description: 'Process data using specified algorithm',
      parameters: {
        data: { 
          type: 'object', 
          required: true,
          description: 'Input data to process'
        },
        algorithm: { 
          type: 'string', 
          required: false, 
          default: 'default',
          description: 'Processing algorithm to use'
        }
      }
    }
  }
});
```

### 5. Connection Management

Reuse connections when possible and close them properly:

```typescript
// Establish persistent connection for multiple requests
const connection = await node.connect(nextHop, target);

try {
  const result1 = await connection.send({ method: 'task1' });
  const result2 = await connection.send({ method: 'task2' });
  
  // Process results
  console.log('Results:', { result1, result2 });
} finally {
  // Always close connections
  await connection.close();
}
```

## Troubleshooting

### Common Issues

1. **"Can not dial self" Error**
   - Ensure you're not connecting directly through the leader node
   - Use a parent node or different entry point

2. **Registration Failures**
   - Check that the leader node is running and accessible
   - Verify network configuration and firewall settings

3. **Connection Timeouts**
   - Increase connection timeout in network configuration
   - Check network connectivity between nodes

4. **Memory Transport Issues**
   - Memory transports are automatically added for local testing
   - Don't rely on them for production deployments

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// Set debug environment variable
process.env.DEBUG = 'o-protocol:*';

// Or use debug in your code
import Debug from 'debug';
const debug = Debug('my-node');

debug('Node starting with config:', config);
```

## Migration from oCore

If you're migrating from a direct oCore implementation:

```typescript
// Old oCore implementation
class MyNode extends oCore {
  // ... implementation
}

// New oNode implementation
class MyNode extends oNode {
  // Most methods remain the same
  // Network configuration is now handled automatically
  // Connection management is built-in
}
```

Key changes:
- Network configuration is simplified
- Connection management is automatic
- Registration/discovery is built-in
- Hierarchy management is included
