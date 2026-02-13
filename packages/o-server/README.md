# @olane/o-server

HTTP server entrypoint for Olane OS nodes. Exposes a node's `use` functionality via REST API.

**TL;DR**: Add HTTP/REST endpoints to any Olane node. Perfect for web frontends, mobile apps, or external services that need HTTP access to your node's capabilities.

## Installation

```bash
pnpm install @olane/o-server
```

## Quick Start

Add HTTP endpoints to your Olane node:

```typescript
import { oServer } from '@olane/o-server';
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// Create your node
const myNode = new oLaneTool({
  address: new oAddress('o://my-node'),
  // ... other config
});

await myNode.start();

// Add HTTP server
const server = oServer({
  node: myNode,
  port: 3000
});

await server.start();
// Server running on http://localhost:3000/api/v1
```

Now make HTTP calls to your node:

```bash
# Call the node's 'use' method via HTTP
curl -X POST http://localhost:3000/api/v1/use \
  -H "Content-Type: application/json" \
  -d '{
    "address": "o://analytics",
    "method": "calculate_revenue",
    "params": {"startDate": "2024-01-01", "endDate": "2024-03-31"}
  }'
```

## How It Works

`o-server` is a **simple HTTP wrapper** around a node's `use` method:

```
┌────────────────────────┐
│  HTTP Client           │
│  (Web, Mobile, etc.)   │
└────────────────────────┘
           ⬇ HTTP POST
┌────────────────────────┐
│  o-server              │
│  • Translates request  │
│  • Calls node.use()    │
│  • Returns JSON        │
└────────────────────────┘
           ⬇ node.use(address, data)
┌────────────────────────┐
│  Your Olane Node       │
│  • Routes to target    │
│  • Executes method     │
│  • Returns result      │
└────────────────────────┘
```

**Key Point**: `o-server` does NOT contain or manage Olane OS. It's just an HTTP entrypoint into a node that participates in Olane OS.

## API Endpoints

### POST `/api/v1/use`

Primary endpoint - calls the node's `use` method directly.

**Request Body:**
```json
{
  "address": "o://target/node",
  "method": "method_name",
  "params": { ... },
  "id": "optional-request-id"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/use \
  -H "Content-Type: application/json" \
  -d '{
    "address": "o://calculator",
    "method": "add",
    "params": {"a": 5, "b": 3}
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": 8
  }
}
```

---

### POST `/api/v1/:address/:method`

Convenience endpoint - REST-style URL structure.

**Parameters:**
- `address` (path): Target node address (without `o://` prefix)
- `method` (path): Method name to call
- `params` (body): Method parameters as JSON

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/calculator/add \
  -H "Content-Type: application/json" \
  -d '{"a": 5, "b": 3}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": 8
  }
}
```

---

### POST `/api/v1/use/stream`

Streaming endpoint (Server-Sent Events).

**Request Body:**
```json
{
  "address": "o://target/node",
  "method": "method_name",
  "params": { ... }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/use/stream \
  -H "Content-Type: application/json" \
  -d '{
    "address": "o://analytics",
    "method": "generate_report",
    "params": {"format": "pdf"}
  }'
```

**Response (SSE):**
```
data: {"type":"complete","result":{...}}
```

---

### GET `/api/v1/health`

Health check endpoint.

**Example:**
```bash
curl http://localhost:3000/api/v1/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1704067200000,
    "uptime": 3600.5
  }
}
```

## Configuration

### Basic Configuration

```typescript
import { oServer } from '@olane/o-server';

const server = oServer({
  // Required: Your Olane node
  node: myNode,
  
  // Optional: Server port (default: 3000)
  port: 8080,
  
  // Optional: Base path (default: '/api/v1')
  basePath: '/api/v2',
  
  // Optional: CORS settings
  cors: {
    origin: 'https://example.com',
    credentials: true
  },
  
  // Optional: JWT authentication (recommended)
  jwtAuth: {
    method: 'secret',
    secret: 'your-jwt-secret',
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com'
  },

  // DEPRECATED: Use jwtAuth instead. Will be removed in a future version.
  // authenticate: async (req) => {
  //   const token = req.headers.authorization;
  //   return validateToken(token);
  // },
  
  // Optional: Enable debug logging (default: false)
  debug: true
});

