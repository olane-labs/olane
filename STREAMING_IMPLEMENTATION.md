# Streaming Response Implementation

This document describes the streaming response feature added to the olane networking layer.

## Overview

The olane repository now supports streaming responses, allowing tools to progressively send data to clients using AsyncGenerator-based patterns. This is particularly useful for:

- Large language model (LLM) text generation
- Streaming database query results
- Progress updates for long-running operations
- Real-time data feeds
- Large file transfers

## Architecture

### Key Design Decisions

1. **Backward Compatible**: Existing non-streaming tools continue to work without any changes
2. **Auto-Detection**: Streaming is automatically detected based on AsyncGenerator return types
3. **Protocol Extension**: JSON-RPC 2.0 protocol extended with streaming metadata
4. **Flow Control**: Leverages libp2p's built-in backpressure mechanisms
5. **Type Safety**: TypeScript signatures reflect streaming capabilities

### Data Flow

```
Client                    Connection                 Node                     Tool
  |                           |                        |                        |
  |--useStreaming()---------->|                        |                        |
  |                           |                        |                        |
  |                           |--transmitStreaming()-->|                        |
  |                           |                        |--handleStream()------->|
  |                           |                        |                        |
  |                           |                        |                  execute()
  |                           |                        |                        |
  |                           |                        |<--AsyncGenerator-------|
  |                           |                        |                        |
  |                           |<----chunk 1------------|  (iterate generator)   |
  |<----yield chunk 1---------|                        |                        |
  |                           |                        |                        |
  |                           |<----chunk 2------------|                        |
  |<----yield chunk 2---------|                        |                        |
  |                           |                        |                        |
  |                           |        ...             |         ...            |
  |                           |                        |                        |
  |                           |<----chunk N (last)-----|                        |
  |<----yield chunk N---------|                        |                        |
  |                           |                        |                        |
  |  (stream complete)        |   (stream closed)      |                        |
```

## Implementation Details

### 1. Protocol Layer (o-protocol)

**File**: `packages/o-protocol/src/json-rpc/json-rpc.ts`

Added streaming-specific types:

```typescript
export interface StreamingMetadata {
  _streaming: true;
  _sequence: number;
  _isLast: boolean;
}

export interface StreamingResult extends Result, StreamingMetadata {
  _data: unknown;
}

export interface JSONRPCStreamChunk {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  result: StreamingResult;
}
```

### 2. Core Utilities (o-core)

**File**: `packages/o-core/src/utils/core.utils.ts`

Added streaming support methods:

```typescript
// Send individual stream chunks
public static async sendStreamChunk(
  chunk: any,
  stream: Stream,
  sequence: number,
  isLast: boolean,
  request: oRequest,
): Promise<void>

// Check if value is AsyncGenerator
public static isAsyncGenerator(value: any): value is AsyncGenerator
```

**File**: `packages/o-core/src/connection/o-response.ts`

Extended oResponse class:

```typescript
class oResponse {
  isStreaming?: boolean;
  streamChunks?: unknown[];

  addChunk(chunk: unknown): void
  getChunks(): unknown[]
}
```

### 3. Tool Layer (o-tool)

**File**: `packages/o-tool/src/o-tool.base.ts`

Updated method signature to support AsyncGenerator:

```typescript
async callMyTool(
  request: oRequest,
  stream?: Stream,
): Promise<ToolResult | AsyncGenerator<ToolResult>>
```

### 4. Node Layer (o-node)

**File**: `packages/o-node/src/o-node.tool.ts`

Updated message handler to detect and iterate AsyncGenerators:

```typescript
// Check if result is a streaming AsyncGenerator
if (CoreUtils.isAsyncGenerator(result)) {
  let sequence = 0;
  for await (const chunk of result) {
    sequence++;
    await CoreUtils.sendStreamChunk(chunk, stream, sequence, false, request);
  }
  // Send final chunk
  await CoreUtils.sendStreamChunk(null, stream, sequence + 1, true, request);
}
```

**File**: `packages/o-node/src/connection/o-node-connection.ts`

Added streaming transmission method:

```typescript
async transmitStreaming(
  request: oRequest,
  onChunk: (chunk: any, sequence: number, isLast: boolean) => void,
): Promise<void>
```

### 5. Client Layer (o-client)

**File**: `../o-client/src/client.tool.ts`

Added streaming consumption method:

