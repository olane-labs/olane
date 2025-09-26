---
title: "Getting Started with @olane/o-core"
description: "Step-by-step guide to building your first Olane network node with practical examples and best practices"
---

# Getting Started with @olane/o-core

This guide will walk you through creating your first Olane network node using the `@olane/o-core` package. You'll learn the fundamental concepts and build a working node step by step.

## Prerequisites

- Node.js v20 or higher
- npm or yarn package manager
- Basic understanding of TypeScript/JavaScript
- Familiarity with async/await patterns

## Installation

### 1. Create a New Project

```bash
mkdir my-olane-node
cd my-olane-node
npm init -y
```

### 2. Install Dependencies

```bash
# Install the core package
npm install @olane/o-core

# Install peer dependencies
npm install @olane/o-protocol

# Install development dependencies
npm install -D typescript @types/node tsx
```

### 3. Setup TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Update Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js"
  },
  "type": "module"
}
```

## Your First Node

### Step 1: Create a Basic Node Implementation

Create `src/my-node.ts`:

```typescript
import { 
  oCore, 
  oAddress, 
  NodeType, 
  oConnection, 
  oConnectionConfig,
  oTransport,
  oCustomTransport,
  oRouter,
  oAddressResolution
} from '@olane/o-core';

export class MyNode extends oCore {
  private connections: Map<string, oConnection> = new Map();
  
  constructor(address: string, port: number = 8080) {
    super({
      address: new oAddress(address),
      type: NodeType.WORKER,
      name: 'my-first-node',
      description: 'My first Olane network node',
      methods: {
        ping: {
          name: 'ping',
          description: 'Simple ping method',
          parameters: {}
        },
        echo: {
          name: 'echo',
          description: 'Echo back the input',
          parameters: {
            message: { type: 'string', required: true }
          }
        }
      }
    });
  }
  
  // Implement required abstract methods
  configureTransports() {
    return [
      new oCustomTransport(`http://localhost:${this.config.port || 8080}`)
    ];
  }
  
  async connect(nextHopAddress: oAddress, targetAddress: oAddress): Promise<oConnection> {
    const key = `${nextHopAddress.toString()}->${targetAddress.toString()}`;
    
    // Check if connection already exists
    if (this.connections.has(key)) {
      const existing = this.connections.get(key)!;
      try {
        existing.validate();
        return existing;
      } catch {
        // Connection invalid, remove it
        this.connections.delete(key);
      }
    }
    
    // Create new connection
    const connection = new MyConnection({
      nextHopAddress,
      targetAddress,
      callerAddress: this.address
    });
    
    this.connections.set(key, connection);
    return connection;
  }
  
  initializeRouter() {
    this.router = new MyRouter(this);
  }
  
  async register() {
    this.logger.info(`Node ${this.address.toString()} registered`);
  }
  
  async unregister() {
    this.logger.info(`Node ${this.address.toString()} unregistered`);
  }
  
  // Custom initialization
  async initialize() {
    await super.initialize();
    this.logger.info('Node initialized successfully');
  }
  
  // Handle incoming requests
  async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'ping':
        return { message: 'pong', timestamp: Date.now() };
      
      case 'echo':
        return { echo: params.message, timestamp: Date.now() };
      
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
}
```

### Step 2: Implement Connection Class

Create `src/my-connection.ts`:

```typescript
import { 
  oConnection, 
  oConnectionConfig, 
  oRequest, 
  oResponse 
} from '@olane/o-core';

export class MyConnection extends oConnection {
  constructor(config: oConnectionConfig) {
    super(config);
  }
  