await server.start();
```

### JWT Authentication (Recommended)

Protect your endpoints with built-in JWT verification. All routes except `/health` require a valid token when `jwtAuth` is configured.

**RS256 with public key:**
```typescript
const server = oServer({
  node: myNode,
  port: 3000,
  jwtAuth: {
    method: 'publicKey',
    publicKeyPath: '/path/to/public-key.pem',
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com',
    algorithms: ['RS256']
  }
});
```

**HS256 with shared secret:**
```typescript
const server = oServer({
  node: myNode,
  port: 3000,
  jwtAuth: {
    method: 'secret',
    secret: process.env.JWT_SECRET!,
    clockTolerance: 5  // seconds of tolerance for exp/nbf
  }
});
```

**`jwtAuth` configuration options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `method` | `'publicKey' \| 'secret'` | Yes | Verification method |
| `publicKeyPath` | `string` | If `method='publicKey'` | Path to PEM public key file |
| `secret` | `string` | If `method='secret'` | Shared secret for HS256 |
| `issuer` | `string` | No | Expected `iss` claim |
| `audience` | `string` | No | Expected `aud` claim |
| `algorithms` | `Algorithm[]` | No | Allowed algorithms (defaults based on method) |
| `clockTolerance` | `number` | No | Seconds of clock tolerance (default: 0) |

### Legacy Authentication (Deprecated)

> **Deprecated**: The `authenticate` option is deprecated and will be removed in a future version. Migrate to `jwtAuth` instead.

```typescript
// @deprecated - use jwtAuth instead
const server = oServer({
  node: myNode,
  port: 3000,
  // @deprecated - use jwtAuth instead
  authenticate: async (req) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new Error('No token provided');
    }

    const user = await verifyJWT(token);
    return { userId: user.id, roles: user.roles };
  }
});
```

### CORS Configuration

Enable cross-origin requests:

```typescript
const server = oServer({
  node: myNode,
  port: 3000,
  cors: {
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});
```

### Custom Routes

Add custom routes alongside auto-generated endpoints:

```typescript
const server = oServer({ node: myNode, port: 3000 });

// Add custom route
server.app.get('/status', (req, res) => {
  res.json({ status: 'operational' });
});

// Add custom middleware
server.app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

await server.start();
```

## Common Use Cases

### Use Case 1: Web Frontend Integration

Expose your node to a React/Vue/Angular app:

```typescript
// backend/server.ts
import { oServer } from '@olane/o-server';
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

const analyticsNode = new oLaneTool({
  address: new oAddress('o://analytics'),
  // ... config
});

await analyticsNode.start();

const server = oServer({
  node: analyticsNode,
  port: 3000,
  cors: { origin: 'http://localhost:5173' } // Vite dev server
});

await server.start();
```

```typescript
// frontend/src/api.ts
// Note: HTTP responses from o-server use the flat { success, data, error } format.
// This is different from internal node.use() calls which return response.result.success.
export async function analyzeRevenue(startDate: string, endDate: string) {
  const response = await fetch('http://localhost:3000/api/v1/use', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: 'o://analytics',
      method: 'calculate_revenue',
      params: { startDate, endDate }
    })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Request failed');
  }

  return result.data;
}
```

### Use Case 2: Mobile App Backend

Create a REST API for iOS/Android apps:

```typescript
import { oServer } from '@olane/o-server';

const server = oServer({
  node: myNode,
  port: 8080,
  jwtAuth: {
    method: 'secret',
    secret: process.env.JWT_SECRET!,
    issuer: 'https://your-firebase-project.firebaseapp.com'
  }
});

await server.start();
```

### Use Case 3: Webhook Handler

Receive webhooks from external services:

```typescript
import { oServer } from '@olane/o-server';
import { oAddress } from '@olane/o-core';

