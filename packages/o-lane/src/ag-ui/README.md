# AG-UI Protocol Support for oLane

**Bring real-time agent execution visualization to your frontends**

This module provides full [AG-UI protocol](https://docs.ag-ui.com/) integration for oLane, enabling real-time event streaming during agentic execution. AG-UI is an open, lightweight, event-based protocol that standardizes how AI agents connect to user-facing applications.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Event Mapping](#event-mapping)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Transports](#transports)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

---

## Overview

The AG-UI adapter maps oLane's capability-based execution loop to AG-UI's standardized event types, enabling frontends to:

- **Track execution in real-time** - See agent reasoning as it happens
- **Visualize tool calls** - Display which tools are being invoked with what arguments
- **Monitor state changes** - Watch the execution sequence evolve
- **Show activity progress** - Display search, configuration, and other activities
- **Handle errors gracefully** - Receive structured error events

### Why AG-UI + oLane?

| Traditional Approach | AG-UI + oLane |
|---------------------|---------------|
| Poll for updates | Real-time event streaming |
| Custom event formats | Standardized AG-UI protocol |
| Limited visibility | Full execution transparency |
| Complex integration | Simple, composable transports |

---

## Features

✅ **Complete Event Coverage** - All 16+ AG-UI event types supported
✅ **Multiple Transports** - oNode streaming, callbacks, console debugging
✅ **State Synchronization** - Snapshots and JSON Patch deltas
✅ **Backwards Compatible** - Drop-in replacement for oLaneTool
✅ **Configurable** - Fine-grained control over event emission
✅ **Type-Safe** - Full TypeScript support

---

## Quick Start

### Installation

The AG-UI module is included with `@olane/o-lane`:

```bash
npm install @olane/o-lane
```

### Basic Usage

```typescript
import { AGUIoLaneTool, ConsoleAGUITransport } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// Create an AG-UI enabled tool
const agent = new AGUIoLaneTool({
  address: new oAddress('o://my-agent'),
  description: 'AG-UI enabled agent',
  enableAGUI: true,
  debugAGUI: true,
  agUITransport: new ConsoleAGUITransport(true), // Debug transport
});

await agent.start();

// Execute intent with AG-UI event streaming
const response = await agent.use({
  method: 'ag_ui_intent', // or just 'intent' if enableAGUI is true
  params: {
    intent: 'Analyze sales data and create a report',
    threadId: 'conversation-123', // Optional: for conversation tracking
  },
});

// Events are streamed as they occur:
// → RunStarted
// → StepStarted("evaluate")
// → TextMessageStart (agent reasoning)
// → TextMessageContent (reasoning text)
// → TextMessageEnd
// → StepFinished("evaluate")
// → StepStarted("task")
// → ToolCallStart (tool invocation)
// → ToolCallArgs (tool parameters)
// → ToolCallEnd
// → ToolCallResult (tool output)
// → StepFinished("task")
// → StateSnapshot (execution state)
// → ... (more cycles)
// → RunFinished
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AGUIoLaneTool                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              oLane Execution Loop                     │  │
│  │  Capability → Capability → Capability → STOP         │  │
│  └────────────────┬──────────────────────────────────────┘  │
│                   │                                          │
│                   ▼                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           AGUIEventMapper                             │  │
│  │  • Maps oLane capabilities → AG-UI events            │  │
│  │  • Generates IDs and timestamps                       │  │
│  │  • Creates state deltas (JSON Patch)                  │  │
│  └────────────────┬──────────────────────────────────────┘  │
│                   │                                          │
│                   ▼                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         AGUIStreamManager                             │  │
│  │  • Event validation and filtering                     │  │
│  │  • Queue management                                    │  │
│  │  • Batch emission                                      │  │
│  └────────────────┬──────────────────────────────────────┘  │
│                   │                                          │
│                   ▼                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           AGUITransport                               │  │
│  │  • ONodeTransport (oNode streaming)                   │  │
│  │  • CallbackTransport (custom handlers)                │  │
│  │  • ConsoleTransport (debugging)                       │  │
│  └────────────────┬──────────────────────────────────────┘  │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
              Frontend UI
```

---

## Event Mapping

### oLane → AG-UI Event Mapping

| oLane Event | AG-UI Events | Description |
|-------------|--------------|-------------|
| Lane created | `RunStarted` | Execution begins with thread and run IDs |
| Lane preflight | `StepStarted` → `StepFinished` | Preparation phase |
| **EVALUATE capability** | `TextMessageStart` → `TextMessageContent` → `TextMessageEnd` | Agent reasoning (assistant messages) |
| **TASK capability** | `ToolCallStart` → `ToolCallArgs` → `ToolCallEnd` → `ToolCallResult` | External tool invocation |
| **SEARCH capability** | `ActivitySnapshot` | Search activity with query and results |
| **CONFIGURE capability** | `ActivitySnapshot` | Configuration activity |
| **MULTIPLE_STEP** | `ActivitySnapshot` | Multi-step plan progress |
| **ERROR capability** | `ActivitySnapshot` + error details | Error handling activity |
| Sequence update | `StateSnapshot` or `StateDelta` | Full state or incremental patch |
| Lane completed | `RunFinished` | Successful completion with result |
| Lane error | `RunError` | Error occurred during execution |
| Streaming chunk | `ActivitySnapshot` | Real-time progress update |

### Event Flow Example

```
Intent: "Analyze Q4 sales data"
         ↓
RunStarted (runId: run-abc123, threadId: thread-xyz)
         ↓
StepStarted (stepName: "evaluate")
         ↓
TextMessageStart (messageId: msg-001, role: "assistant")
TextMessageContent (delta: "I need to search for the analytics tool...")
TextMessageEnd (messageId: msg-001)
         ↓
StepFinished (stepName: "evaluate")
         ↓
StepStarted (stepName: "task")
         ↓
ToolCallStart (toolCallId: tool-001, toolCallName: "o://analytics")
ToolCallArgs (delta: '{"method": "fetch_q4_data"}')
ToolCallEnd (toolCallId: tool-001)
ToolCallResult (toolCallId: tool-001, content: { data: [...] })
         ↓
StepFinished (stepName: "task")
         ↓
StateSnapshot (snapshot: { sequence: [...], cycleCount: 2 })
         ↓
... (more cycles)
         ↓
RunFinished (result: "Analysis complete...")
```

---

## API Reference

### AGUIoLaneTool

The main class for AG-UI enabled intent resolution.

#### Constructor

```typescript
new AGUIoLaneTool(config: AGUIoLaneConfig)
```

**Config Options:**
- `address: oAddress` - Tool address (required)
- `description: string` - Tool description (required)
- `enableAGUI: boolean` - Enable AG-UI events (default: true)
- `debugAGUI: boolean` - Enable debug logging (default: false)
- `agUITransport: AGUITransport` - Event transport (default: console)
- `eventFilter: string[]` - Filter event types (default: all)
- `stateSnapshotInterval: number` - Snapshot every N cycles (default: 5)
- `maxDeltaHistory: number` - Max delta history (default: 100)

#### Methods

**`async _tool_ag_ui_intent(request: oStreamRequest): Promise<any>`**

Execute an intent with AG-UI event streaming.

```typescript
await agent.use({
  method: 'ag_ui_intent',
  params: {
    intent: 'Your natural language goal',
    context: 'Optional conversation history',
    threadId: 'Optional thread ID',
  }
});
```

**`setAGUIEnabled(enabled: boolean): void`**

Enable or disable AG-UI at runtime.

**`isAGUIEnabled(): boolean`**

Check if AG-UI is currently enabled.

**`getAGUIConfig(): AGUIoLaneConfig`**

Get current AG-UI configuration.

---

### AGUIEventMapper

Maps oLane events to AG-UI events.

```typescript
import { AGUIEventMapper } from '@olane/o-lane';

const mapper = new AGUIEventMapper(context, config);

// Map lane start
const runStarted = mapper.mapLaneStartToRunStarted(intent, input);

// Map capability to events
const events = mapper.mapCapabilityToEvents(capabilityResult, cycleNumber);

// Map sequence to state
const stateSnapshot = mapper.mapSequenceToStateSnapshot(sequence);
const stateDelta = mapper.mapSequenceToStateDelta(oldSeq, newSeq);
```

---

### AGUIStreamManager

Manages event emission with validation and queuing.

```typescript
import { AGUIStreamManager } from '@olane/o-lane';

const streamManager = new AGUIStreamManager({
  transport,
  debug: true,
  eventFilter: ['RunStarted', 'RunFinished'], // Optional filter
  validateEvents: true,
});

// Emit single event
await streamManager.emit(event);

// Emit batch
await streamManager.emitBatch([event1, event2, event3]);

// Queue for later
streamManager.queueEvent(event);
await streamManager.flushQueue();

// Close
await streamManager.close();
```

---

### Transports

#### ONodeAGUITransport

Uses oNode's existing streaming infrastructure.

```typescript
import { ONodeAGUITransport } from '@olane/o-lane';

const transport = new ONodeAGUITransport({
  stream: request.stream,
  node: this,
  requestId: request.id,
  streamTo: new oAddress('o://receiver'),
});
```

#### CallbackAGUITransport

Simple callback-based transport for custom integrations.

```typescript
import { CallbackAGUITransport } from '@olane/o-lane';

const transport = new CallbackAGUITransport(async (event) => {
  console.log('Event:', event);
  // Send to WebSocket, SSE, database, etc.
});
```

#### ConsoleAGUITransport

Console-based transport for debugging.

```typescript
import { ConsoleAGUITransport } from '@olane/o-lane';

const transport = new ConsoleAGUITransport(true); // verbose mode
```

---

## Examples

### Example 1: Basic AG-UI Intent

```typescript
import { AGUIoLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

const agent = new AGUIoLaneTool({
  address: new oAddress('o://assistant'),
  description: 'General purpose assistant',
  enableAGUI: true,
});

await agent.start();

const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Find customer data and create summary',
    threadId: 'conversation-456',
  },
});

console.log('Result:', response.result);
console.log('Cycles:', response.cycles);
console.log('Thread:', response.threadId);
console.log('Run:', response.runId);
```

### Example 2: Custom Transport with WebSocket

```typescript
import { AGUIoLaneTool, CallbackAGUITransport } from '@olane/o-lane';
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

const transport = new CallbackAGUITransport(async (event) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
});

const agent = new AGUIoLaneTool({
  address: new oAddress('o://ws-agent'),
  description: 'WebSocket streaming agent',
  agUITransport: transport,
});

await agent.start();
```

### Example 3: Event Filtering

```typescript
import { AGUIoLaneTool } from '@olane/o-lane';

// Only emit lifecycle events
const agent = new AGUIoLaneTool({
  address: new oAddress('o://filtered-agent'),
  description: 'Agent with filtered events',
  eventFilter: [
    'RunStarted',
    'RunFinished',
    'RunError',
    'StepStarted',
    'StepFinished',
  ],
});
```

### Example 4: State Snapshots Only

```typescript
import { AGUIoLaneTool } from '@olane/o-lane';

// Emit full snapshots, no deltas
const agent = new AGUIoLaneTool({
  address: new oAddress('o://snapshot-agent'),
  description: 'Snapshot-only agent',
  stateSnapshotInterval: 1, // Snapshot every cycle
});
```

### Example 5: Receiving Events in Another Tool

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oRequest } from '@olane/o-core';

