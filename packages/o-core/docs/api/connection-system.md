---
title: "Connection System - Network Communication and Transport"
description: "Complete guide to Olane's connection management, transport abstraction, and network communication protocols"
---

# Connection System

The Olane connection system provides the foundation for network communication between nodes. It handles connection management, transport abstraction, request/response protocols, and ensures reliable communication across the distributed network.

## Overview

The connection system consists of several key components:

- **Connection Management** - Handles connection lifecycle, pooling, and caching
- **Transport Abstraction** - Supports multiple transport protocols (libp2p, WebSocket, HTTP, etc.)
- **Request/Response Protocol** - JSON-RPC based communication with Olane extensions
- **Connection Pooling** - Efficient reuse of connections for better performance
- **Error Handling** - Robust error propagation and recovery mechanisms

## Core Components

### oConnection Class

The `oConnection` class is the abstract base class for all network connections in Olane.

#### Constructor

```typescript
constructor(config: oConnectionConfig)
```

**oConnectionConfig Interface:**

```typescript
interface oConnectionConfig {
  nextHopAddress: oAddress;    // Next hop in routing path
  callerAddress?: oAddress;    // Address of the calling node
  address: oAddress;           // Target address for this connection
}
```

#### Properties

```typescript
abstract class oConnection extends oObject {
  readonly id: string;              // Unique connection identifier
  readonly address: oAddress;       // Target address
  readonly nextHopAddress: oAddress; // Next hop address
  readonly callerAddress?: oAddress; // Caller address
}
```

#### Methods

##### `send(data: ConnectionSendParams): Promise<oResponse>`

Sends data over the connection and returns the response.

```typescript
interface ConnectionSendParams {
  address: string;                    // Target address string
  payload: { [key: string]: any };   // Request payload
  id?: string;                       // Optional request ID
}
```

**Example:**

```typescript
const connection = await node.connect(nextHopAddress, targetAddress);

const response = await connection.send({
  address: 'o://calculator/math',
  payload: {
    method: 'add',
    params: { a: 5, b: 3 }
  },
  id: 'calc-001'
});

console.log('Result:', response.result);
```

##### `validate(): void`

Validates the connection configuration.

```typescript
try {
  connection.validate();
  console.log('Connection is valid');
} catch (error) {
  console.error('Invalid connection:', error.message);
}
```

##### `close(): Promise<void>`

Closes the connection and cleans up resources.

```typescript
await connection.close();
console.log('Connection closed');
```

##### `createRequest(method: string, params: ConnectionSendParams): oRequest`

Creates a properly formatted request object.

```typescript
const request = connection.createRequest('ROUTE', {
  address: 'o://target/service',
  payload: { data: 'example' }
});
```

##### `transmit(request: oRequest): Promise<oResponse>` (Abstract)

Abstract method that must be implemented by concrete connection classes to handle the actual data transmission.

### oConnectionManager Class

The connection manager handles connection pooling, caching, and lifecycle management.

```typescript
abstract class oConnectionManager extends oObject {
  protected cache: Map<string, oConnection>;
  
  constructor(config: oConnectionManagerConfig);
  
  abstract connect(config: oConnectionConfig): Promise<oConnection>;
  isCached(address: oAddress): boolean;
  getCachedConnection(address: oAddress): oConnection | null;
}
```

#### Methods

##### `connect(config: oConnectionConfig): Promise<oConnection>` (Abstract)

Creates a new connection to the specified address. Must be implemented by concrete subclasses.

##### `isCached(address: oAddress): boolean`

Checks if a connection to the address is cached.

```typescript
if (connectionManager.isCached(targetAddress)) {
  console.log('Using cached connection');
  const connection = connectionManager.getCachedConnection(targetAddress);
} else {
  console.log('Creating new connection');
  const connection = await connectionManager.connect(config);
}
```

##### `getCachedConnection(address: oAddress): oConnection | null`

Retrieves a cached connection if available and valid.

```typescript
const cachedConnection = connectionManager.getCachedConnection(address);
if (cachedConnection) {
  try {
    cachedConnection.validate();
    return cachedConnection;
  } catch (error) {
    console.log('Cached connection invalid, creating new one');
  }
}
```

## Request/Response Protocol

### oRequest Class

Represents a request in the Olane network using JSON-RPC 2.0 protocol with Olane extensions.

```typescript
class oRequest implements JSONRPCRequest {
  jsonrpc: typeof JSONRPC_VERSION;  // "2.0"
  method: string;                   // Method to invoke
  params: RequestParams;            // Request parameters
  id: RequestId;                   // Unique request identifier
  state: RequestState;             // Current request state
}
```