const server = oServer({ node: myNode, port: 3000 });

// Stripe webhook
server.app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;

  // Process via your node (internal call uses response.result pattern)
  const response = await myNode.use(
    new oAddress('o://payments/processor'),
    {
      method: 'handle_payment',
      params: { event }
    }
  );

  if (!response.result.success) {
    res.status(500).json({ error: response.result.error });
    return;
  }

  res.json({ received: true, data: response.result.data });
});

await server.start();
```

### Use Case 4: Internal API Gateway

Gateway node that routes to other nodes:

```typescript
import { oServer } from '@olane/o-server';
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// Create gateway node connected to network
const gateway = new oLaneTool({
  address: new oAddress('o://gateway'),
  leader: new oAddress('o://leader'),
  // ... config
});

await gateway.start();

// Expose gateway via HTTP
const server = oServer({
  node: gateway,
  port: 3000
});

await server.start();

// Now clients can call ANY node in the network via HTTP
// curl -X POST http://localhost:3000/api/v1/use \
//   -d '{"address": "o://any/node/in/network", "method": "...", "params": {...}}'
```

## Response Structure

### HTTP Response (from o-server)

`o-server` flattens the internal node response into a simple HTTP-friendly format:

```json
// Success response (HTTP)
{
  "success": true,
  "data": { ... }
}

// Error response (HTTP)
{
  "success": false,
  "error": {
    "code": "EXECUTION_ERROR",
    "message": "Error message",
    "details": { ... }
  }
}
```

### Internal Node Response (from node.use())

Within the Olane node ecosystem, `node.use()` returns a JSON-RPC wrapped response. When calling nodes programmatically (not via HTTP), always access data through the `result` property:

```typescript
const response = await node.use(address, { method: 'my_method', params: {} });

// Access the response correctly:
if (response.result.success) {
  const data = response.result.data;    // Your method's return value
} else {
  const error = response.result.error;  // Error message string
}

// Full internal response shape:
// {
//   jsonrpc: "2.0",
//   id: "request-id",
//   result: {
//     success: boolean,
//     data: any,          // Present on success
//     error?: string      // Present on failure
//   }
// }
```

> **Important**: The `o-server` translates the internal `response.result.success` / `response.result.data` / `response.result.error` structure into the flat HTTP `{ success, data }` / `{ success, error }` format. When writing code that runs inside the node ecosystem (not behind o-server), always use `response.result.success`, `response.result.data`, and `response.result.error`.

## Error Handling

`o-server` provides consistent error responses:

**Common error codes:**
- `INVALID_PARAMS` - Missing or invalid request parameters
- `NODE_NOT_FOUND` - Target node address not found
- `TOOL_NOT_FOUND` - Method doesn't exist on target node
- `EXECUTION_ERROR` - Error during method execution
- `TIMEOUT` - Request exceeded timeout limit
- `UNAUTHORIZED` - Authentication failed

**Custom error handling:**

```typescript
const server = oServer({ node: myNode, port: 3000 });

server.app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});
```

## Troubleshooting

### Error: "Node is not running"

**Cause:** Node not started before creating server.

**Solution:**
```typescript
const myNode = new oLaneTool({ ... });
await myNode.start(); // ← Make sure node is started

const server = oServer({ node: myNode, port: 3000 });
await server.start();
```

### Error: "Invalid address"

**Cause:** Address format is incorrect.

**Solution:**
```bash
# Correct - with o:// prefix
curl -X POST http://localhost:3000/api/v1/use \
  -d '{"address": "o://target", ...}'

# Also correct - using convenience endpoint
curl -X POST http://localhost:3000/api/v1/target/method \
  -d '{"params": {...}}'
