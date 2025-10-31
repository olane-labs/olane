# Response Builder - Unified Response Generation

## Overview

The `ResponseBuilder` class provides a unified, consistent approach to generating responses across all Olane routing paths. It eliminates duplicated error handling logic, provides automatic metrics tracking, and offers an extensible middleware system for response transformation.

## Problem Statement

Before `ResponseBuilder`, response generation was scattered across multiple locations with inconsistent patterns:

- **Duplicated error handling** in `useSelf()`, `handleStream()`, and `executeSelfRouting()`
- **Inconsistent metrics tracking** - only some paths tracked success/error counts
- **Manual response construction** with repeated boilerplate code
- **No standardized streaming support** across different execution contexts
- **Different error formats** across local vs remote execution

## Solution

`ResponseBuilder` centralizes all response generation logic into a single, reusable class with:

1. **Automatic error normalization** - converts any error to `oError` format
2. **Built-in metrics tracking** - tracks success/error counts automatically
3. **Context-aware construction** - handles streaming vs non-streaming responses
4. **Extensible middleware system** - allows response transformation and interception
5. **Type-safe response building** - ensures well-formed responses

---

## Quick Start

### Basic Usage

```typescript
import { ResponseBuilder } from '@olane/o-core';

// Create a builder with metrics tracking
const responseBuilder = ResponseBuilder.create()
  .withMetrics(node.metrics);

// Build a successful response
const response = await responseBuilder.build(request, result, null);

// Build an error response
const errorResponse = await responseBuilder.buildError(request, error);
```

### Streaming Responses

```typescript
// Build a stream chunk
const chunkResponse = await responseBuilder.buildChunk(request, chunkData);

// Build the final chunk
const finalResponse = await responseBuilder.buildFinalChunk(request);
```

### With Automatic Execution

```typescript
// Execute a function and automatically build response based on outcome
const response = await responseBuilder.execute(
  request,
  async () => {
    // Your logic here
    return await someAsyncOperation();
  }
);
```

---

## API Reference

### Core Methods

#### `ResponseBuilder.create()`
Creates a new `ResponseBuilder` instance for method chaining.

```typescript
const builder = ResponseBuilder.create();
```

#### `withMetrics(metrics)`
Configures automatic metrics tracking for success/error counts.

```typescript
const builder = ResponseBuilder.create()
  .withMetrics(node.metrics);
```

**Parameters:**
- `metrics`: Object with `successCount` and `errorCount` properties

#### `withCustomMetrics(tracker)`
Configures a custom metrics tracker implementation.

```typescript
class CustomTracker implements MetricsTracker {
  trackSuccess(context: ResponseContext): void { /* ... */ }
  trackError(context: ResponseContext, error: oError): void { /* ... */ }
}

const builder = ResponseBuilder.create()
  .withCustomMetrics(new CustomTracker());
```

#### `use(middleware)`
Adds a middleware function to intercept and transform responses.

```typescript
const loggingMiddleware: ResponseMiddleware = async (response, context) => {
  console.log('Response:', response);
  return response;
};

const builder = ResponseBuilder.create()
  .use(loggingMiddleware);
```

### Response Building Methods

#### `build(request, result, error?, context?)`
Main method to build a complete response.

```typescript
const response = await builder.build(
  request,
  result,
  error,
  {
    isStream: false,
    isLast: true,
  }
);
```

**Parameters:**
- `request`: The original `oRequest`
- `result`: The result data (or error object)
- `error`: Optional error object (will be normalized to `oError`)
- `context`: Optional `ResponseContext` for additional metadata

**Returns:** `Promise<oResponse>`

#### `buildChunk(request, chunkData, context?)`
Builds a streaming chunk response with `_last: false`.

```typescript
const chunk = await builder.buildChunk(request, chunkData);
```

**Returns:** `Promise<oResponse>` with `_last: false`

#### `buildFinalChunk(request, context?)`
Builds the final chunk in a stream with `_last: true`.

