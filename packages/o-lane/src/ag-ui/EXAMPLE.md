# AG-UI oLane Example

Complete example showing AG-UI protocol integration with oLane.

## Installation

```bash
npm install @olane/o-lane @olane/o-core
```

## Complete Example

```typescript
import {
  AGUIoLaneTool,
  CallbackAGUITransport,
  AGUIEvent,
} from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// ==================== Setup ====================

// Create a custom transport that logs events
const eventLog: AGUIEvent[] = [];
const transport = new CallbackAGUITransport(async (event: AGUIEvent) => {
  eventLog.push(event);
  console.log(`📨 [${event.type}]`, formatEvent(event));
});

// Create AG-UI enabled agent
const agent = new AGUIoLaneTool({
  address: new oAddress('o://example-agent'),
  description: 'Example AG-UI enabled agent',
  enableAGUI: true,
  debugAGUI: true,
  agUITransport: transport,
  stateSnapshotInterval: 3, // Snapshot every 3 cycles
});

// ==================== Execute Intent ====================

async function main() {
  await agent.start();

  console.log('🚀 Starting AG-UI example...\n');

  const response = await agent.use({
    method: 'ag_ui_intent',
    params: {
      intent: 'Analyze sales data from Q4 and create a summary report',
      threadId: 'example-conversation-001',
      context: 'Previous conversation: User asked about Q3 results.',
    },
  });

  console.log('\n✅ Execution Complete!');
  console.log('Result:', response.result);
  console.log('Cycles:', response.cycles);
  console.log('Thread ID:', response.threadId);
  console.log('Run ID:', response.runId);
  console.log('\n📊 Event Summary:');
  printEventSummary(eventLog);

  await agent.stop();
}

// ==================== Helper Functions ====================

function formatEvent(event: AGUIEvent): string {
  switch (event.type) {
    case 'RunStarted':
      return `runId=${event.runId}, threadId=${event.threadId}`;
    case 'RunFinished':
      return `outcome=${event.outcome}, result=${JSON.stringify(event.result).slice(0, 50)}...`;
    case 'RunError':
      return `message="${event.message}"`;
    case 'StepStarted':
    case 'StepFinished':
      return `step="${event.stepName}"`;
    case 'TextMessageStart':
      return `msgId=${event.messageId}, role=${event.role}`;
    case 'TextMessageContent':
      return `msgId=${event.messageId}, delta="${event.delta.slice(0, 30)}..."`;
    case 'ToolCallStart':
      return `toolId=${event.toolCallId}, name=${event.toolCallName}`;
    case 'ToolCallResult':
      return `toolId=${event.toolCallId}, content=${JSON.stringify(event.content).slice(0, 30)}...`;
    case 'StateSnapshot':
      return `keys: ${Object.keys(event.snapshot as any).join(', ')}`;
    case 'StateDelta':
      return `${event.delta.length} patches`;
    case 'ActivitySnapshot':
      return `${event.activityType}, msgId=${event.messageId}`;
    default:
      return '';
  }
}

function printEventSummary(events: AGUIEvent[]) {
  const counts: Record<string, number> = {};
  events.forEach((e) => {
    counts[e.type] = (counts[e.type] || 0) + 1;
  });

  console.log('Total events:', events.length);
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
}

// Run the example
main().catch(console.error);
```

## Expected Output