#### Constructor

```typescript
constructor(config: Request & { id: RequestId })
```

**Example:**

```typescript
const request = new oRequest({
  method: 'calculate',
  params: {
    operation: 'add',
    values: [5, 3],
    _connectionId: connection.id,
    _requestMethod: 'calculate'
  },
  id: 'req-001'
});
```

#### Properties and Methods

##### `connectionId: string`

Gets the connection ID from the request parameters.

```typescript
console.log('Request connection:', request.connectionId);
```

##### `setState(state: RequestState): void`

Updates the request state.

```typescript
request.setState(RequestState.PROCESSING);
```

**RequestState Values:**
- `PENDING` - Request created but not sent
- `PROCESSING` - Request is being processed
- `COMPLETED` - Request completed successfully
- `FAILED` - Request failed with error

##### `toJSON(): JSONRPCRequest`

Converts the request to JSON-RPC format.

```typescript
const jsonRequest = request.toJSON();
console.log(JSON.stringify(jsonRequest, null, 2));
```

##### Static Methods

```typescript
// Check if a string contains Olane addresses
const hasAddresses = oRequest.hasOlaneAddress(requestString);

// Extract Olane addresses from a string
const addresses = oRequest.extractAddresses(requestString);

// Create request from JSON
const request = oRequest.fromJSON(jsonData);
```

### oResponse Class

Represents a response in the Olane network.

```typescript
class oResponse implements Response {
  jsonrpc: typeof JSONRPC_VERSION;  // "2.0"
  id: RequestId;                   // Matching request ID
  result: Result;                  // Response data or error
}
```

#### Constructor

```typescript
constructor(config: Result & { id: RequestId })
```

**Example:**

```typescript
const response = new oResponse({
  id: 'req-001',
  success: true,
  data: { result: 8 },
  timestamp: Date.now()
});
```

#### Methods

##### `toJSON(): any`

Converts the response to JSON format.

```typescript
const jsonResponse = response.toJSON();
```

##### `toString(): string`

Converts the response to a JSON string.

```typescript
console.log('Response:', response.toString());
```

## Transport System

### oTransport Class

Abstract base class for all transport implementations.

```typescript
abstract class oTransport extends oObject {
  readonly value: any;              // Transport-specific configuration
  readonly type: TransportType;     // Transport type identifier
  
  constructor(value: any, type: TransportType);
  abstract toString(): string;
}
```

#### Transport Types

```typescript
enum TransportType {
  LIBP2P = 'libp2p',    // Peer-to-peer networking
  CUSTOM = 'custom'      // Custom transport implementations
}
```

### oCustomTransport Class

Implementation for custom transport protocols.

```typescript
class oCustomTransport extends oTransport {
  constructor(value: string) {
    super(value, TransportType.CUSTOM);
  }
  
  toString(): string {
    return this.value.toString();
  }
}
```

**Example:**

```typescript
// WebSocket transport
const wsTransport = new oCustomTransport('ws://localhost:8080');

// HTTP transport
const httpTransport = new oCustomTransport('https://api.example.com');

// Custom protocol
const customTransport = new oCustomTransport('custom://my-protocol:9000');
```

## Implementation Examples

### Basic Connection Manager

```typescript
import { oConnectionManager, oConnection, oConnectionConfig } from '@olane/o-core';

class WebSocketConnectionManager extends oConnectionManager {
  private connections: Map<string, WebSocket> = new Map();
  
  async connect(config: oConnectionConfig): Promise<oConnection> {
    const key = config.address.toString();
    
    // Check cache first
    if (this.isCached(config.address)) {
      const cached = this.getCachedConnection(config.address);
      if (cached) {
        return cached;
      }
    }
    
    // Create new connection
    const connection = new WebSocketConnection(config);
    await connection.initialize();
    
    // Cache the connection
    this.cache.set(key, connection);
    
    return connection;
  }
}
```

### WebSocket Connection Implementation