```typescript
const final = await builder.buildFinalChunk(request);
```

**Returns:** `Promise<oResponse>` with `_last: true`

#### `buildError(request, error, context?)`
Builds an error response with normalized error details.

```typescript
const errorResponse = await builder.buildError(request, error);
```

**Returns:** `Promise<oResponse>` with error details

#### `execute(request, executor, context?)`
Executes a function and automatically builds a response based on success or failure.

```typescript
const response = await builder.execute(
  request,
  async () => await tool.execute(),
  { isStream: true }
);
```

**Parameters:**
- `request`: The original `oRequest`
- `executor`: Async function that performs the operation
- `context`: Optional `ResponseContext`

**Returns:** `Promise<oResponse>` (success or error)

### Utility Methods

#### `normalizeError(error)`
Converts any error into an `oError` instance.

```typescript
const normalizedError = builder.normalizeError(new Error('Something failed'));
// Returns: oError with code UNKNOWN and the error message
```

---

## Usage Examples

### Example 1: Local Execution (useSelf)

**Before:**
```typescript
async useSelf(data): Promise<oResponse> {
  const request = new oRequest({...});
  let success = true;
  const result = await this.execute(request).catch((error) => {
    success = false;
    const responseError = error instanceof oError
      ? error
      : new oError(oErrorCodes.UNKNOWN, error.message);
    return { error: responseError.toJSON() };
  });

  if (success) {
    this.metrics.successCount++;
  } else {
    this.metrics.errorCount++;
  }
  return CoreUtils.buildResponse(request, result, result?.error);
}
```

**After:**
```typescript
async useSelf(data): Promise<oResponse> {
  const request = new oRequest({...});
  const responseBuilder = ResponseBuilder.create().withMetrics(this.metrics);

  try {
    const result = await this.execute(request);
    return await responseBuilder.build(request, result, null);
  } catch (error: any) {
    return await responseBuilder.buildError(request, error);
  }
}
```

### Example 2: Streaming Response Generation

**Before:**
```typescript
for await (const result of generator) {
  await CoreUtils.sendStreamResponse(
    new oResponse({
      id: request.id,
      data: result,
      _last: false,
      _requestMethod: request.method,
      _connectionId: request.params?._connectionId,
    }),
    stream,
  );
}
await CoreUtils.sendStreamResponse(
  new oResponse({
    id: request.id,
    _last: true,
    _requestMethod: request.method,
    _connectionId: request.params?._connectionId,
  }),
  stream,
);
```

**After:**
```typescript
const responseBuilder = ResponseBuilder.create();

for await (const result of generator) {
  const chunk = await responseBuilder.buildChunk(request, result);
  await CoreUtils.sendStreamResponse(chunk, stream);
}

const final = await responseBuilder.buildFinalChunk(request);
await CoreUtils.sendStreamResponse(final, stream);
```

### Example 3: Router Self-Routing with Metrics

**Before:**
```typescript
private async executeSelfRouting(request, node): Promise<any> {
  const localRequest = new oRequest({...});
  const result = await node.execute(localRequest);
  return result; // No error handling, no metrics
}
```

**After:**
```typescript
private async executeSelfRouting(request, node): Promise<any> {
  const localRequest = new oRequest({...});
  const responseBuilder = ResponseBuilder.create().withMetrics(node.metrics);

  try {
    const result = await node.execute(localRequest);
    const response = await responseBuilder.build(localRequest, result, null);
    return response.result.data;
  } catch (error: any) {
    await responseBuilder.buildError(localRequest, error); // Tracks metrics
    throw responseBuilder.normalizeError(error);
  }
}
```

### Example 4: Custom Middleware

```typescript
// Add timing middleware
const timingMiddleware: ResponseMiddleware = async (response, context) => {
  response.result.timing = Date.now() - context.startTime;
  return response;
};

// Add validation middleware
const validationMiddleware: ResponseMiddleware = async (response, context) => {
  if (!response.result.data && !response.result.error) {
    throw new Error('Response must have data or error');
  }
  return response;
};

const builder = ResponseBuilder.create()
  .use(timingMiddleware)
  .use(validationMiddleware)
  .withMetrics(node.metrics);
```