```
🚀 Starting AG-UI example...

📨 [RunStarted] runId=run-abc123, threadId=example-conversation-001
📨 [StepStarted] step="unknown"
📨 [StepFinished] step="unknown"
📨 [StepStarted] step="evaluate"
📨 [TextMessageStart] msgId=msg-001, role=assistant
📨 [TextMessageContent] msgId=msg-001, delta="I need to search for the analy..."
📨 [TextMessageEnd] msgId=msg-001
📨 [StepFinished] step="evaluate"
📨 [StateSnapshot] keys: sequence, cycleCount
📨 [StepStarted] step="task"
📨 [ToolCallStart] toolId=tool-001, name=o://analytics
📨 [ToolCallArgs] toolId=tool-001, delta="{"method": "fetch_q4_data"}"
📨 [ToolCallEnd] toolId=tool-001
📨 [ToolCallResult] toolId=tool-001, content={"data": [...]}...
📨 [StepFinished] step="task"
📨 [StateDelta] 2 patches
... (more events)
📨 [RunFinished] outcome=success, result="Summary report created..."

✅ Execution Complete!
Result: Summary report created with key insights...
Cycles: 8
Thread ID: example-conversation-001
Run ID: run-abc123

📊 Event Summary:
Total events: 47
  StepStarted: 8
  StepFinished: 8
  TextMessageContent: 6
  StateSnapshot: 3
  StateDelta: 5
  TextMessageStart: 3
  TextMessageEnd: 3
  ToolCallStart: 2
  ToolCallArgs: 2
  ToolCallEnd: 2
  ToolCallResult: 2
  RunStarted: 1
  RunFinished: 1
```

## Integration with Frontend

### React Example

```typescript
import { useEffect, useState } from 'react';

function AgentExecutionView() {
  const [events, setEvents] = useState<AGUIEvent[]>([]);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'complete'>('idle');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ag-ui');

    ws.onmessage = (message) => {
      const event = JSON.parse(message.data) as AGUIEvent;

      if (event.type === 'RunStarted') {
        setRunStatus('running');
      } else if (event.type === 'RunFinished') {
        setRunStatus('complete');
      }

      setEvents((prev) => [...prev, event]);
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <h2>Agent Execution: {runStatus}</h2>
      <div className="events">
        {events.map((event, i) => (
          <EventCard key={i} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: AGUIEvent }) {
  if (event.type === 'TextMessageContent') {
    return <div className="message">{event.delta}</div>;
  }

  if (event.type === 'ToolCallStart') {
    return <div className="tool-call">🛠️ Calling {event.toolCallName}...</div>;
  }

  if (event.type === 'ActivitySnapshot') {
    return <div className="activity">⚡ {event.activityType}</div>;
  }

  return <div className="event">{event.type}</div>;
}
```

## Testing

Create a test file to verify AG-UI integration:

```typescript
import { describe, it, expect } from '@jest/globals';
import { AGUIoLaneTool, CallbackAGUITransport } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

describe('AG-UI Integration', () => {
  it('should emit AG-UI events during intent execution', async () => {
    const events: any[] = [];
    const transport = new CallbackAGUITransport(async (event) => {
      events.push(event);
    });

    const agent = new AGUIoLaneTool({
      address: new oAddress('o://test-agent'),
      description: 'Test agent',
      agUITransport: transport,
    });

    await agent.start();

    await agent.use({
      method: 'ag_ui_intent',
      params: {
        intent: 'Test task',
        threadId: 'test-thread',
      },
    });

    await agent.stop();

    // Verify events were emitted
    expect(events.length).toBeGreaterThan(0);

    // Verify RunStarted
    const runStarted = events.find((e) => e.type === 'RunStarted');
    expect(runStarted).toBeDefined();
    expect(runStarted.threadId).toBe('test-thread');

    // Verify RunFinished or RunError
    const runComplete = events.find(
      (e) => e.type === 'RunFinished' || e.type === 'RunError',
    );
    expect(runComplete).toBeDefined();
  });
});
```

## Next Steps

1. **Read the full documentation**: [README.md](./README.md)
2. **Explore transports**: Create custom transports for your infrastructure
3. **Build a frontend**: Use AG-UI events to create real-time agent visualizations
4. **Customize event mapping**: Extend `AGUIEventMapper` for domain-specific events

## Resources

- [AG-UI Protocol](https://docs.ag-ui.com/)
- [oLane Documentation](../../README.md)
- [GitHub Issues](https://github.com/olane-labs/olane/issues)