```

### Error: "CORS policy blocked"

**Cause:** Cross-origin requests not configured.

**Solution:**
```typescript
const server = oServer({
  node: myNode,
  port: 3000,
  cors: {
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true
  }
});
```

### High Latency

**Cause:** Network overhead or inefficient routing.

**Solutions:**
1. Deploy o-server on same machine as the node
2. Use o-server on a gateway node connected to the network
3. Enable caching for frequently accessed data
4. Consider using WebSocket transport for real-time needs

## TypeScript Support

Full TypeScript definitions included:

```typescript
import { oServer, ServerConfig, ServerInstance } from '@olane/o-server';
import { oCore } from '@olane/o-core';

const config: ServerConfig = {
  node: myNode,
  port: 3000,
  basePath: '/api/v1',
  cors: {
    origin: 'https://example.com'
  },
  jwtAuth: {
    method: 'secret',
    secret: process.env.JWT_SECRET!,
  },
  debug: true
};

const server: ServerInstance = oServer(config);
await server.start();
```

## Production Deployment

### Environment Variables

```bash
# .env
PORT=8080
BASE_PATH=/api/v1
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm run build

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Health Checks

```typescript
const server = oServer({ node: myNode, port: 3000 });

// Health check endpoint is built-in
// GET /api/v1/health

// For Kubernetes/Docker health checks:
// livenessProbe:
//   httpGet:
//     path: /api/v1/health
//     port: 3000
```

## Architecture Patterns

### Pattern 1: Node-Specific Server

One server per node (isolated services):

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ o-server    │       │ o-server    │       │ o-server    │
│ :3000       │       │ :3001       │       │ :3002       │
└─────────────┘       └─────────────┘       └─────────────┘
      ⬇                     ⬇                     ⬇
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ Analytics   │       │ CRM Node    │       │ Payment     │
│ Node        │       │             │       │ Node        │
└─────────────┘       └─────────────┘       └─────────────┘
```

**Best for:** Microservices architecture, team isolation

---

### Pattern 2: Gateway Server

One server on a gateway node (unified API):

```
                ┌─────────────┐
                │ o-server    │
                │ :3000       │
                └─────────────┘
                      ⬇
                ┌─────────────┐
                │ Gateway     │
                │ Node        │
                └─────────────┘
                      ⬇ connected to network
        ┌──────────────┼──────────────┐
        ⬇              ⬇              ⬇
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Analytics   │ │ CRM Node    │ │ Payment     │
│ Node        │ │             │ │ Node        │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Best for:** Unified API, single entry point, centralized auth

---

### Pattern 3: Load Balanced

Multiple servers for high availability:

```
                ┌─────────────┐
                │ Load        │
                │ Balancer    │
                └─────────────┘
                       ⬇
        ┌──────────────┼──────────────┐
        ⬇              ⬇              ⬇
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ o-server 1  │ │ o-server 2  │ │ o-server 3  │
│ :3000       │ │ :3000       │ │ :3000       │
└─────────────┘ └─────────────┘ └─────────────┘
        └──────────────┼──────────────┘
                       ⬇
              ┌─────────────────┐
              │   Gateway Node  │
              │   (shared)      │
              └─────────────────┘
```

**Best for:** High traffic, 99.9%+ uptime requirements

## Related Packages

- **[@olane/o-core](/packages/o-core)** - Core types and `use` method
- **[@olane/o-node](/packages/o-node)** - Build tool nodes
- **[@olane/o-lane](/packages/o-lane)** - Intent-driven nodes

## Examples

Complete examples:

```typescript
// Basic server
const server = oServer({ node: myNode, port: 3000 });
await server.start();

// With JWT authentication
const server = oServer({
  node: myNode,
  port: 3000,
  jwtAuth: {
    method: 'secret',
    secret: process.env.JWT_SECRET!,
  }
});

// With rate limiting
import rateLimit from 'express-rate-limit';

const server = oServer({ node: myNode, port: 3000 });

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

server.app.use('/api/v1', limiter);
await server.start();
```

## License

ISC

## Support

- **Documentation**: [https://docs.olane.com](https://docs.olane.com)
- **GitHub**: [https://github.com/olane-labs/olane](https://github.com/olane-labs/olane)
- **Issues**: [https://github.com/olane-labs/olane/issues](https://github.com/olane-labs/olane/issues)
