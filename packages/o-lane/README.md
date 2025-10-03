# @olane/o-lane

> Agentic process management for Olane OS - transform intents into intelligent, self-organizing workflows

The execution layer that manages AI agent processes through capability-based loops, turning natural language intents into coordinated multi-step actions without explicit orchestration.

[![npm version](https://img.shields.io/npm/v/@olane/o-lane.svg)](https://www.npmjs.com/package/@olane/o-lane)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- 🔄 **Intent-Driven Execution** - Transform natural language goals into agent workflows
- 🧠 **Capability-Based Loop** - Evaluate-plan-execute cycle for emergent behavior
- 📊 **Execution Tracking** - Complete sequence history with cycle-by-cycle audit trails
- 🌊 **Streaming Support** - Real-time progress updates to calling agents
- 💾 **Persistent State** - Content-addressed storage of lane execution history
- 🎯 **Pre-built Capabilities** - Evaluate, Task, Search, Configure, Error handling included

## Installation

```bash
npm install @olane/o-lane
```

## Quick Start

### Creating a Lane-Enabled Tool

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

class MyAgentTool extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://my-agent'),
      description: 'My intelligent agent tool'
    });
  }

  // Add custom tool methods
  async _tool_analyze(request: oRequest): Promise<any> {
    return { analysis: 'Data analyzed successfully' };
  }
}

// Start your agent
const agent = new MyAgentTool();
await agent.start();
```

### Executing an Intent

```typescript
// Agent receives an intent and autonomously determines how to execute it
const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Analyze the sales data and create a summary report',
    context: 'Previous conversation context here...',
    streamTo: 'o://user/session'
  }
});

console.log(response.result);
// {
//   result: "Analysis complete. Created summary report with key insights...",
//   cycles: 5,
//   sequence: [
//     { type: 'EVALUATE', reasoning: '...' },
//     { type: 'TASK', result: '...' },
//     { type: 'SEARCH', result: '...' },
//     { type: 'TASK', result: '...' },
//     { type: 'STOP', result: '...' }
//   ]
// }
```

### Expected Output

After executing an intent, you'll receive:
- ✅ **Final result** - The outcome of the intent execution
- ✅ **Cycle count** - Number of capability cycles executed
- ✅ **Execution sequence** - Step-by-step breakdown of what the agent did
- ✅ **Reasoning traces** - Why the agent made each decision

### Next Steps

- [Understand what lanes are](#what-is-o-lane)
- [Learn about capabilities](#built-in-capabilities)
- [Create custom capabilities](#custom-capabilities)
- [Implement streaming](#streaming-integration)

## What is o-lane?

### The Agent Process Manager

Think of `o-lane` as the **process manager for tool nodes (applications)** in Olane OS. It enables your tool nodes to accept natural language intents from AI agents (LLMs) and autonomously resolve them through emergent workflows.

**Key Concept**: 
- **AI Agents (Users)**: GPT-4, Claude, etc. - the intelligent users who send intents
- **Tool Nodes (Applications)**: What you build with o-lane - specialized capabilities that process intents
- **o-lane**: The runtime that enables tool nodes to execute intent-driven workflows

**Key Innovation: Emergent vs Explicit Orchestration**

| Traditional Frameworks (LangGraph, etc.) | o-lane |
|----------------------------------------|--------|
| Pre-define workflow graphs | Agents discover workflows |
| Explicit state machines | Emergent behavior patterns |
| Manual step orchestration | Capability-based autonomy |
| Fixed execution paths | Dynamic path discovery |

### How It Works

```
User Intent → Lane Creation → Capability Loop → Result Storage
                                    ↓
                    [Evaluate → Plan → Execute] × N cycles
```

1. **User provides natural language intent** - "Analyze sales data"
2. **Lane created** - Agentic process begins
3. **Capability loop** - Agent evaluates, plans, executes repeatedly
4. **Emergent workflow** - Agent discovers optimal path through capabilities
5. **Result stored** - Complete execution history saved with content addressing

### This is NOT Orchestration

o-lane doesn't tell agents what to do. Instead:
- Agents **evaluate** their current state and intent
- Agents **decide** which capability to use next
- Agents **learn** from execution history
- Workflows **emerge** from agent intelligence

## Core Concepts

### Lanes as Agentic Processes

A **lane** is a self-contained execution context for resolving an intent. Like an OS process, it has:

- **Unique ID** - Content-addressable identifier (CID)
- **Lifecycle states** - PENDING → RUNNING → COMPLETED
- **Execution history** - Complete audit trail of decisions
- **Resource isolation** - Independent execution context
- **Parent-child relationships** - Lanes can spawn sub-lanes

#### Lane Lifecycle

```typescript
// 1. Lane creation
const lane = await manager.createLane({
  intent: new oIntent({ intent: 'Process customer order' }),
  currentNode: agentTool,
  caller: callerAddress,
  context: contextData
});