  async transmit(request: oRequest): Promise<oResponse> {
    // For this example, we'll simulate a simple HTTP request
    // In a real implementation, you'd use the actual transport
    
    this.logger.debug(`Transmitting request: ${request.method}`);
    
    try {
      // Simulate network delay
      await this.sleep(100);
      
      // Create mock response
      const response = new oResponse({
        id: request.id,
        success: true,
        data: { message: 'Request processed successfully' },
        timestamp: Date.now()
      });
      
      this.logger.debug(`Response: ${response.toString()}`);
      return response;
    } catch (error) {
      throw new Error(`Transmission failed: ${error.message}`);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Step 3: Implement Router Class

Create `src/my-router.ts`:

```typescript
import { 
  oRouter, 
  oAddress, 
  oAddressResolution,
  oHierarchyManager 
} from '@olane/o-core';
import { MyNode } from './my-node.js';

export class MyRouter extends oRouter {
  constructor(private readonly node: MyNode) {
    super();
    this.addressResolution = new oAddressResolution(
      this.node.hierarchyManager
    );
  }
  
  async translate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // Simple routing logic
    if (this.isInternal(address)) {
      // Internal address - route to self
      return {
        nextHopAddress: this.node.address,
        targetAddress: address
      };
    }
    
    // External address - would normally route through network
    // For this example, we'll just return the address as-is
    return {
      nextHopAddress: address,
      targetAddress: address
    };
  }
  
  isInternal(address: oAddress): boolean {
    // Check if address belongs to this node
    return address.root === this.node.address.root;
  }
}
```

### Step 4: Create the Main Application

Create `src/index.ts`:

```typescript
import { MyNode } from './my-node.js';
import { oAddress } from '@olane/o-core';

async function main() {
  // Create node
  const node = new MyNode('o://my-network/worker-1', 8080);
  
  try {
    // Start the node
    console.log('Starting node...');
    await node.start();
    console.log(`Node started: ${node.address.toString()}`);
    
    // Test the node by calling its methods
    console.log('\n--- Testing Node Methods ---');
    
    // Test ping
    const pingResponse = await node.handleRequest('ping', {});
    console.log('Ping response:', pingResponse);
    
    // Test echo
    const echoResponse = await node.handleRequest('echo', { 
      message: 'Hello, Olane!' 
    });
    console.log('Echo response:', echoResponse);
    
    // Test network communication
    console.log('\n--- Testing Network Communication ---');
    const networkResponse = await node.use(
      new oAddress('o://my-network/worker-1/ping'),
      {
        method: 'ping',
        params: {},
        id: 'test-001'
      }
    );
    console.log('Network response:', networkResponse.result);
    
    // Keep the node running
    console.log('\nNode is running. Press Ctrl+C to stop.');
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await node.stop();
      console.log('Node stopped.');
      process.exit(0);
    });
    
    // Keep process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    await node.stop();
    process.exit(1);
  }
}

main().catch(console.error);
```

### Step 5: Run Your Node

```bash
# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

Expected output:
```
Starting node...
Node initialized successfully
Node o://my-network/worker-1 registered
Node started: o://my-network/worker-1

--- Testing Node Methods ---
Ping response: { message: 'pong', timestamp: 1703123456789 }
Echo response: { echo: 'Hello, Olane!', timestamp: 1703123456790 }

--- Testing Network Communication ---
Network response: { message: 'Request processed successfully' }

Node is running. Press Ctrl+C to stop.
```

## Building More Advanced Features

### Adding HTTP Server Integration

Create `src/http-server.ts`:

```typescript
import express from 'express';
import { MyNode } from './my-node.js';

export class HttpServer {
  private app = express();
  private server: any;
  
  constructor(private readonly node: MyNode, private readonly port: number) {
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }
  
  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        node: this.node.address.toString(),
        state: this.node.state,
        uptime: process.uptime()
      });
    });
    
    // Node info endpoint
    this.app.get('/info', async (req, res) => {
      try {
        const info = await this.node.whoami();
        res.json(info);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Method invocation endpoint
    this.app.post('/invoke/:method', async (req, res) => {
      try {
        const { method } = req.params;
        const params = req.body;
        
        const result = await this.node.handleRequest(method, params);
        res.json({ success: true, result });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
    
    // Network communication endpoint
    this.app.post('/network/send', async (req, res) => {
      try {
        const { address, method, params, id } = req.body;
        
        const response = await this.node.use(
          new oAddress(address),
          { method, params, id }
        );
        
        res.json({ success: true, response: response.result });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
  }
  
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`HTTP server listening on port ${this.port}`);
        resolve();
      });
    });
  }
  
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      console.log('HTTP server stopped');
    }
  }
}
```

Update your main application to include the HTTP server:

```typescript
// src/index.ts
import { MyNode } from './my-node.js';
import { HttpServer } from './http-server.js';

