# @olane/o-client-limited

A limited connection client for the Olane network. Provides a constrained connection variant of `oNodeTool` designed for bandwidth-limited, mobile, or resource-constrained environments where connection reuse and minimal network overhead are essential.

## Installation

```bash
pnpm add @olane/o-client-limited
```

## When to Use

Use `@olane/o-client-limited` instead of a regular `oNodeTool` when:

- **Bandwidth-limited environments** -- The client defaults `runOnLimitedConnection: true`, enabling connection and stream reuse to reduce overhead.
- **Mobile or edge devices** -- Network listeners are disabled by default (empty `listeners` array), so the node does not bind to ports or accept inbound connections.
- **Reusing existing connections** -- The limited connection manager is built to piggyback on already-established libp2p connections rather than opening new ones.
- **Lightweight participants** -- Nodes that only need to call out to the network (consume services) without advertising or serving requests to peers.

If your tool needs to listen for inbound connections, serve requests to other peers, or operate in a well-connected datacenter environment, use the standard `oNodeTool` from `@olane/o-node` instead.

## Quick Start

```typescript
import { oLimitedTool } from '@olane/o-client-limited';
import { oNodeAddress } from '@olane/o-node';

class MyLimitedTool extends oLimitedTool {
  constructor(config) {
    super({
      ...config,
      address: new oNodeAddress('o://my-limited-tool'),
      description: 'A tool optimized for limited connections',
    });
  }

  async _tool_ping(request) {
    return { pong: true, timestamp: Date.now() };
  }
}

// Usage
const tool = new MyLimitedTool({ leader: null, parent: null });
await tool.start();
```

## API Reference

### oLimitedTool

```typescript
import { oLimitedTool } from '@olane/o-client-limited';
```

A subclass of `oNodeTool` that preconfigures the node for limited-connection operation.

**Constructor behavior:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `runOnLimitedConnection` | `true` | Enables connection and stream reuse across requests |
| `network.listeners` | `[]` (empty) | Disables inbound network listeners by default |

You can still override `network.listeners` in the config you pass to the constructor if your use case requires listeners.

**Lifecycle hooks** -- The same hooks available on `oNodeTool` apply:

| Hook | When to use |
|------|-------------|
| `hookInitializeFinished()` | Initialize third-party services, API clients |
| `hookStartFinished()` | Start background tasks, create child nodes |
| `stop()` | Clean up resources, disconnect services |

**Method exposure** -- Prefix methods with `_tool_` to make them discoverable:

```typescript
class MyTool extends oLimitedTool {
  async _tool_fetch_data(request) {
    const { query } = request.params;
    if (!query) throw new Error('query is required');
    return { results: await this.search(query) };
  }
}
```

### oLimitedConnectionManager

```typescript
import { oLimitedConnectionManager } from '@olane/o-client-limited';
```

A subclass of `oNodeConnectionManager` tailored for limited-connection scenarios. This manager handles the low-level details of connection and stream reuse within the libp2p transport layer.

In most cases you do not need to interact with `oLimitedConnectionManager` directly -- `oLimitedTool` manages it internally.

## Response Structure

When calling methods on an `oLimitedTool` instance via `node.use()`, responses follow the standard Olane response envelope:

```typescript
const response = await tool.use(tool.address, {
  method: 'fetch_data',
  params: { query: 'example' },
});

// Check success
if (response.result.success) {
  const data = response.result.data;
  // { results: [...] }
} else {
  const error = response.result.error;
  // "query is required"
}
```

**Response shape:**

```typescript
{
  jsonrpc: "2.0",
  id: "request-id",
  result: {
    success: boolean,   // Whether the call succeeded
    data: any,          // Return value on success
    error?: string,     // Error message on failure
  }
}
```

## Comparison: oLimitedTool vs oNodeTool

| Aspect | oNodeTool | oLimitedTool |
|--------|-----------|--------------|
| **Package** | `@olane/o-node` | `@olane/o-client-limited` |
| **Network listeners** | Configured per environment | Disabled by default |
| **Connection reuse** | Optional (`runOnLimitedConnection: false` by default) | Always enabled (`runOnLimitedConnection: true`) |
| **Inbound requests** | Accepts connections from peers | Does not listen; outbound-only by default |
| **Best for** | Servers, full network participants | Mobile clients, edge devices, bandwidth-constrained nodes |
| **Overhead** | Standard libp2p resource usage | Minimal; reuses connections and streams |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@olane/o-core` | Core types and base classes |
| `@olane/o-node` | Node base class (`oNodeTool`) and connection primitives |
| `@olane/o-protocol` | Olane protocol definitions |
| `@olane/o-tool` | Tool interfaces |
| `@olane/o-config` | Configuration utilities |

## License

MIT OR Apache-2.0