---

## Response Context

The `ResponseContext` interface provides metadata about the response being built:

```typescript
interface ResponseContext {
  isStream?: boolean;          // Whether this is a streaming response
  isLast?: boolean;            // Whether this is the last chunk
  success?: boolean;           // Whether the operation was successful
  requestId?: string | number; // Request ID for correlation
  connectionId?: string | number; // Connection ID from request
  requestMethod?: string | number; // Request method for tracking
}
```

This context is passed to middleware functions and can be used for:
- **Logging** - Track which requests succeeded/failed
- **Monitoring** - Measure response times by request type
- **Debugging** - Correlate responses to requests
- **Custom logic** - Conditional response transformation

---

## Metrics Tracking

### Automatic Tracking

When you configure `withMetrics()`, the builder automatically:
1. Increments `successCount` on successful responses
2. Increments `errorCount` on error responses
3. Tracks metrics even when errors are thrown

### Custom Metrics Tracker

Implement the `MetricsTracker` interface for custom tracking:

```typescript
interface MetricsTracker {
  trackSuccess(context: ResponseContext): void;
  trackError(context: ResponseContext, error: oError): void;
}

class DetailedMetricsTracker implements MetricsTracker {
  trackSuccess(context: ResponseContext): void {
    console.log(`✓ Success: ${context.requestMethod}`);
    // Send to monitoring service
  }

  trackError(context: ResponseContext, error: oError): void {
    console.error(`✗ Error ${error.code}: ${context.requestMethod}`);
    // Send to error tracking service
  }
}
```

---

## Migration Guide

### From CoreUtils.buildResponse()

`CoreUtils.buildResponse()` is now **deprecated**. Here's how to migrate:

```typescript
// Old way
const response = CoreUtils.buildResponse(request, result, error);

// New way
const builder = ResponseBuilder.create().withMetrics(node.metrics);
const response = await builder.build(request, result, error);
```

### From Manual Error Handling

```typescript
// Old way
const result = await this.execute(request).catch((error) => {
  const responseError = error instanceof oError
    ? error
    : new oError(oErrorCodes.UNKNOWN, error.message);
  return { error: responseError.toJSON() };
});

// New way
const builder = ResponseBuilder.create();
try {
  const result = await this.execute(request);
  return await builder.build(request, result, null);
} catch (error: any) {
  return await builder.buildError(request, error);
}
```

---

## Architecture

### Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ResponseBuilder                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐                                           │
│  │ Request comes │                                           │
│  │ in with data  │                                           │
│  └───────┬───────┘                                           │
│          │                                                    │
│          ▼                                                    │
│  ┌───────────────────────┐                                   │
│  │ Normalize context     │ ◄─── isStream, isLast, etc.      │
│  │ Extract metadata      │                                   │
│  └───────┬───────────────┘                                   │
│          │                                                    │
│          ▼                                                    │
│  ┌───────────────────────┐                                   │
│  │ Create oResponse      │ ◄─── Build response object       │
│  │ with metadata         │                                   │
│  └───────┬───────────────┘                                   │
│          │                                                    │
│          ▼                                                    │
│  ┌───────────────────────┐                                   │
│  │ Apply middleware      │ ◄─── Transformation pipeline     │
│  │ (if any)              │                                   │
│  └───────┬───────────────┘                                   │
│          │                                                    │
│          ▼                                                    │
│  ┌───────────────────────┐                                   │
│  │ Track metrics         │ ◄─── Increment counters          │
│  │ (if configured)       │                                   │
│  └───────┬───────────────┘                                   │
│          │                                                    │
│          ▼                                                    │
│  ┌───────────────────────┐                                   │
│  │ Return oResponse      │                                   │
│  └───────────────────────┘                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

The `ResponseBuilder` is now integrated into:

