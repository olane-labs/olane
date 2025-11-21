# Chunk Mapping Review & Improvements

## Summary

Reviewed the oLane capability result outputs and enhanced the AG-UI chunk mapping to provide comprehensive, capability-aware event emission.

## What Was Reviewed

### 1. oLane Execution Flow

Examined `src/o-lane.ts` to understand where and how chunks are emitted:

```typescript
// Line 362-378 in o-lane.ts
const result = await this.doCapability(currentStep);
this.addSequence(result);  // ← Adds to sequence

await this.emitNonFinalChunk(result, {  // ← Emits chunk
  data: {
    ...result,
    config: undefined,
  },
});
```

**Key Finding:** Every capability result is emitted via `emitNonFinalChunk`, which calls the `onChunk` callback with a wrapped oResponse containing the capability result.

### 2. Capability Result Structure

Reviewed `src/capabilities/o-capability.result.ts`:

```typescript
{
  id: string,
  result: any,              // Capability-specific data
  humanResult: any,         // Human-readable result
  type: oCapabilityType,    // EVALUATE, TASK, SEARCH, etc.
  error?: string,
  shouldPersist?: boolean
}
```

### 3. Event Emission Points

Identified two places where AG-UI events are emitted:

1. **addSequence override** (in `ag-ui-olane.tool.ts`)
   - Emits full AG-UI protocol events
   - StepStarted → Capability events → State updates → StepFinished

2. **onChunk callback** (in `ag-ui-olane.tool.ts`)
   - Emits ActivitySnapshot for progress updates
   - Called AFTER addSequence completes

## What Was Improved

### 1. Enhanced mapChunkToActivity Method

**Before:**
```typescript
mapChunkToActivity(chunk: any, cycleNumber: number): ActivitySnapshot {
  // Generic mapping - treated all chunks the same
  return {
    type: 'ActivitySnapshot',
    activityType: ACTIVITY_TYPES.PROGRESS,
    content: { cycle: cycleNumber, data: chunk },
  };
}
```

**After:**
```typescript
mapChunkToActivity(chunk: any, cycleNumber: number): ActivitySnapshot {
  // Extract capability result from oResponse wrapper
  const capabilityData = chunk.data || chunk;
  const capabilityType = capabilityData.type;
  const result = capabilityData.result;
  const error = capabilityData.error;

  // Map based on capability type
  switch (capabilityType) {
    case oCapabilityType.EVALUATE:
      return {
        activityType: ACTIVITY_TYPES.EVALUATE,
        content: {
          cycle: cycleNumber,
          reasoning: result?.reasoning || result?.summary,
          status: error ? 'error' : 'evaluating',
        }
      };

    case oCapabilityType.TASK:
      return {
        activityType: ACTIVITY_TYPES.EXECUTE,
        content: {
          cycle: cycleNumber,
          task: result?.task?.address,
          status: error ? 'error' : 'executing',
          result: result,
        }
      };

    // ... cases for SEARCH, CONFIGURE, ERROR, MULTIPLE_STEP, STOP
  }
}
```

### 2. Capability-Specific Activity Types

Now each capability type maps to an appropriate activity type:

| Capability | Activity Type | Content |
|------------|--------------|---------|
| EVALUATE | `EVALUATE` | reasoning, status |
| TASK | `EXECUTE` | task address, result |
| SEARCH | `SEARCH` | query, results |
| CONFIGURE | `CONFIGURE` | configuration |
| ERROR | `ERROR` | error, recovery |
| MULTIPLE_STEP | `PLAN` | steps, currentStep |
| STOP | `EXECUTE` | final result |

### 3. Error Handling in onChunk

Added proper error handling to prevent chunk mapping failures:

```typescript
onChunk: async (chunk: any) => {
  try {
    const activityEvent = eventMapper.mapChunkToActivity(chunk, cycleNumber);
    await streamManager.emit(activityEvent);
  } catch (error) {
    this.logger.error('Error mapping chunk to activity:', error);
  }
}
```

### 4. Documentation

Created `CHUNK-MAPPING.md` with:
- Complete chunk structure reference
- Capability type mapping details
- Event timing diagrams
- Frontend integration examples
- Troubleshooting guide

## Event Flow Validation

### Complete Event Sequence

For each capability execution:

```
1. Capability executes
2. Result returned
3. addSequence(result) ← Emits full AG-UI events
   ├─ StepStarted
   ├─ TextMessage/ToolCall/Activity events
   ├─ State updates
   └─ StepFinished
4. emitNonFinalChunk(result) ← Emits progress update
   └─ onChunk callback
       └─ ActivitySnapshot (capability-specific)
```

### Example: EVALUATE Capability

