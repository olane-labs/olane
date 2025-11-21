# AG-UI Chunk Mapping Reference

This document explains how oLane capability results are mapped to AG-UI events through the chunk streaming mechanism.

## Overview

When oLane executes capabilities in its loop, each capability result is emitted as a "chunk" through the `onChunk` callback. The AG-UI adapter intercepts these chunks and maps them to appropriate AG-UI protocol events.

## Chunk Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    oLane Execution Loop                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
         Capability Executes
                 │
                 ▼
         ┌───────────────┐
         │ Capability    │
         │ Result        │
         │ Returned      │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
  addSequence(result)  emitNonFinalChunk(result)
        │                 │
        │                 ▼
        │            onChunk callback
        │                 │
        ▼                 ▼
   [AG-UI Events]    [Activity Event]
   • StepStarted
   • TextMessage/
     ToolCall/etc
   • State Updates
   • StepFinished
```

## Chunk Structure

Chunks emitted from `emitNonFinalChunk` have the following structure:

```typescript
{
  data: {
    id: string,              // Capability result ID
    result: any,             // Capability-specific result
    humanResult: any,        // Human-readable result
    type: oCapabilityType,   // EVALUATE, TASK, SEARCH, etc.
    error?: string,          // Error message if failed
    shouldPersist?: boolean  // Persistence flag
  },
  _last: false,              // Always false for non-final chunks
  _isStreaming: true,        // Indicates streaming mode
  _connectionId: string,     // Node address
  _requestMethod: string,    // Request method
  id: string | number        // Request ID
}
```

## Capability Type Mapping

### 1. EVALUATE Capability

**Purpose:** Agent reasoning and decision-making

**Chunk Result Structure:**
```typescript
{
  type: "evaluate",
  result: {
    reasoning: string,    // Agent's reasoning
    summary: string,      // Summary of evaluation
    next: string          // Next capability type
  },
  humanResult: string     // Human-readable reasoning
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- `TextMessageStart` - Begins assistant message
- `TextMessageContent` - Reasoning text (chunked)
- `TextMessageEnd` - Completes message

**From onChunk:**
- `ActivitySnapshot` - Activity type: "EVALUATE"
  ```typescript
  {
    cycle: number,
    reasoning: string,
    status: "evaluating" | "error"
  }
  ```

---

### 2. TASK Capability

**Purpose:** Execute external tool/method

**Chunk Result Structure:**
```typescript
{
  type: "task",
  result: {
    task: {
      address: string,    // Tool address
      payload: any        // Tool parameters
    }
  },
  humanResult: any,       // Tool execution result
  error?: string
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- `ToolCallStart` - Tool invocation begins
- `ToolCallArgs` - Tool parameters
- `ToolCallEnd` - Tool execution complete
- `ToolCallResult` - Tool output

**From onChunk:**
- `ActivitySnapshot` - Activity type: "EXECUTE"
  ```typescript
  {
    cycle: number,
    task: string,         // Tool address
    status: "executing" | "error",
    result: any           // Tool result
  }
  ```

---

### 3. SEARCH Capability

**Purpose:** Search for tools, data, or information

**Chunk Result Structure:**
```typescript
{
  type: "search",
  result: {
    query: string,
    results: any[]
  }
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- `ActivitySnapshot` - Activity type: "SEARCH"
  ```typescript
  {
    cycle: number,
    query: string,
    results: any[]
  }
  ```

**From onChunk:**
- `ActivitySnapshot` - Activity type: "SEARCH"
  ```typescript
  {
    cycle: number,
    query: string,
    results: any[],
    status: "searching" | "error"
  }
  ```

---

### 4. CONFIGURE Capability

**Purpose:** Configure tools or system settings

**Chunk Result Structure:**
```typescript
{
  type: "configure",
  result: {
    // Configuration details
  }
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- `ActivitySnapshot` - Activity type: "CONFIGURE"

**From onChunk:**
- `ActivitySnapshot` - Activity type: "CONFIGURE"
  ```typescript
  {
    cycle: number,
    configuration: any,
    status: "configuring" | "error"
  }
  ```

---

### 5. MULTIPLE_STEP Capability

**Purpose:** Execute multi-step plans

**Chunk Result Structure:**
```typescript
{
  type: "multiple_step",
  result: {
    steps: string[],
    currentStep: number
  }
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- `ActivitySnapshot` - Activity type: "PLAN"

**From onChunk:**
- `ActivitySnapshot` - Activity type: "PLAN"
  ```typescript
  {
    cycle: number,
    steps: string[],
    currentStep: number,
    status: "planning" | "error"
  }
  ```

---

### 6. ERROR Capability

**Purpose:** Handle and recover from errors

**Chunk Result Structure:**
```typescript
{
  type: "error",
  error: string,
  result: {
    recovery: string,
    message: string
  }
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- `ActivitySnapshot` - Activity type: "ERROR"

**From onChunk:**
- `ActivitySnapshot` - Activity type: "ERROR"
  ```typescript
  {
    cycle: number,
    error: string,
    recovery: string,
    status: "error"
  }
  ```

---

### 7. STOP Capability

**Purpose:** Indicate completion

**Chunk Result Structure:**
```typescript
{
  type: "stop",
  result: any,           // Final result
  humanResult: string    // Human-readable result
}
```

**AG-UI Events Emitted:**

**From addSequence:**
- (No specific events, handled by RunFinished)

**From onChunk:**
- `ActivitySnapshot` - Activity type: "EXECUTE"
  ```typescript
  {
    cycle: number,
    status: "completed",
    result: any
  }
  ```

---

## Event Timing

### Timeline for a Single Capability

```
Time →

0ms    Capability begins execution
       │
100ms  Capability completes
       │
       ├─ addSequence(result) called
       │   ├─ StepStarted emitted
       │   ├─ Capability-specific events emitted
       │   │   (TextMessage for EVALUATE, ToolCall for TASK, etc.)
       │   ├─ State updates emitted
       │   └─ StepFinished emitted
       │
       └─ emitNonFinalChunk(result) called
           └─ onChunk callback triggered
               └─ ActivitySnapshot emitted
```

**Key Points:**
1. Full capability events are emitted FIRST via `addSequence`
2. Activity snapshot is emitted AFTER via `onChunk`
3. Activity snapshot provides complementary progress information
4. Activity snapshot is simpler and easier for UIs to display

## Complete Execution Example

**Intent:** "Analyze sales data"

**Event Sequence:**

```
1. RunStarted
   ├─ runId: run-abc123
   ├─ threadId: thread-xyz
   └─ input: { intent: "Analyze sales data" }

2. StepStarted (preflight)
3. StepFinished (preflight)

4. StepStarted (evaluate)
5. TextMessageStart
   └─ messageId: msg-001, role: "assistant"
6. TextMessageContent
   └─ delta: "I need to search for the analytics tool..."
7. TextMessageEnd
   └─ messageId: msg-001
8. StateSnapshot
   └─ sequence: [{ type: "evaluate", ... }], cycleCount: 1
9. StepFinished (evaluate)
10. ActivitySnapshot (EVALUATE) ← from onChunk
    └─ { cycle: 1, reasoning: "...", status: "evaluating" }

11. StepStarted (task)
12. ToolCallStart
    └─ toolCallId: tool-001, toolCallName: "o://analytics"
13. ToolCallArgs
    └─ delta: '{"method": "fetch_data"}'
14. ToolCallEnd
15. ToolCallResult
    └─ content: { data: [...] }
16. StateDelta
    └─ [{ op: "add", path: "/sequence/-", value: {...} }]
17. StepFinished (task)
18. ActivitySnapshot (EXECUTE) ← from onChunk
    └─ { cycle: 2, task: "o://analytics", status: "executing", result: {...} }

19. (more cycles...)

20. RunFinished
    └─ result: "Analysis complete", outcome: "success"
```

## Frontend Integration

### Displaying Activity Events

Activity events from `onChunk` provide simple, real-time progress updates:

```typescript
function ActivityIndicator({ event }: { event: ActivitySnapshot }) {
  const { activityType, content } = event;

  switch (activityType) {
    case 'EVALUATE':
      return <div>🤔 Thinking: {content.reasoning}</div>;

    case 'EXECUTE':
      return <div>⚡ Executing: {content.task}</div>;

    case 'SEARCH':
      return <div>🔍 Searching: {content.query}</div>;

    case 'ERROR':
      return <div>❌ Error: {content.error}</div>;

    default:
      return <div>⏳ Processing...</div>;
  }
}
```

### Using Full Capability Events

For detailed information, use the structured events from `addSequence`:

```typescript
function DetailedExecutionView({ events }: { events: AGUIEvent[] }) {
  return events.map((event, i) => {
    if (event.type === 'TextMessageContent') {
      return <Message key={i} content={event.delta} />;
    }

    if (event.type === 'ToolCallStart') {
      return <ToolInvocation key={i} name={event.toolCallName} />;
    }

    if (event.type === 'StateSnapshot') {
      return <ExecutionState key={i} state={event.snapshot} />;
    }

    return null;
  });
}
```

## Configuration

### Disable Activity Events

If you only want structured events without activity snapshots:

```typescript
const agent = new AGUIoLaneTool({
  address: new oAddress('o://my-agent'),
  debugAGUI: false,  // Disables some activity events
  eventFilter: [     // Filter out activity events entirely
    'RunStarted',
    'RunFinished',
    'StepStarted',
    'StepFinished',
    'TextMessageStart',
    'TextMessageContent',
    'TextMessageEnd',
    'ToolCallStart',
    'ToolCallArgs',
    'ToolCallEnd',
    'ToolCallResult',
    'StateSnapshot',
    'StateDelta',
  ],
});
```

### Enable All Events

For maximum visibility (useful during development):

```typescript
const agent = new AGUIoLaneTool({
  address: new oAddress('o://my-agent'),
  debugAGUI: true,      // Enables all activity events
  eventFilter: undefined, // No filtering
});
```

## Troubleshooting

### Activity Events Not Appearing

**Cause:** `onChunk` is only called when `useStream: true`

**Solution:** Ensure streaming is enabled:
```typescript
await agent.use({
  method: 'ag_ui_intent',
  params: {
    intent: 'Your goal',
    _isStreaming: true,  // Enable streaming
  },
});
```

### Duplicate Events

**Cause:** Both `addSequence` and `onChunk` emit events

**Explanation:** This is intentional - they provide different perspectives:
- `addSequence` → Detailed, structured events
- `onChunk` → Simple progress updates

**Solution:** Filter events based on your needs or ignore one set.

### Missing Capability Type

**Cause:** Unknown capability type in chunk

**Solution:** The mapper handles unknown types gracefully with generic "PROGRESS" activity.

## Summary

- **Chunks** are emitted after each capability execution
- **Two event sources**: `addSequence` (detailed) and `onChunk` (progress)
- **Activity events** from `onChunk` provide simple, complementary updates
- **Full events** from `addSequence` provide complete AG-UI protocol compliance
- Both are useful for different UI patterns
