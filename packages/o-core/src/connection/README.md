# Connection System - Inter-Agent Communication (IPC)

The connection system in o-core is the **Inter-Process Communication (IPC) layer** for Olane OS that handles agent-to-agent communication. Think of it as the socket layer and message passing system for an operating system, but for AI agents.

## Overview

The connection system provides:

- **Connection Management** - Pooling, caching, and lifecycle management of agent connections
- **JSON-RPC Protocol** - Standardized request/response messaging format
- **Transport Abstraction** - Support for any underlying transport (libp2p, HTTP, WebSocket, etc.)
- **Request Tracking** - State management and lifecycle tracking for requests
- **Connection Pooling** - Automatic connection reuse and caching

## Core Components

### 1. oConnection - The Communication Channel

The `oConnection` class represents an active communication channel between two agents.

```typescript
import { oConnection, oConnectionConfig, oRequest, oResponse } from '@olane/o-core';

class MyConnection extends oConnection {
  constructor(config: oConnectionConfig) {
    super(config);
  }

  // Implement the actual transmission logic
  async transmit(request: oRequest): Promise<oResponse> {
    // Your transport-specific logic (HTTP, libp2p, WebSocket, etc.)
    const response = await this.sendOverNetwork(request);
    return new oResponse({
      id: request.id,
      result: response.data
    });
  }
}

// Create a connection
const connection = new MyConnection({
  nextHopAddress: new oAddress('o://next-hop'),
  callerAddress: new oAddress('o://caller'),
  address: new oAddress('o://target')
});

// Send data
const response = await connection.send({
  address: 'o://target/service',
  payload: { key: 'value' },
  id: 'request-123'
});
```

#### Connection Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique connection identifier (UUID) |
| `address` | `oAddress` | Target address of the connection |
| `nextHopAddress` | `oAddress` | Next hop in the routing path |
| `callerAddress` | `oAddress` | Address of the calling agent |

#### Connection Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `send(data)` | Send data to the target agent | `Promise<oResponse>` |
| `transmit(request)` | Low-level transmission (abstract) | `Promise<oResponse>` |
| `createRequest(method, params)` | Create a JSON-RPC request | `oRequest` |
| `validate()` | Validate connection configuration | `void` |
| `close()` | Close the connection | `Promise<void>` |

### 2. oConnectionManager - Connection Pool Manager

The `oConnectionManager` class manages connection pooling and caching for optimal performance.

```typescript
import { oConnectionManager, oConnectionConfig, oConnection } from '@olane/o-core';

class MyConnectionManager extends oConnectionManager {
  constructor() {
    super({});
  }

  // Implement connection creation logic
  async connect(config: oConnectionConfig): Promise<oConnection> {
    // Check cache first
    const cached = this.getCachedConnection(config.address);
    if (cached) {
      this.logger.debug('Using cached connection');
      return cached;
    }

    // Create new connection
    const connection = new MyConnection(config);
    
    // Cache it
    this.cache.set(config.address.toString(), connection);
    
    return connection;
  }
}

// Usage
const manager = new MyConnectionManager();

// First call - creates new connection
const conn1 = await manager.connect({
  nextHopAddress: targetAddress,
  callerAddress: myAddress,
  address: targetAddress
});

// Second call to same address - uses cached connection
const conn2 = await manager.connect({
  nextHopAddress: targetAddress,
  callerAddress: myAddress,
  address: targetAddress
});

console.log(conn1.id === conn2.id); // true - same connection
```

#### ConnectionManager Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `connect(config)` | Get or create connection to address | `Promise<oConnection>` |
| `isCached(address)` | Check if connection is cached | `boolean` |
| `getCachedConnection(address)` | Retrieve cached connection | `oConnection \| null` |

### 3. oRequest - JSON-RPC Request

The `oRequest` class implements the JSON-RPC 2.0 request format with state tracking.

```typescript
import { oRequest, RequestState } from '@olane/o-core';

// Create a request
const request = new oRequest({
  method: 'processData',
  params: {
    _connectionId: 'conn-123',
    _requestMethod: 'processData',
    data: [1, 2, 3],
    userId: 'user-456'
  },
  id: 'request-789'
});

// JSON-RPC 2.0 format
console.log(request.toJSON());
// {
//   jsonrpc: "2.0",
//   method: "processData",
//   params: { ... },
//   id: "request-789"
// }

// State management
console.log(request.state); // RequestState.PENDING
request.setState(RequestState.PROCESSING);
request.setState(RequestState.COMPLETED);

// Connection tracking
console.log(request.connectionId); // "conn-123"

// Serialization
const jsonString = request.toString();
const restored = oRequest.fromJSON(JSON.parse(jsonString));
```