// 2. Lane execution (automatic lifecycle)
const result = await lane.execute();
//   → PREFLIGHT: Preparation and validation
//   → RUNNING: Capability loop execution
//   → POSTFLIGHT: Cleanup and storage
//   → COMPLETED: Final state

// 3. Lane result
console.log(lane.status); // COMPLETED
console.log(lane.sequence); // Full execution history
```

#### Lane States

| State | Description |
|-------|-------------|
| `PENDING` | Lane created, awaiting execution |
| `PREFLIGHT` | Pre-execution validation and setup |
| `RUNNING` | Active capability loop processing |
| `POSTFLIGHT` | Storing results and cleanup |
| `COMPLETED` | Successfully finished |
| `FAILED` | Encountered unrecoverable error |
| `CANCELLED` | Manually terminated |

### Intents

Intents are **natural language expressions of what the agent should accomplish**.

```typescript
import { oIntent } from '@olane/o-lane';

// Simple intent
const intent1 = new oIntent({ 
  intent: 'Find relevant documentation for API authentication' 
});

// Complex intent
const intent2 = new oIntent({ 
  intent: 'Analyze Q4 sales trends, identify top performers, and generate executive summary' 
});

console.log(intent1.value); // Access the intent string
```

**Best Practice:** Keep intents specific and outcome-focused rather than prescriptive:
- ✅ "Create a summary of customer feedback from the last month"
- ❌ "Query the database, filter by date, run sentiment analysis, format results"

### Capabilities

Capabilities are **atomic execution primitives** that agents can use to accomplish tasks. Each capability:

- Performs one specific type of action
- Returns a `oCapabilityResult` indicating next capability
- Can succeed, fail, or trigger other capabilities
- Is discoverable and composable

```typescript
import { oCapability, oCapabilityResult, oCapabilityType } from '@olane/o-lane';

// Capabilities are executed in sequence based on agent decisions
class CustomCapability extends oCapability {
  get type() {
    return oCapabilityType.CUSTOM;
  }

  async run(): Promise<oCapabilityResult> {
    // Your capability logic here
    const result = await this.doWork();
    
    return new oCapabilityResult({
      type: oCapabilityType.EVALUATE, // Tell agent what to do next
      result: result,
      config: { intent: this.intent }
    });
  }
}
```

### The Capability Loop

The heart of o-lane's emergent orchestration:

```
1. EVALUATE → Agent analyzes intent and current state
             ↓
2. DECIDE   → Agent determines next capability to use
             ↓
3. EXECUTE  → Capability performs its action
             ↓
4. RECORD   → Result added to sequence
             ↓
5. CHECK    → Complete? If yes, STOP. If no, return to EVALUATE
```

**Key Properties:**

- **Maximum Cycles**: Configurable limit (default: 20) prevents infinite loops
- **State Accumulation**: Each cycle builds on previous results
- **Emergent Patterns**: Optimal workflows discovered through execution
- **Fault Tolerance**: Errors trigger ERROR capability for recovery

```typescript
// The loop runs automatically in lane.execute()
async loop(): Promise<oCapabilityResult> {
  let iterations = 0;
  let currentStep = /* Initial EVALUATE capability */;

  while (iterations++ < this.MAX_CYCLES && this.status === RUNNING) {
    const result = await this.doCapability(currentStep);
    this.addSequence(result); // Track history
    
    if (result.type === oCapabilityType.STOP) {
      return result; // Intent resolved
    }
    
    currentStep = result; // Continue with next capability
  }
}
```

### Execution Sequences

Every capability execution is recorded in the lane's sequence, creating a complete audit trail:

```typescript
// Access execution history
console.log(lane.sequence);
// [
//   {
//     id: 'cap-1',
//     type: 'EVALUATE',
//     config: { intent: '...', context: '...' },
//     result: { reasoning: 'Need to search for information', next: 'SEARCH' }
//   },
//   {
//     id: 'cap-2',
//     type: 'SEARCH',
//     config: { query: 'customer data' },
//     result: { data: [...], next: 'TASK' }
//   },
//   // ... more cycles
// ]