```typescript
class WebSocketConnection extends oConnection {
  private ws: WebSocket;
  private pendingRequests: Map<string, {
    resolve: (response: oResponse) => void;
    reject: (error: Error) => void;
  }> = new Map();
  
  constructor(config: oConnectionConfig) {
    super(config);
  }
  
  async initialize(): Promise<void> {
    const wsUrl = this.getWebSocketUrl();
    this.ws = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        this.logger.debug('WebSocket connection established');
        this.setupEventHandlers();
        resolve();
      };
      
      this.ws.onerror = (error) => {
        this.logger.error('WebSocket connection failed:', error);
        reject(new Error('WebSocket connection failed'));
      };
    });
  }
  
  private setupEventHandlers(): void {
    this.ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        this.handleResponse(response);
      } catch (error) {
        this.logger.error('Failed to parse response:', error);
      }
    };
    
    this.ws.onclose = () => {
      this.logger.debug('WebSocket connection closed');
      this.cleanup();
    };
    
    this.ws.onerror = (error) => {
      this.logger.error('WebSocket error:', error);
    };
  }
  
  async transmit(request: oRequest): Promise<oResponse> {
    return new Promise((resolve, reject) => {
      // Store the promise callbacks
      this.pendingRequests.set(request.id.toString(), { resolve, reject });
      
      // Send the request
      this.ws.send(request.toString());
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(request.id.toString())) {
          this.pendingRequests.delete(request.id.toString());
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout
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
    // Extract WebSocket URL from address or transport configuration
    const transport = this.address.transports.find(t => t.type === TransportType.CUSTOM);
    if (transport && transport.value.startsWith('ws://')) {
      return transport.value;
    }
    
    // Fallback URL construction
    return `ws://${this.nextHopAddress.paths}/ws`;
  }
  
  async close(): Promise<void> {
    await super.close();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.cleanup();
  }
  
  private cleanup(): void {
    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }
}
```

### HTTP Connection Implementation

```typescript
class HttpConnection extends oConnection {
  private baseUrl: string;
  private httpClient: any; // Your HTTP client (axios, fetch, etc.)
  
  constructor(config: oConnectionConfig) {
    super(config);
    this.baseUrl = this.extractHttpUrl();
    this.httpClient = new HttpClient({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Olane-Node/1.0'
      }
    });
  }
  
  async transmit(request: oRequest): Promise<oResponse> {
    try {
      const httpResponse = await this.httpClient.post(
        `${this.baseUrl}/rpc`,
        request.toJSON()
      );
      
      return new oResponse({
        id: request.id,
        ...httpResponse.data
      });
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }
  
  private extractHttpUrl(): string {
    const transport = this.address.transports.find(t => 
      t.value.startsWith('http://') || t.value.startsWith('https://')
    );
    
    if (transport) {
      return transport.value;
    }
    
    // Fallback URL construction
    return `https://${this.nextHopAddress.paths}`;
  }
}
```

## Advanced Connection Patterns

### Connection Pooling with Load Balancing

```typescript
class LoadBalancedConnectionManager extends oConnectionManager {
  private connectionPools: Map<string, oConnection[]> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  
  async connect(config: oConnectionConfig): Promise<oConnection> {
    const poolKey = config.address.root;
    
    // Get or create connection pool
    if (!this.connectionPools.has(poolKey)) {
      await this.initializePool(poolKey, config);
    }
    
    const pool = this.connectionPools.get(poolKey)!;
    
    // Round-robin selection
    const counter = this.roundRobinCounters.get(poolKey) || 0;
    const connection = pool[counter % pool.length];
    this.roundRobinCounters.set(poolKey, counter + 1);
    
    // Validate connection health
    try {
      connection.validate();
      return connection;
    } catch (error) {
      // Remove unhealthy connection and create new one
      const index = pool.indexOf(connection);
      pool.splice(index, 1);
      
      const newConnection = await this.createConnection(config);
      pool.push(newConnection);
      
      return newConnection;
    }
  }
  
  private async initializePool(poolKey: string, config: oConnectionConfig): Promise<void> {
    const poolSize = 3; // Configure as needed
    const pool: oConnection[] = [];
    
    for (let i = 0; i < poolSize; i++) {
      const connection = await this.createConnection(config);
      pool.push(connection);
    }
    
    this.connectionPools.set(poolKey, pool);
    this.roundRobinCounters.set(poolKey, 0);
  }
  
  private async createConnection(config: oConnectionConfig): Promise<oConnection> {
    // Determine connection type based on transport
    const transport = config.address.transports[0];
    
    if (transport.value.startsWith('ws://')) {
      return new WebSocketConnection(config);
    } else if (transport.value.startsWith('http')) {
      return new HttpConnection(config);
    } else {
      return new CustomConnection(config);
    }
  }
}
```

### Retry Logic and Circuit Breaker

```typescript
class ResilientConnection extends oConnection {
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly maxFailures: number = 5;
  private readonly resetTimeout: number = 60000; // 1 minute
  