#### Request Properties

| Property | Type | Description |
|----------|------|-------------|
| `jsonrpc` | `string` | JSON-RPC version (always "2.0") |
| `method` | `string` | Method to invoke |
| `params` | `RequestParams` | Method parameters |
| `id` | `RequestId` | Unique request identifier |
| `state` | `RequestState` | Current request state |
| `connectionId` | `string` | Associated connection ID |

#### Request States

```typescript
enum RequestState {
  PENDING = 'PENDING',        // Request created, not yet sent
  PROCESSING = 'PROCESSING',  // Request being processed
  COMPLETED = 'COMPLETED',    // Request completed successfully
  FAILED = 'FAILED'          // Request failed with error
}
```

#### Address Extraction

Extract `o://` addresses from request parameters:

```typescript
const text = "Send data to o://company/placeholder/service and o://users/placeholder/alice";

// Check if text contains addresses
oRequest.hasOlaneAddress(text); // true

// Extract all addresses
const addresses = oRequest.extractAddresses(text);
console.log(addresses);
// ["o://company/placeholder/service", "o://users/placeholder/alice"]
```

### 4. oResponse - JSON-RPC Response

The `oResponse` class implements the JSON-RPC 2.0 response format.

```typescript
import { oResponse } from '@olane/o-core';

// Create a response
const response = new oResponse({
  id: 'request-789',
  result: { success: true, data: [1, 2, 3] }
});

// JSON-RPC 2.0 format
console.log(response.toJSON());
// {
//   jsonrpc: "2.0",
//   id: "request-789",
//   result: { success: true, data: [1, 2, 3] }
// }

// Error response
const errorResponse = new oResponse({
  id: 'request-789',
  error: {
    code: -32600,
    message: 'Invalid Request',
    data: { details: 'Missing required parameter' }
  }
});
```

#### Response Properties

| Property | Type | Description |
|----------|------|-------------|
| `jsonrpc` | `string` | JSON-RPC version (always "2.0") |
| `id` | `RequestId` | Request identifier (matches request) |
| `result` | `Result` | Response data or error |

## Complete Communication Flow

Here's how the connection system works end-to-end:

```typescript
import { 
  oCore, 
  oAddress, 
  oConnectionManager, 
  oConnection,
  oRequest,
  oResponse 
} from '@olane/o-core';

// 1. Agent initiates communication
class AgentA extends oCore {
  async communicateWithAgentB() {
    // Use the high-level API (this uses connection system internally)
    const response = await this.use(
      new oAddress('o://agent-b'),
      {
        method: 'processData',
        params: { data: [1, 2, 3] }
      }
    );
    
    return response.result;
  }
}

// 2. Connection system handles the flow internally
class MyCore extends oCore {
  async connect(
    nextHopAddress: oAddress,
    targetAddress: oAddress
  ): Promise<oConnection> {
    // ConnectionManager creates or retrieves connection
    return await this.connectionManager.connect({
      nextHopAddress,
      callerAddress: this.address,
      address: targetAddress
    });
  }
}

// 3. Connection transmits the request
class MyConnection extends oConnection {
  async transmit(request: oRequest): Promise<oResponse> {
    // Send request over transport (HTTP, libp2p, etc.)
    const rawResponse = await fetch(this.nextHopAddress.toString(), {
      method: 'POST',
      body: request.toString(),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Parse response
    const data = await rawResponse.json();
    return new oResponse({
      id: request.id,
      ...data
    });
  }
}
```

## Implementation Examples

### HTTP-based Connection

```typescript
class HttpConnection extends oConnection {
  async transmit(request: oRequest): Promise<oResponse> {
    try {
      const response = await fetch(
        this.nextHopAddress.toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Caller-Address': this.callerAddress?.toString() || 'unknown'
          },
          body: request.toString()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return new oResponse({
        id: request.id,
        result: data
      });
    } catch (error) {
      // Return error response
      return new oResponse({
        id: request.id,
        error: {
          code: -32000,
          message: error.message,
          data: { type: 'TransportError' }
        }
      });
    }
  }
}
```

### WebSocket-based Connection

```typescript
class WebSocketConnection extends oConnection {
  private ws: WebSocket | null = null;

  async transmit(request: oRequest): Promise<oResponse> {
    // Ensure WebSocket is connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.reconnect();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      // Set up response handler
      const handler = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.id === request.id) {
          clearTimeout(timeout);
          this.ws!.removeEventListener('message', handler);
          resolve(new oResponse(response));
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(request.toString());
    });
  }

  private async reconnect(): Promise<void> {
    this.ws = new WebSocket(this.nextHopAddress.toString());
    await new Promise((resolve) => {
      this.ws!.onopen = resolve;
    });
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    await super.close();
  }
}
```