class EventReceiver extends oLaneTool {
  private events: any[] = [];

  async _tool_receive_ag_ui_event(request: oRequest): Promise<any> {
    const { event } = request.params;

    this.events.push(event);
    this.logger.info(`Received ${event.type} event`);

    // Process event
    if (event.type === 'RunFinished') {
      this.logger.info('Run completed!', event.result);
    }

    return { received: true, totalEvents: this.events.length };
  }
}
```

---

## Configuration

### Full Configuration Example

```typescript
const agent = new AGUIoLaneTool({
  // Required oNode config
  address: new oAddress('o://my-agent'),
  description: 'My AG-UI agent',

  // AG-UI specific config
  enableAGUI: true,
  debugAGUI: false,
  agUITransport: myCustomTransport,
  eventFilter: undefined, // All events
  stateSnapshotInterval: 5, // Snapshot every 5 cycles
  maxDeltaHistory: 100, // Keep 100 deltas

  // Standard oLane config
  capabilities: [...customCapabilities],
  maxCycles: 20,
});
```

---

## Best Practices

### 1. Choose the Right Transport

- **Development/Testing**: Use `ConsoleAGUITransport`
- **Production with oNode**: Use `ONodeAGUITransport`
- **Custom Integrations**: Use `CallbackAGUITransport`

### 2. Filter Events Appropriately

For bandwidth-constrained environments:

```typescript
eventFilter: [
  'RunStarted',
  'RunFinished',
  'RunError',
  'ToolCallResult', // Only show final tool results
  'StateSnapshot', // Only show state snapshots
]
```

### 3. Balance Snapshots vs Deltas

- **More snapshots**: Easier to debug, larger bandwidth
- **More deltas**: Efficient, requires frontend reconstruction

Recommended: `stateSnapshotInterval: 5` (every 5 cycles)

### 4. Handle Errors Gracefully

```typescript
try {
  const response = await agent.use({
    method: 'ag_ui_intent',
    params: { intent: 'Complex task' },
  });
} catch (error) {
  // RunError event will have been emitted
  console.error('Execution failed:', error);
}
```

### 5. Use Thread IDs for Conversations

```typescript
// Maintain conversation continuity
const threadId = user.conversationId;

await agent.use({
  method: 'ag_ui_intent',
  params: {
    intent: 'Next question...',
    threadId, // Same thread ID for the conversation
    context: previousMessages,
  },
});
```

---

## Troubleshooting

### Events Not Appearing

**Check:**
1. Is `enableAGUI: true`?
2. Is the transport active? (`transport.isActive()`)
3. Are events filtered? Check `eventFilter` config
4. Is the stream closed prematurely?

### Too Many Events

**Solution:** Use event filtering and increase snapshot interval

```typescript
eventFilter: ['RunStarted', 'RunFinished', 'StateSnapshot'],
stateSnapshotInterval: 10,
```

### Events Out of Order

**Cause:** Async event emission

**Solution:** Events are emitted sequentially within `AGUIStreamManager`, but external handlers may process them asynchronously. Use event IDs and timestamps for ordering.

---

## Resources

- [AG-UI Protocol Documentation](https://docs.ag-ui.com/)
- [AG-UI GitHub Repository](https://github.com/ag-ui-protocol/ag-ui)
- [oLane Documentation](../../README.md)
- [Olane OS Documentation](https://olane.com/docs)

---

## License

ISC © oLane Inc.

Part of the **@olane/o-lane** package.