```typescript
async *useStreaming(
  address: oNodeAddress,
  data: { method: string; params?: any },
): AsyncGenerator<any, void, unknown>
```

## Usage

### Creating a Streaming Tool

```typescript
import { oRequest } from '@olane/o-core';
import { oNodeTool } from '@olane/o-node';

export class MyStreamingTool extends oNodeTool {
  // Regular non-streaming method
  async _tool_get_all(request: oRequest): Promise<any> {
    return { items: [1, 2, 3] };
  }

  // Streaming method - returns AsyncGenerator
  async *_tool_stream_items(request: oRequest): AsyncGenerator<any> {
    const { count = 10 } = request.params;

    for (let i = 0; i < count; i++) {
      // Yield each item as it becomes available
      yield {
        id: i + 1,
        data: `Item ${i + 1}`,
        timestamp: new Date().toISOString(),
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### Consuming Streaming Responses

```typescript
import { OlaneClientTool } from '@olane/o-client';
import { oNodeAddress, oNodeTransport } from '@olane/o-node';

// Initialize client
const client = new OlaneClientTool({
  privateKey: 'your-private-key',
});
await client.initialize();

// Create tool address
const toolAddress = new oNodeAddress(
  'o://my-streaming-tool',
  [new oNodeTransport('tcp://localhost:9001')]
);

// Stream data from tool
for await (const chunk of client.useStreaming(toolAddress, {
  method: 'stream_items',
  params: { count: 100 }
})) {
  console.log('Received chunk:', chunk);
  // Process each chunk as it arrives
}

console.log('Streaming complete');
```

## Examples

See `examples/streaming-tool-example.ts` for comprehensive examples including:

1. **Basic streaming** - Stream items one at a time
2. **Text streaming** - Stream text in chunks (LLM-style)
3. **Database streaming** - Stream query results in batches
4. **Progress streaming** - Stream progress updates for long operations
5. **Error handling** - Handle errors during streaming

## Error Handling

Errors during streaming are automatically caught and sent as error chunks:

```typescript
try {
  for await (const chunk of client.useStreaming(address, {
    method: 'stream_data',
    params: { ... }
  })) {
    console.log(chunk);
  }
} catch (error) {
  console.error('Stream error:', error);
}
```

## Performance Considerations

1. **Backpressure**: The implementation respects libp2p's flow control mechanisms
2. **Chunk Size**: Tools should yield reasonably-sized chunks (not too small, not too large)
3. **Memory**: Clients accumulate chunks in memory - consider processing/discarding as you go
4. **Timeouts**: Default timeout is 120 seconds; configurable via `readTimeoutMs`

## Backward Compatibility

- **Non-streaming tools** continue to work exactly as before
- **Existing clients** can still use regular `use()` method for single responses
- **Mixed usage** - A tool can have both streaming and non-streaming methods
- **Protocol detection** - Streaming is detected automatically; no configuration needed

## Testing

To test the streaming implementation:

1. Create a streaming tool (see examples)
2. Start the tool node
3. Connect from a client using `useStreaming()`
4. Verify chunks arrive progressively
5. Test error scenarios

## Limitations

1. **Connection required**: Both client and server must use `oNodeConnection`
2. **Ordered delivery**: Chunks arrive in sequence order
3. **No resume**: If connection drops, stream must restart from beginning
4. **Single consumer**: Each stream is point-to-point (not broadcast)

## Future Enhancements

Potential improvements for future versions:

1. **Stream resumption** - Resume streaming from a checkpoint after disconnect
2. **Broadcast streaming** - Stream to multiple clients simultaneously
3. **Bidirectional streaming** - Client and server both streaming
4. **Stream cancellation** - Abort streaming from client side
5. **Compression** - Compress stream chunks for efficiency

## Files Modified

### Core Implementation
- `packages/o-protocol/src/json-rpc/json-rpc.ts`
- `packages/o-core/src/utils/core.utils.ts`
- `packages/o-core/src/connection/o-response.ts`
- `packages/o-tool/src/o-tool.base.ts`
- `packages/o-node/src/o-node.tool.ts`
- `packages/o-node/src/connection/o-node-connection.ts`

### Client Integration
- `../o-client/src/client.tool.ts`

### Documentation & Examples
- `examples/streaming-tool-example.ts`
- `STREAMING_IMPLEMENTATION.md` (this file)

## Support

For issues or questions about streaming support, please refer to:
- Example code in `examples/streaming-tool-example.ts`
- This implementation document
- The olane repository documentation