// Formatted agent history
console.log(lane.agentHistory);
// [Cycle 1 Begin]
// Cycle Intent: Find customer data
// Cycle Result: { reasoning: "...", result: "..." }
// [Cycle 1 End]
// [Cycle 2 Begin]
// ...
```

## Built-in Capabilities

o-lane includes six core capabilities that handle most agentic workflows:

### 1. Evaluate (`EVALUATE`)

**Purpose**: Analyze the intent and determine the next capability to use.

**When Used**: 
- Start of every lane
- After completing any other capability
- When agent needs to reassess approach

```typescript
import { oCapabilityEvaluate } from '@olane/o-lane';

// Automatically uses AI to evaluate intent and choose next step
// Returns: { type: 'TASK' | 'SEARCH' | 'CONFIGURE' | 'STOP', reasoning: '...' }
```

### 2. Task (`TASK`)

**Purpose**: Execute a specific tool method with parameters.

**When Used**: Agent needs to call a tool (API, database, computation, etc.)

```typescript
// Agent decides to execute a task
// Result: { type: 'TASK', config: { task: { address: 'o://tool', payload: {...} } } }

// Capability executes:
const response = await this.node.use(new oAddress('o://analytics'), {
  method: 'analyze_sales',
  params: { period: 'Q4' }
});
```

### 3. Search (`SEARCH`)

**Purpose**: Query vector stores, registries, or knowledge bases for information.

**When Used**: Agent needs to find relevant context, tools, or data

```typescript
// Searches network for capabilities or information
// Can query vector stores, registries, or other search services
```

### 4. Configure (`CONFIGURE`)

**Purpose**: Set up tool parameters, establish connections, or prepare environment.

**When Used**: Before executing complex operations requiring setup

```typescript
// Configures tools or establishes required state
// Returns configuration result and proceeds to next capability
```

### 5. Error (`ERROR`)

**Purpose**: Handle errors gracefully and attempt recovery.

**When Used**: Any capability encounters an error

```typescript
// Automatically triggered on errors
// Analyzes error, determines recovery strategy
// Can retry, use alternative approach, or escalate
```

### 6. Multiple Step (`MULTIPLE_STEP`)

**Purpose**: Coordinate complex multi-step operations.

**When Used**: Intent requires coordinating several dependent actions

```typescript
// Manages sequences of related tasks
// Tracks progress across multiple steps
// Handles dependencies between steps
```

### Capability Flow Example

```
Intent: "Analyze Q4 sales and create report"
         ↓
Cycle 1: EVALUATE → "Need to search for sales data tool"
         ↓
Cycle 2: SEARCH → Found 'o://analytics/sales'
         ↓
Cycle 3: EVALUATE → "Ready to fetch data"
         ↓
Cycle 4: TASK → Execute o://analytics/sales/fetch_q4_data
         ↓
Cycle 5: EVALUATE → "Have data, need to analyze"
         ↓
Cycle 6: TASK → Execute o://analytics/analyze
         ↓
Cycle 7: EVALUATE → "Analysis complete, create report"
         ↓
Cycle 8: TASK → Execute o://reports/create
         ↓
Cycle 9: EVALUATE → "Report created, done"
         ↓
Cycle 10: STOP → Return final result
```

## API Reference

### `oLane` Class

Core lane execution class that manages the capability loop.

#### Constructor

```typescript
new oLane(config: oLaneConfig)
```

**Config Properties:**
- `intent: oIntent` - The intent to resolve (required)
- `caller: oAddress` - Address of the calling agent (required)
- `currentNode: oLaneTool` - The agent tool executing the lane (required)
- `context?: oLaneContext` - Historical or domain context
- `streamTo?: oAddress` - Address to stream progress updates
- `capabilities?: oCapability[]` - Custom capability set
- `maxCycles?: number` - Override default max cycles (20)
- `parentLaneId?: string` - Parent lane for sub-lanes

#### Properties

- `intent: oIntent` - The intent being resolved
- `sequence: oCapabilityResult[]` - Execution history
- `status: oLaneStatus` - Current lifecycle state
- `result: oCapabilityResult` - Final execution result
- `id: string` - Unique lane identifier
- `cid?: CID` - Content identifier for storage
- `agentHistory: string` - Formatted execution history

#### Methods

**`async execute(): Promise<oCapabilityResult>`**

Execute the complete lane lifecycle.

```typescript
const result = await lane.execute();
// Returns final capability result with outcome
```

**`async loop(): Promise<oCapabilityResult>`**

Internal capability loop execution (called by execute).

**`addSequence(result: oCapabilityResult): void`**

Add a capability result to the execution sequence.

```typescript
lane.addSequence(new oCapabilityResult({ type: 'TASK', result: data }));
```

**`async store(): Promise<void>`**

Store lane execution history to persistent storage.

```typescript
await lane.store();
// Lane stored at o://lane/<cid>
```

**`async toCID(): Promise<CID>`**

Generate content-addressed identifier for this lane.

```typescript
const cid = await lane.toCID();
console.log(cid.toString()); // "bafyreib..."
```

**`cancel(): void`**

Cancel lane execution.

```typescript
lane.cancel();
console.log(lane.status); // CANCELLED
```

---

### `oLaneTool` Class

Extends `oNodeTool` with lane execution capabilities.

#### Built-in Methods

**`async _tool_handshake(request: oRequest): Promise<oHandshakeResult>`**

Perform capability negotiation with other agents.

```typescript
const result = await agent.use({
  method: 'handshake',
  params: { intent: 'Discover capabilities' }
});
// Returns: { tools: [...], methods: {...} }
```

**`async _tool_intent(request: oRequest): Promise<any>`**

Main entry point for intent resolution.

```typescript
const result = await agent.use({
  method: 'intent',
  params: {
    intent: 'Your natural language goal here',
    context: 'Optional conversation history',
    streamTo: 'o://optional/stream/address'
  }
});
```

#### Usage Example

```typescript
class CustomAgent extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://custom-agent'),
      description: 'My specialized agent'
    });
  }

  // Add domain-specific tool methods
  async _tool_domain_action(request: oRequest): Promise<any> {
    // Your custom logic
    return { success: true };
  }
}
```

---

### `oIntent` Class

Wrapper for natural language intents.

```typescript
import { oIntent } from '@olane/o-lane';