  async transmit(request: oRequest): Promise<oResponse> {
    // Check circuit breaker
    if (this.circuitBreakerState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.circuitBreakerState = 'HALF_OPEN';
        this.logger.info('Circuit breaker half-open, attempting request');
      } else {
        throw new Error('Circuit breaker is open, request blocked');
      }
    }
    
    // Retry logic
    const maxRetries = 3;
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.doTransmit(request);
        
        // Success - reset circuit breaker
        if (this.circuitBreakerState === 'HALF_OPEN') {
          this.circuitBreakerState = 'CLOSED';
          this.failureCount = 0;
          this.logger.info('Circuit breaker closed after successful request');
        }
        
        return response;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Request attempt ${attempt + 1} failed:`, error.message);
        
        // Update circuit breaker state
        this.failureCount++;
        if (this.failureCount >= this.maxFailures) {
          this.circuitBreakerState = 'OPEN';
          this.lastFailureTime = Date.now();
          this.logger.error('Circuit breaker opened due to repeated failures');
        }
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  protected abstract doTransmit(request: oRequest): Promise<oResponse>;
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Connection Monitoring and Metrics

```typescript
class MonitoredConnection extends oConnection {
  private metrics = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    totalLatency: 0,
    lastRequestTime: 0
  };
  
  async transmit(request: oRequest): Promise<oResponse> {
    const startTime = Date.now();
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = startTime;
    
    try {
      const response = await this.doTransmit(request);
      
      // Record success metrics
      this.metrics.successCount++;
      const latency = Date.now() - startTime;
      this.metrics.totalLatency += latency;
      
      this.logger.debug(`Request completed in ${latency}ms`);
      
      return response;
    } catch (error) {
      // Record error metrics
      this.metrics.errorCount++;
      this.logger.error('Request failed:', error.message);
      throw error;
    }
  }
  
  getMetrics() {
    const avgLatency = this.metrics.requestCount > 0 
      ? this.metrics.totalLatency / this.metrics.requestCount 
      : 0;
    
    const successRate = this.metrics.requestCount > 0 
      ? this.metrics.successCount / this.metrics.requestCount 
      : 0;
    
    return {
      ...this.metrics,
      averageLatency: avgLatency,
      successRate: successRate,
      errorRate: 1 - successRate
    };
  }
  
  protected abstract doTransmit(request: oRequest): Promise<oResponse>;
}
```

## Error Handling and Recovery

### Connection Error Types

```typescript
enum ConnectionError {
  TIMEOUT = 'CONNECTION_TIMEOUT',
  REFUSED = 'CONNECTION_REFUSED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED'
}

class ConnectionException extends Error {
  constructor(
    public readonly type: ConnectionError,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ConnectionException';
  }
}
```

### Error Recovery Strategies

```typescript
class RecoverableConnectionManager extends oConnectionManager {
  async connect(config: oConnectionConfig): Promise<oConnection> {
    try {
      return await this.doConnect(config);
    } catch (error) {
      return await this.handleConnectionError(error, config);
    }
  }
  
  private async handleConnectionError(
    error: Error, 
    config: oConnectionConfig
  ): Promise<oConnection> {
    if (error instanceof ConnectionException) {
      switch (error.type) {
        case ConnectionError.TIMEOUT:
          // Retry with longer timeout
          return await this.retryWithTimeout(config);
          
        case ConnectionError.REFUSED:
          // Try alternative address or transport
          return await this.tryAlternativeTransport(config);
          
        case ConnectionError.NETWORK_ERROR:
          // Check network connectivity and retry
          await this.checkNetworkHealth();
          return await this.doConnect(config);
          
        case ConnectionError.AUTHENTICATION_FAILED:
          // Refresh authentication and retry
          await this.refreshAuthentication();
          return await this.doConnect(config);
          
        default:
          throw error;
      }
    }
    
    throw error;
  }
  
  private async retryWithTimeout(config: oConnectionConfig): Promise<oConnection> {
    // Implementation for timeout retry
  }
  
  private async tryAlternativeTransport(config: oConnectionConfig): Promise<oConnection> {
    // Implementation for alternative transport
  }
  
  private async checkNetworkHealth(): Promise<void> {
    // Implementation for network health check
  }
  
  private async refreshAuthentication(): Promise<void> {
    // Implementation for authentication refresh
  }
}
```

This comprehensive connection system provides robust, scalable, and flexible network communication for Olane nodes while maintaining high performance and reliability.