1. **[o-core.ts:259](../packages/o-core/src/core/o-core.ts#L259)** - `useSelf()` method
2. **[o-node.tool.ts:56](../packages/o-node/src/o-node.tool.ts#L56)** - `handleStream()` method
3. **[o-node.router.ts:88](../packages/o-node/src/router/o-node.router.ts#L88)** - `executeSelfRouting()` method
4. **[stream.utils.ts:17](../packages/o-node/src/utils/stream.utils.ts#L17)** - `processGenerator()` method
5. **[o-node-connection.ts:109](../packages/o-node/src/connection/o-node-connection.ts#L109)** - Stream completion

---

## Benefits

### 1. Consistency
All response generation follows the same pattern, making the codebase more predictable and maintainable.

### 2. DRY (Don't Repeat Yourself)
Eliminates ~100+ lines of duplicated error handling and response construction code.

### 3. Observability
Comprehensive metrics tracking across all execution paths provides better system visibility.

### 4. Extensibility
Middleware system allows easy addition of:
- Request/response logging
- Performance monitoring
- Custom transformations
- Validation logic

### 5. Type Safety
Centralized validation ensures all responses are well-formed and type-safe.

### 6. Error Handling
Automatic error normalization prevents inconsistent error formats.

---

## Testing

### Unit Testing ResponseBuilder

```typescript
import { ResponseBuilder } from '@olane/o-core';
import { oRequest } from '@olane/o-core';

describe('ResponseBuilder', () => {
  it('should build successful response', async () => {
    const request = new oRequest({ method: 'test', params: {}, id: 1 });
    const builder = ResponseBuilder.create();

    const response = await builder.build(request, { data: 'success' }, null);

    expect(response.result.success).toBe(true);
    expect(response.result.data).toEqual({ data: 'success' });
  });

  it('should track metrics', async () => {
    const metrics = { successCount: 0, errorCount: 0 };
    const request = new oRequest({ method: 'test', params: {}, id: 1 });
    const builder = ResponseBuilder.create().withMetrics(metrics);

    await builder.build(request, { data: 'success' }, null);

    expect(metrics.successCount).toBe(1);
  });
});
```

---

## Future Enhancements

Potential additions to `ResponseBuilder`:

1. **Caching Support** - Cache responses for idempotent requests
2. **Rate Limiting** - Track and limit response generation rate
3. **Response Compression** - Automatic compression for large responses
4. **Schema Validation** - Validate response against expected schema
5. **Async Middleware** - Support for async middleware chains
6. **Response Batching** - Batch multiple responses together

---

## Related Documentation

- [Routing Architecture](./ROUTING_ARCHITECTURE.md)
- [Error Handling](./ERROR_HANDLING.md)
- [Streaming Guide](./STREAMING.md)
- [Metrics & Monitoring](./METRICS.md)

---

## Troubleshooting

### Issue: Metrics not updating

**Problem:** Metrics counts remain at 0 despite responses being generated.

**Solution:** Ensure you call `withMetrics()` when creating the builder:

```typescript
const builder = ResponseBuilder.create().withMetrics(node.metrics);
```

### Issue: TypeScript errors with context types

**Problem:** TypeScript complains about `connectionId` or `requestMethod` types.

**Solution:** The context fields support `string | number` types. Cast if needed:

```typescript
connectionId: request.params._connectionId as string
```

### Issue: Middleware not executing

**Problem:** Middleware functions don't seem to run.

**Solution:** Ensure middleware is added before calling `build()`:

```typescript
const builder = ResponseBuilder.create()
  .use(middleware1)
  .use(middleware2);  // Order matters!

const response = await builder.build(...);
```

---

## Contributing

When extending `ResponseBuilder`:

1. **Maintain backward compatibility** - Don't break existing APIs
2. **Add tests** - Include unit tests for new functionality
3. **Update documentation** - Keep this guide current
4. **Consider middleware** - Could it be a middleware instead of core feature?

---

*Last updated: 2025-10-31*