const intent = new oIntent({ intent: 'Process customer order #12345' });
console.log(intent.value); // "Process customer order #12345"
```

---

### `oCapability` Abstract Class

Base class for creating custom capabilities.

```typescript
import { oCapability, oCapabilityResult, oCapabilityType } from '@olane/o-lane';

class MyCapability extends oCapability {
  // Define capability type
  get type(): oCapabilityType {
    return oCapabilityType.CUSTOM;
  }

  static get type() {
    return oCapabilityType.CUSTOM;
  }

  // Implement execution logic
  async run(): Promise<oCapabilityResult> {
    // Access intent: this.intent
    // Access node: this.node
    // Access config: this.config

    const result = await this.performWork();

    return new oCapabilityResult({
      type: oCapabilityType.EVALUATE, // Next capability
      result: result,
      config: { intent: this.intent }
    });
  }
}
```

---

### `oLaneManager` Class

Manages lane lifecycle and tracking.

```typescript
import { oLaneManager } from '@olane/o-lane';

const manager = new oLaneManager();

// Create a new lane
const lane = await manager.createLane({
  intent: new oIntent({ intent: 'Your goal' }),
  currentNode: agentTool,
  caller: callerAddress
});

// Lane is automatically tracked
```

---

### `oCapabilityResult` Class

Result object returned by capabilities.

```typescript
import { oCapabilityResult, oCapabilityType } from '@olane/o-lane';