### Connection Manager with Cleanup

```typescript
class SmartConnectionManager extends oConnectionManager {
  private maxCacheSize = 100;
  private connectionTimeout = 300000; // 5 minutes

  async connect(config: oConnectionConfig): Promise<oConnection> {
    // Check cache
    const cached = this.getCachedConnection(config.address);
    if (cached) {
      return cached;
    }

    // Cleanup old connections if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      await this.cleanupOldConnections();
    }

    // Create new connection
    const connection = new MyConnection(config);
    this.cache.set(config.address.toString(), connection);

    // Schedule cleanup
    this.scheduleCleanup(config.address, this.connectionTimeout);

    return connection;
  }

  private async cleanupOldConnections(): Promise<void> {
    // Remove oldest 10% of connections
    const toRemove = Math.ceil(this.cache.size * 0.1);
    const keys = Array.from(this.cache.keys()).slice(0, toRemove);
    
    for (const key of keys) {
      const conn = this.cache.get(key);
      if (conn) {
        await conn.close();
      }
      this.cache.delete(key);
    }
  }

  private scheduleCleanup(address: oAddress, timeout: number): void {
    setTimeout(() => {
      const conn = this.cache.get(address.toString());
      if (conn) {
        conn.close();
        this.cache.delete(address.toString());
      }
    }, timeout);
  }
}
```

## Advanced Patterns

### Request Retry Logic