**Chunk received by onChunk:**
```typescript
{
  data: {
    id: "cap-123",
    type: "evaluate",
    result: {
      reasoning: "Need to search for analytics tool",
      summary: "Searching for tool",
      next: "search"
    },
    humanResult: "I need to find the analytics tool..."
  },
  _last: false,
  _isStreaming: true
}
```

**AG-UI Events Emitted:**

**From addSequence:**
1. `StepStarted` - stepName: "evaluate"
2. `TextMessageStart` - messageId: "msg-001", role: "assistant"
3. `TextMessageContent` - delta: "Need to search for analytics tool"
4. `TextMessageEnd` - messageId: "msg-001"
5. `StateSnapshot` or `StateDelta`
6. `StepFinished` - stepName: "evaluate"

**From onChunk:**
7. `ActivitySnapshot` - activityType: "EVALUATE"
   ```typescript
   {
     cycle: 1,
     reasoning: "Need to search for analytics tool",
     status: "evaluating"
   }
   ```

## Benefits of Improvements

### 1. Capability-Aware Progress Updates

Frontends can now distinguish between different types of work:
- "Thinking..." (EVALUATE)
- "Executing tool..." (TASK)
- "Searching..." (SEARCH)
- "Configuring..." (CONFIGURE)

### 2. Richer Activity Content

Activity events now include capability-specific details:
- EVALUATE: reasoning text
- TASK: tool address and result
- SEARCH: query and results
- ERROR: error and recovery information

### 3. Better Error Visibility

Error status is consistently included in activity content, making it easy to show error states in UIs.

### 4. Complementary Event Streams

Two event streams serve different purposes:
- **Detailed events** (addSequence): Full AG-UI protocol compliance
- **Activity events** (onChunk): Simple progress indicators

## Testing Recommendations

### 1. Test Each Capability Type

```typescript
// Test EVALUATE
await agent.use({
  method: 'ag_ui_intent',
  params: { intent: 'Think about this problem' }
});
// Verify: ActivitySnapshot with activityType: 'EVALUATE'

// Test TASK
await agent.use({
  method: 'ag_ui_intent',
  params: { intent: 'Execute a specific tool' }
});
// Verify: ActivitySnapshot with activityType: 'EXECUTE'

// etc.
```

### 2. Test Error Conditions

```typescript
// Trigger error capability
await agent.use({
  method: 'ag_ui_intent',
  params: { intent: 'Task that will fail' }
});
// Verify: ActivitySnapshot with activityType: 'ERROR', status: 'error'
```

### 3. Verify Event Ordering

Confirm that:
1. StepStarted comes before TextMessage/ToolCall
2. ActivitySnapshot comes after StepFinished
3. State updates occur between cycles

## Frontend Integration Example

```typescript
function ActivityIndicator({ event }: { event: ActivitySnapshot }) {
  const { activityType, content } = event;

  switch (activityType) {
    case 'EVALUATE':
      return (
        <div className="activity">
          <Spinner />
          <span>Thinking: {content.reasoning}</span>
        </div>
      );

    case 'EXECUTE':
      return (
        <div className="activity">
          <Icon name="tool" />
          <span>Running {content.task}...</span>
        </div>
      );

    case 'SEARCH':
      return (
        <div className="activity">
          <Icon name="search" />
          <span>Searching: {content.query}</span>
        </div>
      );

    case 'ERROR':
      return (
        <div className="activity error">
          <Icon name="error" />
          <span>Error: {content.error}</span>
          {content.recovery && <span>Trying: {content.recovery}</span>}
        </div>
      );

    default:
      return (
        <div className="activity">
          <Spinner />
          <span>Processing...</span>
        </div>
      );
  }
}
```

## Build Status

✅ TypeScript compilation successful
✅ All imports resolved
✅ No type errors
✅ Ready for use

## Files Modified

1. `src/ag-ui/ag-ui-event-mapper.ts`
   - Enhanced `mapChunkToActivity` method (120+ lines)
   - Added capability-specific mapping logic
   - Improved error handling

2. `src/ag-ui/ag-ui-olane.tool.ts`
   - Added error handling in onChunk callback
   - Added clarifying comments

## Files Created

1. `src/ag-ui/CHUNK-MAPPING.md` (600+ lines)
   - Complete chunk mapping reference
   - Event flow diagrams
   - Frontend integration examples

2. `src/ag-ui/CHUNK-REVIEW.md` (this file)

## Conclusion

The chunk mapping has been thoroughly reviewed and enhanced to provide comprehensive, capability-aware AG-UI event emission. All capability result types are now properly mapped to appropriate activity events with rich, type-specific content.

**Total Enhancement:** 120+ lines of improved mapping logic + 600+ lines of documentation

**Key Improvement:** Generic progress events → Capability-specific activity events with detailed context