const result = new oCapabilityResult({
  type: oCapabilityType.TASK,
  result: { data: 'success' },
  config: { /* next capability config */ },
  error: undefined
});
```

**Properties:**
- `type: oCapabilityType` - Next capability to execute
- `result: any` - Execution result data
- `config?: any` - Configuration for next capability
- `error?: string` - Error message if failed

---

### Enums

#### `oLaneStatus`

```typescript
enum oLaneStatus {
  PENDING = 'pending',
  PREFLIGHT = 'preflight',
  RUNNING = 'running',
  POSTFLIGHT = 'postflight',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

#### `oCapabilityType`

```typescript
enum oCapabilityType {
  EVALUATE = 'evaluate',
  TASK = 'task',
  SEARCH = 'search',
  CONFIGURE = 'configure',
  ERROR = 'error',
  MULTIPLE_STEP = 'multiple_step',
  STOP = 'stop',
  RESULT = 'result',
  UNKNOWN = 'unknown'
}
```

## Examples

### Basic Intent Resolution

```typescript
import { oLaneTool, oIntent } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// Create agent
const agent = new oLaneTool({
  address: new oAddress('o://assistant'),
  description: 'General purpose assistant'
});

await agent.start();

// Resolve an intent
const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Find the latest sales report and summarize key metrics'
  }
});

console.log('Result:', response.result);
console.log('Cycles used:', response.cycles);
console.log('Execution path:', response.sequence.map(s => s.type));
// ['EVALUATE', 'SEARCH', 'TASK', 'EVALUATE', 'TASK', 'STOP']
```

### Custom Capability

```typescript
import { oCapability, oCapabilityResult, oCapabilityType } from '@olane/o-lane';

// Create domain-specific capability
class EmailCapability extends oCapability {
  get type() {
    return oCapabilityType.CUSTOM;
  }

  async run(): Promise<oCapabilityResult> {
    this.logger.info('Sending email...');
    
    try {
      // Send email using your email service
      await this.sendEmail({
        to: this.config.recipient,
        subject: this.config.subject,
        body: this.config.body
      });

      return new oCapabilityResult({
        type: oCapabilityType.EVALUATE, // Back to evaluation
        result: 'Email sent successfully',
        config: { intent: this.intent }
      });
    } catch (error) {
      return new oCapabilityResult({
        type: oCapabilityType.ERROR,
        error: error.message,
        config: { intent: this.intent, originalError: error }
      });
    }
  }

  async sendEmail(params: any) {
    // Your email sending logic
  }
}

// Use custom capability
const lane = await manager.createLane({
  intent: new oIntent({ intent: 'Send status update to team' }),
  currentNode: agentTool,
  caller: callerAddress,
  capabilities: [
    new oCapabilityEvaluate(),
    new EmailCapability(),
    new oCapabilityError()
  ]
});

const result = await lane.execute();
```

### Streaming Results

```typescript
// Create streaming endpoint
class StreamReceiver extends oLaneTool {
  async _tool_receive_stream(request: oRequest): Promise<any> {
    const { data } = request.params;
    console.log('Stream update:', data);
    // Send to UI, websocket, etc.
    return { received: true };
  }
}

const receiver = new StreamReceiver({
  address: new oAddress('o://stream-receiver')
});
await receiver.start();

// Execute intent with streaming
const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Process large dataset',
    streamTo: 'o://stream-receiver' // Receive real-time updates
  }
});

// Receiver gets updates as each capability completes:
// Stream update: { reasoning: "Starting data fetch..." }
// Stream update: { result: "Fetched 1000 records" }
// Stream update: { result: "Processing batch 1/10..." }
// ...
```

### Lane with Context

```typescript
import { oLaneContext } from '@olane/o-lane';

// Provide conversation history or domain context
const context = new oLaneContext([
  '[Previous Conversation]',
  'User: What were our sales last quarter?',
  'Agent: Q3 sales were $1.2M, up 15% from Q2.',
  'User: Now show me Q4 projections.',
  '[End Previous Conversation]'
]);

const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Calculate Q4 projections',
    context: context.toString()
  }
});

// Agent uses context to understand the full conversation
```

### Multi-Cycle Execution with Analysis

```typescript
// Complex intent requiring multiple capabilities
const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Analyze customer feedback from last month, identify common themes, and create action items'
  }
});

// Analyze the execution path
console.log('Execution Analysis:');
response.sequence.forEach((step, index) => {
  console.log(`\nCycle ${index + 1}:`);
  console.log(`  Type: ${step.type}`);
  console.log(`  Reasoning: ${step.reasoning}`);
  if (step.result) {
    console.log(`  Result: ${JSON.stringify(step.result).slice(0, 100)}...`);
  }
});

// Output might show:
// Cycle 1: EVALUATE - "Need to search for feedback collection tool"
// Cycle 2: SEARCH - Found o://feedback/collector
// Cycle 3: TASK - Fetched 145 feedback items
// Cycle 4: EVALUATE - "Have data, need sentiment analysis"
// Cycle 5: TASK - Analyzed sentiment across feedback
// Cycle 6: EVALUATE - "Need to identify themes"
// Cycle 7: TASK - Extracted 5 common themes
// Cycle 8: EVALUATE - "Ready to create action items"
// Cycle 9: TASK - Generated 8 action items
// Cycle 10: STOP - Completed successfully
```

## Advanced Usage

### Custom Capabilities

Create domain-specific capabilities for specialized workflows:

```typescript
import { oCapability, oCapabilityResult, oCapabilityType } from '@olane/o-lane';

class DatabaseQueryCapability extends oCapability {
  get type() {
    return oCapabilityType.CUSTOM;
  }

  async run(): Promise<oCapabilityResult> {
    const { query, params } = this.config;
    
    try {
      // Execute database query
      const results = await this.executeQuery(query, params);
      
      // Store results in lane storage for later use
      await this.node.use(new oAddress('o://lane'), {
        method: 'put',
        params: {
          key: `query-result-${Date.now()}`,
          value: JSON.stringify(results)
        }
      });

      return new oCapabilityResult({
        type: oCapabilityType.EVALUATE,
        result: {
          rowCount: results.length,
          data: results,
          reasoning: `Query returned ${results.length} rows`
        }
      });
    } catch (error) {
      return new oCapabilityResult({
        type: oCapabilityType.ERROR,
        error: error.message
      });
    }
  }

  async executeQuery(query: string, params: any) {
    // Your database logic
  }
}
```

**When to Create Custom Capabilities:**
- Domain-specific operations (database queries, API calls, etc.)
- Complex multi-step processes that should be atomic
- Integration with external systems
- Performance-critical operations requiring optimization

### Lane Context

Provide rich context to help agents make better decisions:

```typescript
import { oLaneContext } from '@olane/o-lane';

// Conversation context
const conversationContext = new oLaneContext([
  '[Chat History]',
  'User: Show me last quarter sales',
  'Agent: Q3 sales: $1.2M (↑15%)',
  '[End History]'
]);

// Domain knowledge context
const domainContext = new oLaneContext([
  '[Business Rules]',
  '- Sales reports require manager approval',
  '- Sensitive data must be redacted',
  '- All currency in USD',
  '[End Rules]'
]);

// Combine contexts
const combinedContext = new oLaneContext([
  ...conversationContext.contexts,
  ...domainContext.contexts
]);

const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Generate Q4 sales report',
    context: combinedContext.toString()
  }
});
```

### Controlling Max Cycles

Adjust maximum cycles based on task complexity:

```typescript
// Environment variable (applies to all lanes)
process.env.MAX_CYCLES = '30';

// Per-lane configuration
const lane = await manager.createLane({
  intent: new oIntent({ intent: 'Complex multi-step analysis' }),
  currentNode: agent,
  caller: callerAddress,
  maxCycles: 50 // Override default
});

// Quick tasks
const quickLane = await manager.createLane({
  intent: new oIntent({ intent: 'Simple lookup' }),
  currentNode: agent,
  caller: callerAddress,
  maxCycles: 5 // Fail fast if not simple
});
```

**Guidelines:**
- Simple lookups/queries: 5-10 cycles
- Standard tasks: 15-20 cycles (default)
- Complex analysis: 30-50 cycles
- Long-running workflows: 50-100 cycles

### Streaming Integration

Implement real-time progress reporting:

```typescript
class ProgressTracker extends oLaneTool {
  private updates: any[] = [];

  async _tool_receive_stream(request: oRequest): Promise<any> {
    const { data } = request.params;
    this.updates.push({
      timestamp: Date.now(),
      data: data
    });

    // Send to UI via WebSocket, SSE, etc.
    await this.broadcastToUI(data);

    return { received: true, totalUpdates: this.updates.length };
  }

  async broadcastToUI(data: any) {
    // Your UI streaming logic (WebSocket, Server-Sent Events, etc.)
    this.websocket?.send(JSON.stringify({
      type: 'lane_update',
      data: data
    }));
  }
}

// Use with streaming
const tracker = new ProgressTracker({
  address: new oAddress('o://progress-tracker')
});
await tracker.start();

// Long-running task with progress updates
const response = await agent.use({
  method: 'intent',
  params: {
    intent: 'Process 10,000 customer records',
    streamTo: 'o://progress-tracker'
  }
});
```

### Lane Storage & Retrieval

Access historical lane executions:

```typescript
import { oAddress } from '@olane/o-core';

// Execute and store lane
const response = await agent.use({
  method: 'intent',
  params: { intent: 'Analyze sales data' }
});

// Get the lane's CID from execution
const lane = await manager.createLane({...});
const cid = await lane.toCID();

// Later: retrieve lane history
const storedLane = await agent.use(new oAddress('o://lane'), {
  method: 'get',
  params: { key: cid.toString() }
});

console.log('Historical execution:', storedLane.result);
// {
//   config: { intent: '...', caller: '...' },
//   sequence: [...],
//   result: {...}
// }

// Analyze patterns across multiple lanes
const allLanes = await agent.use(new oAddress('o://lane'), {
  method: 'list',
  params: { prefix: 'bafy' } // All CIDs
});

// Find common execution patterns
const patterns = analyzeLanePatterns(allLanes);
console.log('Most common capability sequences:', patterns);
```

## Testing

### Testing Lane Execution

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { oLaneTool, oIntent, oLaneManager } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

describe('Lane Execution', () => {
  let agent: oLaneTool;
  let manager: oLaneManager;

  beforeEach(async () => {
    agent = new oLaneTool({
      address: new oAddress('o://test-agent'),
      description: 'Test agent'
    });
    await agent.start();
    manager = new oLaneManager();
  });

  afterEach(async () => {
    await agent.stop();
  });

  it('should execute simple intent', async () => {
    const lane = await manager.createLane({
      intent: new oIntent({ intent: 'Test task' }),
      currentNode: agent,
      caller: new oAddress('o://tester')
    });

    const result = await lane.execute();

    expect(result).toBeDefined();
    expect(lane.status).toBe('completed');
    expect(lane.sequence.length).toBeGreaterThan(0);
  });

  it('should respect max cycles', async () => {
    const lane = await manager.createLane({
      intent: new oIntent({ intent: 'Complex task' }),
      currentNode: agent,
      caller: new oAddress('o://tester'),
      maxCycles: 3
    });

    await expect(lane.execute()).rejects.toThrow('reached max iterations');
  });

  it('should stream updates', async () => {
    const updates: any[] = [];
    
    // Mock stream receiver
    class MockReceiver extends oLaneTool {
      async _tool_receive_stream(request: any) {
        updates.push(request.params.data);
        return { received: true };
      }
    }

    const receiver = new MockReceiver({
      address: new oAddress('o://mock-receiver')
    });
    await receiver.start();

    const lane = await manager.createLane({
      intent: new oIntent({ intent: 'Streaming task' }),
      currentNode: agent,
      caller: new oAddress('o://tester'),
      streamTo: new oAddress('o://mock-receiver')
    });

    await lane.execute();

    expect(updates.length).toBeGreaterThan(0);
    
    await receiver.stop();
  });
});
```

### Mocking Capabilities

```typescript
import { oCapability, oCapabilityResult, oCapabilityType } from '@olane/o-lane';

// Create mock capability for testing
class MockTaskCapability extends oCapability {
  get type() {
    return oCapabilityType.TASK;
  }