```typescript
class ResilientConnection extends oConnection {
  private maxRetries = 3;
  private retryDelay = 1000;

  async transmit(request: oRequest): Promise<oResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.attemptTransmit(request);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Request failed (attempt ${attempt + 1}/${this.maxRetries})`,
          error
        );

        if (attempt < this.maxRetries - 1) {
          // Exponential backoff
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // All retries failed
    throw lastError;
  }

  private async attemptTransmit(request: oRequest): Promise<oResponse> {
    // Your actual transmission logic
    throw new Error('Not implemented');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Request/Response Middleware

```typescript
class MiddlewareConnection extends oConnection {
  private middlewares: Array<{
    onRequest?: (req: oRequest) => oRequest;
    onResponse?: (res: oResponse) => oResponse;
  }> = [];

  use(middleware: {
    onRequest?: (req: oRequest) => oRequest;
    onResponse?: (res: oResponse) => oResponse;
  }): void {
    this.middlewares.push(middleware);
  }

  async transmit(request: oRequest): Promise<oResponse> {
    // Apply request middlewares
    let modifiedRequest = request;
    for (const mw of this.middlewares) {
      if (mw.onRequest) {
        modifiedRequest = mw.onRequest(modifiedRequest);
      }
    }

    // Transmit
    let response = await this.actualTransmit(modifiedRequest);

    // Apply response middlewares (in reverse order)
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i];
      if (mw.onResponse) {
        response = mw.onResponse(response);
      }
    }

    return response;
  }

  private async actualTransmit(request: oRequest): Promise<oResponse> {
    // Your transport logic
    throw new Error('Not implemented');
  }
}

// Usage
const connection = new MiddlewareConnection(config);

// Add logging middleware
connection.use({
  onRequest: (req) => {
    console.log('Sending request:', req.method);
    return req;
  },
  onResponse: (res) => {
    console.log('Received response:', res.id);
    return res;
  }
});

// Add timing middleware
connection.use({
  onRequest: (req) => {
    req.params._startTime = Date.now();
    return req;
  },
  onResponse: (res) => {
    const duration = Date.now() - (res.result._startTime || 0);
    console.log(`Request took ${duration}ms`);
    return res;
  }
});
```

### Connection Health Monitoring

```typescript
class MonitoredConnection extends oConnection {
  private successCount = 0;
  private failureCount = 0;
  private lastSuccess: Date | null = null;
  private lastFailure: Date | null = null;

  async transmit(request: oRequest): Promise<oResponse> {
    const startTime = Date.now();

    try {
      const response = await this.actualTransmit(request);
      
      // Record success
      this.successCount++;
      this.lastSuccess = new Date();

      // Record latency
      const latency = Date.now() - startTime;
      this.recordLatency(latency);

      return response;
    } catch (error) {
      // Record failure
      this.failureCount++;
      this.lastFailure = new Date();

      throw error;
    }
  }

  getHealthMetrics() {
    const total = this.successCount + this.failureCount;
    const successRate = total > 0 ? this.successCount / total : 0;

    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: successRate,
      lastSuccess: this.lastSuccess,
      lastFailure: this.lastFailure,
      isHealthy: successRate > 0.95 // 95% success rate threshold
    };
  }

  private recordLatency(latency: number): void {
    // Record to metrics system
    this.logger.debug(`Request latency: ${latency}ms`);
  }

  private async actualTransmit(request: oRequest): Promise<oResponse> {
    // Your transport logic
    throw new Error('Not implemented');
  }
}
```

## Interfaces

### oConnectionConfig

```typescript
interface oConnectionConfig {
  nextHopAddress: oAddress;  // Next hop in routing path
  callerAddress?: oAddress;  // Address of the caller
  address: oAddress;         // Target address
}
```

### ConnectionSendParams

```typescript
interface ConnectionSendParams {
  address: string;           // Target address string
  payload: {                 // Request payload
    [key: string]: unknown;
  };
  id?: string;              // Optional request ID
}
```

### oConnectionManagerConfig

```typescript
interface oConnectionManagerConfig {
  // Configuration for connection manager
  // Currently empty - extend as needed
}
```

## JSON-RPC 2.0 Specification

The connection system implements [JSON-RPC 2.0](https://www.jsonrpc.org/specification) for standardized messaging:

### Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "methodName",
  "params": {
    "_connectionId": "uuid",
    "_requestMethod": "methodName",
    "param1": "value1"
  },
  "id": "request-id"
}
```

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "data": "response data"
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": { "details": "..." }
  }
}
```

## Best Practices

### 1. Always Use Connection Pooling

```typescript
// ✅ Good - Reuses connections
const manager = new MyConnectionManager();
const conn = await manager.connect(config);

// ❌ Bad - Creates new connection every time
const conn = new MyConnection(config);
```

### 2. Handle Connection Errors Gracefully

```typescript
async transmit(request: oRequest): Promise<oResponse> {
  try {
    return await this.actualTransmit(request);
  } catch (error) {
    this.logger.error('Transmission failed', error);
    
    // Return error response instead of throwing
    return new oResponse({
      id: request.id,
      error: {
        code: -32000,
        message: error.message
      }
    });
  }
}
```

### 3. Implement Timeouts

```typescript
async transmit(request: oRequest): Promise<oResponse> {
  const timeout = 30000; // 30 seconds
  
  return Promise.race([
    this.actualTransmit(request),
    this.createTimeout(timeout, request.id)
  ]);
}

private async createTimeout(ms: number, requestId: string): Promise<oResponse> {
  await new Promise(resolve => setTimeout(resolve, ms));
  return new oResponse({
    id: requestId,
    error: {
      code: -32000,
      message: 'Request timeout'
    }
  });
}
```

### 4. Validate Connections Before Use

```typescript
async send(data: ConnectionSendParams): Promise<oResponse> {
  // Validate connection
  try {
    this.validate();
  } catch (error) {
    this.logger.error('Invalid connection', error);
    throw error;
  }

  // Proceed with send
  return super.send(data);
}
```

### 5. Clean Up Resources

```typescript
async close(): Promise<void> {
  this.logger.debug('Closing connection');
  
  // Close transport-specific resources
  if (this.socket) {
    this.socket.close();
  }
  
  if (this.httpClient) {
    this.httpClient.abort();
  }
  
  // Call parent cleanup
  await super.close();
}
```

## Performance Considerations

1. **Connection Reuse** - Cache connections to avoid handshake overhead
2. **Request Batching** - Send multiple requests over same connection
3. **Compression** - Compress large payloads before transmission
4. **Connection Limits** - Limit max connections to avoid resource exhaustion
5. **Timeout Configuration** - Set appropriate timeouts based on use case

## Debugging

Enable debug logging to trace connection lifecycle:

```typescript
import debug from 'debug';

const log = debug('o-core:connection');

class DebugConnection extends oConnection {
  async transmit(request: oRequest): Promise<oResponse> {
    log('Sending request:', {
      id: request.id,
      method: request.method,
      from: this.callerAddress?.toString(),
      to: this.address.toString()
    });

    const response = await super.transmit(request);

    log('Received response:', {
      id: response.id,
      success: !response.result.error
    });

    return response;
  }
}
```

## Related Components

- **oRouter** - Determines next-hop address for connections
- **oCore** - Uses connection system for all inter-agent communication
- **oTransport** - Transport layer abstraction (libp2p, HTTP, etc.)
- **oProtocol** - Protocol definitions and JSON-RPC types

---

The connection system is the IPC (Inter-Process Communication) layer that enables agents to send and receive messages - a fundamental component that makes Olane OS an operating system for AI agents rather than just a framework.