async function main() {
  const node = new MyNode('o://my-network/worker-1', 8080);
  const httpServer = new HttpServer(node, 3000);
  
  try {
    await node.start();
    await httpServer.start();
    
    console.log('Node and HTTP server started successfully');
    console.log('Try these endpoints:');
    console.log('- GET  http://localhost:3000/health');
    console.log('- GET  http://localhost:3000/info');
    console.log('- POST http://localhost:3000/invoke/ping');
    console.log('- POST http://localhost:3000/invoke/echo {"message": "test"}');
    
    process.on('SIGINT', async () => {
      await httpServer.stop();
      await node.stop();
      process.exit(0);
    });
    
    await new Promise(() => {});
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
```

### Adding WebSocket Support

Install WebSocket dependencies:

```bash
npm install ws @types/ws
```

Create `src/websocket-connection.ts`:

```typescript
import WebSocket from 'ws';
import { 
  oConnection, 
  oConnectionConfig, 
  oRequest, 
  oResponse 
} from '@olane/o-core';

export class WebSocketConnection extends oConnection {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, {
    resolve: (response: oResponse) => void;
    reject: (error: Error) => void;
  }>();
  
  constructor(config: oConnectionConfig) {
    super(config);
  }
  
  async initialize(): Promise<void> {
    const wsUrl = this.getWebSocketUrl();
    this.ws = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      this.ws!.on('open', () => {
        this.logger.debug('WebSocket connection established');
        this.setupEventHandlers();
        resolve();
      });
      
      this.ws!.on('error', (error) => {
        this.logger.error('WebSocket connection failed:', error);
        reject(error);
      });
    });
  }
  
  private setupEventHandlers(): void {
    this.ws!.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        this.handleResponse(response);
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message:', error);
      }
    });
    
    this.ws!.on('close', () => {
      this.logger.debug('WebSocket connection closed');
      this.cleanup();
    });
  }
  
  async transmit(request: oRequest): Promise<oResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      const requestId = request.id.toString();
      
      // Store promise callbacks
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Send request
      this.ws!.send(request.toString());
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  private handleResponse(responseData: any): void {
    const requestId = responseData.id?.toString();
    if (!requestId || !this.pendingRequests.has(requestId)) {
      this.logger.warn('Received response for unknown request:', requestId);
      return;
    }
    
    const { resolve } = this.pendingRequests.get(requestId)!;
    this.pendingRequests.delete(requestId);
    
    const response = new oResponse({
      id: responseData.id,
      ...responseData.result
    });
    
    resolve(response);
  }
  
  private getWebSocketUrl(): string {
    // Extract WebSocket URL from transport
    const transport = this.address.transports.find(t => 
      t.value.startsWith('ws://')
    );
    
    return transport?.value || `ws://localhost:8080/ws`;
  }
  
  private cleanup(): void {
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }
  
  async close(): Promise<void> {
    await super.close();
    if (this.ws) {
      this.ws.close();
    }
    this.cleanup();
  }
}
```

## Testing Your Node

Create `src/test.ts`:

```typescript
import { MyNode } from './my-node.js';
import { oAddress } from '@olane/o-core';

async function runTests() {
  console.log('Starting node tests...\n');
  
  const node = new MyNode('o://test-network/test-node');
  
  try {
    await node.start();
    
    // Test 1: Basic method calls
    console.log('Test 1: Basic method calls');
    const pingResult = await node.handleRequest('ping', {});
    console.log('✓ Ping:', pingResult);
    
    const echoResult = await node.handleRequest('echo', { message: 'test' });
    console.log('✓ Echo:', echoResult);
    
    // Test 2: Network communication
    console.log('\nTest 2: Network communication');
    const networkResult = await node.use(
      new oAddress('o://test-network/test-node'),
      { method: 'ping', id: 'test-ping' }
    );
    console.log('✓ Network call:', networkResult.result);
    
    // Test 3: Node information
    console.log('\nTest 3: Node information');
    const nodeInfo = await node.whoami();
    console.log('✓ Node info:', nodeInfo);
    
    // Test 4: Error handling
    console.log('\nTest 4: Error handling');
    try {
      await node.handleRequest('nonexistent', {});
    } catch (error) {
      console.log('✓ Error handling works:', error.message);
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await node.stop();
  }
}

runTests().catch(console.error);
```

Run tests:
```bash
npx tsx src/test.ts
```

## Next Steps

Now that you have a working Olane node, you can:

1. **Add More Methods** - Implement additional functionality for your specific use case
2. **Integrate with External Services** - Connect to databases, APIs, or other systems
3. **Build Network Topology** - Create multiple nodes and establish parent-child relationships
4. **Add Security** - Implement authentication and authorization
5. **Scale Horizontally** - Deploy multiple instances with load balancing
6. **Monitor and Debug** - Add logging, metrics, and health checks

### Useful Resources

- **Main Documentation**: [o-core API Reference](./README.md)
- **oCore Class**: [Complete oCore Documentation](./api/ocore.md)
- **Address System**: [Address System Guide](./api/address-system.md)
- **Connection System**: [Connection Management](./api/connection-system.md)
- **Router System**: [Routing and Resolution](./api/router-system.md)

### Common Patterns

- **Service Node**: Expose specific functionality as network services
- **Gateway Node**: Route requests between different networks or protocols
- **Storage Node**: Provide distributed storage capabilities
- **Compute Node**: Perform intensive computations for the network
- **Bridge Node**: Connect Olane networks to external systems

### Troubleshooting

**Node won't start:**
- Check that all required abstract methods are implemented
- Verify address format (must start with 'o://')
- Ensure no port conflicts

**Connection errors:**
- Verify transport configuration
- Check network connectivity
- Review address resolution logic

**Routing issues:**
- Debug router translate method
- Check address resolution chain
- Verify hierarchy configuration

Happy building with Olane! 🚀