  async run(): Promise<oCapabilityResult> {
    // Return predetermined result for testing
    return new oCapabilityResult({
      type: oCapabilityType.STOP,
      result: { mocked: true, data: 'test data' }
    });
  }
}

// Test with mock capabilities
it('should use mock capabilities', async () => {
  const mockCapabilities = [
    new oCapabilityEvaluate(),
    new MockTaskCapability()
  ];

  const lane = await manager.createLane({
    intent: new oIntent({ intent: 'Test with mocks' }),
    currentNode: agent,
    caller: new oAddress('o://tester'),
    capabilities: mockCapabilities
  });

  const result = await lane.execute();
  expect(result.result.mocked).toBe(true);
});
```

## Best Practices

### Intent Design

✅ **DO:**
- Use clear, outcome-focused language
- Specify concrete goals rather than steps
- Provide sufficient context in the intent
- Keep intents scoped to achievable tasks

```typescript
// Good intents
"Analyze customer satisfaction scores from Q4 and identify improvement areas"
"Find all pending orders and send reminder emails to customers"
"Generate a summary report of this week's support tickets"
```

❌ **DON'T:**
- Use vague or ambiguous language
- Prescribe specific implementation steps
- Combine unrelated tasks
- Assume agent has unstated context

```typescript
// Poor intents
"Do some analysis" // Too vague
"Query database, filter results, format as JSON, send to API" // Too prescriptive
"Analyze sales and fix the server bug and update documentation" // Unrelated tasks
```

### Capability Design

✅ **DO:**
- Keep capabilities atomic and focused
- Return clear next-capability signals
- Handle errors gracefully
- Log reasoning and decisions

❌ **DON'T:**
- Create monolithic capabilities
- Assume state from previous cycles
- Silently fail
- Lose execution context

### Context Management

✅ **DO:**
- Provide relevant conversation history
- Include domain-specific rules and constraints
- Keep context concise but complete
- Update context as conversations evolve

❌ **DON'T:**
- Dump entire chat history
- Include irrelevant information
- Assume context is remembered between lanes
- Mix different types of context

### Cycle Management

✅ **DO:**
- Set appropriate max cycles for task complexity
- Monitor cycle usage patterns
- Optimize frequently-used capability paths
- Use streaming for long-running tasks

❌ **DON'T:**
- Use same max cycles for all tasks
- Ignore high cycle counts
- Let lanes run indefinitely
- Block waiting for lane completion

### Monitoring & Debugging

✅ **DO:**
- Store and analyze lane execution histories
- Track capability success/failure rates
- Monitor average cycles per intent type
- Log reasoning at each capability

❌ **DON'T:**
- Ignore lane storage
- Treat all failures the same
- Skip execution analysis
- Remove debugging information too early

## Use Cases

### Complex Multi-Step Workflows

```typescript
// Intent: "Onboard new customer: create account, send welcome email, assign CSM"
// Lane automatically:
// 1. Evaluates steps needed
// 2. Searches for account creation tool
// 3. Creates account
// 4. Searches for email service
// 5. Sends welcome email
// 6. Searches for CSM assignment tool
// 7. Assigns customer success manager
// 8. Returns confirmation
```

### Long-Running Agent Tasks

```typescript
// Intent: "Monitor API health every 5 minutes and alert on failures"
// Lane manages:
// - Periodic execution via scheduling capability
// - State persistence across executions
// - Error detection and alerting
// - Automatic recovery attempts
```

### Intent-Based Automation

```typescript
// Intent: "When new sales lead arrives, score it and route to appropriate team"
// Lane orchestrates:
// - Lead data extraction
// - Scoring algorithm execution
// - Team assignment logic
// - Notification delivery
// - CRM updates
```

### Agent Coordination Patterns

```typescript
// Intent: "Coordinate 3 specialist agents to analyze customer data"
// Lane enables:
// - Discovery of specialist agents
// - Parallel task distribution
// - Result aggregation
// - Consensus building
// - Final report generation
```

### Emergent Workflow Discovery

```typescript
// Multiple users with similar intents
// Lane learns optimal paths:
// "Generate sales report" -> most efficient capability sequence emerges
// Future executions follow discovered optimal path
// Workflow improves over time through accumulated learning
```

## Troubleshooting

### Lane Reaches Max Cycles

**Symptom:** Lane throws "reached max iterations" error

**Causes:**
- Intent too complex for cycle limit
- Agent stuck in evaluation loop
- Missing required capabilities
- Poor capability return signals

**Solutions:**
```typescript
// 1. Increase max cycles for complex tasks
maxCycles: 50

// 2. Break intent into smaller sub-intents
"Analyze all customer data" → "Analyze customer data for Q4"

// 3. Add missing capabilities
capabilities: [...ALL_CAPABILITIES, new CustomCapability()]

// 4. Review agent history to find loops
console.log(lane.agentHistory);
// Look for repeated capability patterns
```

### Capability Not Found Errors

**Symptom:** "Unknown capability" error during execution

**Causes:**
- Custom capability not registered
- Agent choosing unavailable capability type
- Capability type mismatch

**Solutions:**
```typescript
// 1. Register custom capabilities
const lane = await manager.createLane({
  capabilities: [
    ...ALL_CAPABILITIES,
    new MyCustomCapability()
  ]
});

// 2. Check capability type enum values match
get type() {
  return oCapabilityType.CUSTOM; // Must match exactly
}

// 3. Provide all standard capabilities
import { ALL_CAPABILITIES } from '@olane/o-lane';
```

### Intent Not Resolving

**Symptom:** Lane completes but doesn't achieve desired outcome

**Causes:**
- Intent too vague
- Missing context
- Insufficient capabilities available
- Poor tool descriptions

**Solutions:**
```typescript
// 1. Make intent more specific
"Do analysis" → "Calculate average sales per region for Q4 2024"

// 2. Provide context
context: new oLaneContext([
  'Available data: sales_q4.csv',
  'Required format: JSON with region, avg_sales fields'
])

// 3. Add specialized capabilities
capabilities: [...ALL_CAPABILITIES, new DataAnalysisCapability()]

// 4. Improve tool descriptions in agent config
description: 'Calculates regional sales averages from CSV data'
```

### Storage Failures

**Symptom:** Lane executes but fails to store results

**Causes:**
- Storage service unavailable
- Invalid CID generation
- Permission issues
- Storage quota exceeded

**Solutions:**
```typescript
// 1. Verify storage service is running
await agent.use(new oAddress('o://lane'), { method: 'ping' });

// 2. Check CID generation
const cid = await lane.toCID();
console.log('CID:', cid.toString());

// 3. Add error handling
try {
  await lane.store();
} catch (error) {
  console.error('Storage failed:', error);
  // Implement fallback storage
}

// 4. Monitor storage usage
const usage = await agent.use(new oAddress('o://lane'), {
  method: 'usage'
});
```

## Related Packages

- **[@olane/o-core](../o-core)** - Core OS functionality and base classes
- **[@olane/o-node](../o-node)** - Network-connected tools with P2P capabilities  
- **[@olane/o-tool](../o-tool)** - Tool augmentation system for agent specialization
- **[@olane/o-leader](../o-leader)** - Network coordination and agent discovery
- **[@olane/o-protocol](../o-protocol)** - Protocol definitions and types
- **[@olane/o-config](../o-config)** - Configuration management utilities

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details on our code of conduct and development process.

## License

ISC © oLane Inc.

## Resources

- [Full Documentation](https://olane.com/docs)
- [Olane OS Overview](../../README.md)
- [Examples](../../examples)
- [GitHub Repository](https://github.com/olane-labs/olane)
- [Report Issues](https://github.com/olane-labs/olane/issues)
- [Community Forum](https://olane.com/community)

---

**Part of the Olane OS ecosystem** - An agentic operating system for building intelligent, collaborative AI agent networks.
