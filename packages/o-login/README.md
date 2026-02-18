# @olane/o-login

**Login interface for agents to connect to Olane OS.**

`o-login` enables both human and AI agents to authenticate and interact with Olane OS by registering themselves as addressable nodes on the network. Once logged in, agents can receive intents, answer questions, and process streamed data.

**TL;DR**: Use `oHumanLoginTool` for human agents or `oAILoginTool` for AI agents. Provide callback functions to handle intents, questions, and streams.

---

## Quick Start {#quick-start}

### Installation

```bash
pnpm install @olane/o-login
```

### Minimal Example: Human Agent Login

```typescript
import { oHumanLoginTool } from '@olane/o-login';

// Create a human agent login
const humanAgent = new oHumanLoginTool({
  respond: async (intent: string) => {
    // Handle intents sent to this agent
    console.log('Received intent:', intent);
    return 'Intent resolved successfully';
  },
  answer: async (question: string) => {
    // Answer questions sent to this agent
    console.log('Received question:', question);
    return 'Here is my answer';
  },
  receiveStream: async (data: any) => {
    // Handle streamed data
    console.log('Received stream:', data);
  }
});

// Start the agent
await humanAgent.start();

// Now reachable at o://human
console.log('Human agent is online at:', humanAgent.address.toString());
```

### Minimal Example: AI Agent Login

```typescript
import { oAILoginTool } from '@olane/o-login';

// Create an AI agent login
const aiAgent = new oAILoginTool({
  respond: async (intent: string) => {
    // AI processes the intent
    const result = await processWithAI(intent);
    return result;
  },
  answer: async (question: string) => {
    // AI answers the question
    const answer = await aiAnswers(question);
    return answer;
  },
  receiveStream: async (data: any) => {
    // AI processes streamed data
    await processStream(data);
  }
});

// Start the AI agent
await aiAgent.start();

// Now reachable at o://ai
console.log('AI agent is online at:', aiAgent.address.toString());
```

---

## How It Works {#how-it-works}

When you create and start a login tool, you're registering an **agent node** on Olane OS. This node:

1. **Becomes addressable** - Gets an `o://` address (default: `o://human` or `o://ai`)
2. **Exposes tools** - Three built-in tools: `intent`, `question`, and `receive_stream`
3. **Handles requests** - Routes incoming requests to your callback functions
4. **Maintains connection** - Stays online and responsive until stopped

**Visual Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│  Other Nodes/Agents                                         │
│  (anywhere on Olane OS)                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Send intent/question/stream
                   ⬇
┌─────────────────────────────────────────────────────────────┐
│  o-login Node (o://human or o://ai)                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │ _tool_intent│  │_tool_question│ │_tool_receive_ │       │
│  │             │  │              │  │   stream      │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                │                  │               │
│         ⬇                ⬇                  ⬇               │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Your Callback Functions                         │      │
│  │  • respond(intent)                               │      │
│  │  • answer(question)                              │      │
│  │  • receiveStream(data)                           │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference {#api-reference}

### `oHumanLoginTool`

Creates a login node for human agents.

**Constructor**:
```typescript
new oHumanLoginTool(config: oLoginConfig)
```

**Parameters**:
- `config` (object, required): Configuration object
  - `respond` (function, required): Async function to handle intents
    - **Signature**: `(intent: string) => Promise<string>`
    - **Returns**: Resolution message
  - `answer` (function, required): Async function to answer questions
    - **Signature**: `(question: string) => Promise<string>`
    - **Returns**: Answer string
  - `receiveStream` (function, required): Async function to handle streams
    - **Signature**: `(data: any) => Promise<any>`
    - **Returns**: Processing result (optional)
  - `address` (oNodeAddress, optional): Custom address (default: `o://human`)
  - `leader` (oNodeAddress, optional): Leader node address for network registration
  - `parent` (oNodeAddress, optional): Parent node address

**Example**:
```typescript
const humanAgent = new oHumanLoginTool({
  // Custom address
  address: new oNodeAddress('o://team/alice'),
  
  // Handle intents
  respond: async (intent: string) => {
    if (intent.includes('approve')) {
      return 'Request approved';
    }
    return 'Request pending review';
  },
  
  // Answer questions
  answer: async (question: string) => {
    return `Human response to: ${question}`;
  },
  
  // Handle streamed data
  receiveStream: async (data: any) => {
    console.log('Processing stream chunk:', data);
  }
});

await humanAgent.start();
```

---

### `oAILoginTool`

Creates a login node for AI agents.

**Constructor**:
```typescript
new oAILoginTool(config: oLoginConfig)
```

**Parameters**:
Same as `oHumanLoginTool`, but with default address `o://ai`.

**Example**:
```typescript
import { oAILoginTool } from '@olane/o-login';
import OpenAI from 'openai';

const openai = new OpenAI();

const aiAgent = new oAILoginTool({
  // AI processes intents
  respond: async (intent: string) => {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: intent }]
    });
    return completion.choices[0].message.content;
  },
  
  // AI answers questions
  answer: async (question: string) => {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: question }]
    });
    return completion.choices[0].message.content;
  },
  
  // AI processes streams
  receiveStream: async (data: any) => {
    // Process incoming data
    await processDataWithAI(data);
  }
});

await aiAgent.start();
```

---

### `oLoginTool` (Base Class)

Base class for all login tools. Extends `oLaneTool` from `@olane/o-lane`.

You can extend this directly for custom agent types:

```typescript
import { oLoginTool } from '@olane/o-login';
import { oNodeAddress } from '@olane/o-node';

class CustomAgentLogin extends oLoginTool {
  constructor() {
    super({
      address: new oNodeAddress('o://custom-agent'),
      respond: async (intent: string) => {
        // Custom intent handling
        return 'Custom response';
      },
      answer: async (question: string) => {
        // Custom question handling
        return 'Custom answer';
      },
      receiveStream: async (data: any) => {
        // Custom stream handling
      }
    });
  }
}
```

---

## Built-in Tools {#built-in-tools}

Every login node exposes three tools:

### `_tool_intent`

Handles intent-based requests.

**Parameters**:
- `intent` (string, required): The intent to resolve

**Returns** (raw data from the tool method):
```typescript
{
  success: boolean;
  resolution: string;
}
```

> **Note**: When calling via `node.use()`, the raw return value is wrapped by the base class. Access it via `response.result.data`.

**Example Usage** (from another node):
```typescript
// Another node sends an intent to the human agent
const response = await humanAgent.use(humanAgent.address, {
  method: 'intent',
  params: {
    intent: 'Please approve the budget request for Q4'
  }
});

if (response.result.success) {
  console.log(response.result.data.resolution);
  // "Request approved" (based on your respond callback)
}
```

---

### `_tool_question`

Handles question-answer requests.

**Parameters**:
- `question` (string, required): The question to answer

**Returns** (raw data from the tool method):
```typescript
{
  success: boolean;
  answer: string;
}
```

> **Note**: When calling via `node.use()`, the raw return value is wrapped by the base class. Access it via `response.result.data`.

**Example Usage** (from another node):
```typescript
// Another node asks a question
const response = await aiAgent.use(aiAgent.address, {
  method: 'question',
  params: {
    question: 'What is the capital of France?'
  }
});

if (response.result.success) {
  console.log(response.result.data.answer);
  // "Paris" (based on your answer callback)
}
```

---

### `_tool_receive_stream`

Handles streamed data.

**Parameters**:
- `data` (any, required): The data to process

**Returns** (raw data from the tool method):
```typescript
{
  success: boolean;
}
```

> **Note**: When calling via `node.use()`, the raw return value is wrapped by the base class. Access it via `response.result.data`.

**Example Usage** (from another node):
```typescript
// Another node streams data
const response = await humanAgent.use(humanAgent.address, {
  method: 'receive_stream',
  params: {
    data: { type: 'notification', message: 'System update available' }
  }
});

if (response.result.success) {
  console.log('Stream data delivered successfully');
}
```

---

## Response Structure {#response-structure}

When calling login tools via `node.use()`, responses follow the standard Olane response structure:

```typescript
const response = await node.use(
  new oNodeAddress('o://human'),
  { method: 'intent', params: { intent: 'Approve the request' } }
);

// response.result.success - boolean indicating success or failure
// response.result.data    - the return value on success
// response.result.error   - error message on failure

if (response.result.success) {
  console.log('Resolution:', response.result.data.resolution);
} else {
  console.error('Error:', response.result.error);
}
```

> **Important**: Never access `response.success` or `response.data` directly. Always use `response.result.success` and `response.result.data`.

---

## Common Use Cases {#common-use-cases}

### Use Case 1: Human-in-the-Loop Approval System

Create a human agent that approves or rejects automated actions.

```typescript
import { oHumanLoginTool } from '@olane/o-login';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const humanApprover = new oHumanLoginTool({
  address: new oNodeAddress('o://approvals/human'),
  
  respond: async (intent: string) => {
    // Prompt human for approval
    return new Promise((resolve) => {
      rl.question(`Approve this action? "${intent}" (y/n): `, (answer) => {
        if (answer.toLowerCase() === 'y') {
          resolve('Approved by human operator');
        } else {
          resolve('Rejected by human operator');
        }
      });
    });
  },
  
  answer: async (question: string) => {
    return new Promise((resolve) => {
      rl.question(`${question}\nYour answer: `, resolve);
    });
  },
  
  receiveStream: async (data: any) => {
    console.log('[Human Dashboard] Received:', data);
  }
});

await humanApprover.start();
console.log('Human approver is online. Awaiting approval requests...');
```

---

### Use Case 2: AI Assistant with Context

Create an AI agent that maintains conversation context.

```typescript
import { oAILoginTool } from '@olane/o-login';
import OpenAI from 'openai';

const openai = new OpenAI();
const conversationHistory: any[] = [];

const aiAssistant = new oAILoginTool({
  address: new oNodeAddress('o://ai/assistant'),
  
  respond: async (intent: string) => {
    // Add to conversation history
    conversationHistory.push({
      role: 'user',
      content: intent
    });
    
    // Get AI response with context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversationHistory
    });
    
    const response = completion.choices[0].message.content;
    
    // Store AI response in history
    conversationHistory.push({
      role: 'assistant',
      content: response
    });
    
    return response;
  },
  
  answer: async (question: string) => {
    // Similar to respond, but for direct questions
    conversationHistory.push({
      role: 'user',
      content: question
    });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversationHistory
    });
    
    return completion.choices[0].message.content;
  },
  
  receiveStream: async (data: any) => {
    // Process streamed data (e.g., document chunks)
    conversationHistory.push({
      role: 'system',
      content: `Context data received: ${JSON.stringify(data)}`
    });
  }
});

await aiAssistant.start();
```

---

### Use Case 3: Multi-Agent System

Create both human and AI agents working together.

```typescript
import { oHumanLoginTool, oAILoginTool } from '@olane/o-login';
import { oNodeAddress } from '@olane/o-node';

// AI agent handles routine questions
const aiSupport = new oAILoginTool({
  address: new oNodeAddress('o://support/ai'),
  
  respond: async (intent: string) => {
    // Check if AI can handle this
    if (intent.includes('complex') || intent.includes('escalate')) {
      // Forward to human
      const humanResponse = await humanSupport.use(humanSupport.address, {
        method: 'intent',
        params: { intent }
      });
      return `Escalated to human: ${humanResponse.result.data.resolution}`;
    }
    
    // AI handles routine intents
    return 'AI resolved the routine request';
  },
  
  answer: async (question: string) => {
    return 'AI answer to routine question';
  },
  
  receiveStream: async (data: any) => {
    console.log('[AI] Processing:', data);
  }
});

// Human agent handles escalations
const humanSupport = new oHumanLoginTool({
  address: new oNodeAddress('o://support/human'),
  
  respond: async (intent: string) => {
    console.log('[Human] Handling escalated request:', intent);
    // Human decides on action
    return 'Human resolved complex request';
  },
  
  answer: async (question: string) => {
    console.log('[Human] Answering complex question:', question);
    return 'Human answer to complex question';
  },
  
  receiveStream: async (data: any) => {
    console.log('[Human] Reviewing:', data);
  }
});

// Start both agents
await aiSupport.start();
await humanSupport.start();

console.log('Multi-agent support system is online');
console.log('AI Support:', aiSupport.address.toString());
console.log('Human Support:', humanSupport.address.toString());
```

---

## Integration with Other Nodes {#integration}

Login nodes can interact with any other node on Olane OS.

### Example: Agent Receives Work from Another Node

```typescript
import { oHumanLoginTool } from '@olane/o-login';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';

// Create a task processor node
const taskProcessor = new oLaneTool({
  address: new oNodeAddress('o://tasks/processor')
});

// Create human agent that receives tasks
const humanWorker = new oHumanLoginTool({
  address: new oNodeAddress('o://workers/human'),
  
  respond: async (intent: string) => {
    console.log('New task:', intent);
    // Process the task
    return 'Task completed';
  },
  
  answer: async (question: string) => {
    return 'Status: Working';
  },
  
  receiveStream: async (data: any) => {
    console.log('Task update:', data);
  }
});

await taskProcessor.start();
await humanWorker.start();

// Task processor sends work to human
const response = await humanWorker.use(humanWorker.address, {
  method: 'intent',
  params: {
    intent: 'Review and approve the financial report'
  }
});

if (response.result.success) {
  console.log('Result:', response.result.data.resolution);
}
```

---

## Advanced Configuration {#advanced-configuration}

### Custom Address

Override the default address:

```typescript
const agent = new oHumanLoginTool({
  address: new oNodeAddress('o://company/team/alice'),
  respond: async (intent) => 'resolved',
  answer: async (question) => 'answered',
  receiveStream: async (data) => {}
});
```

### Network Registration with Leader

Connect to a leader node for service discovery:

```typescript
import { oNodeAddress } from '@olane/o-node';

const agent = new oHumanLoginTool({
  leader: new oNodeAddress('o://network/leader'),
  respond: async (intent) => 'resolved',
  answer: async (question) => 'answered',
  receiveStream: async (data) => {}
});

await agent.start();

// Now discoverable by other nodes through the leader
```

### Hierarchical Agents

Create agent hierarchies:

```typescript
// Parent agent
const parentAgent = new oHumanLoginTool({
  address: new oNodeAddress('o://team/manager'),
  respond: async (intent) => 'Manager approved',
  answer: async (question) => 'Manager answered',
  receiveStream: async (data) => {}
});

await parentAgent.start();

// Child agent
const childAgent = new oAILoginTool({
  address: new oNodeAddress('o://team/assistant'),
  parent: parentAgent.address,
  respond: async (intent) => {
    // Escalate to parent if needed
    if (intent.includes('urgent')) {
      const parentResponse = await parentAgent.use(parentAgent.address, {
        method: 'intent',
        params: { intent }
      });
      return parentResponse.result.data.resolution;
    }
    return 'Assistant handled';
  },
  answer: async (question) => 'Assistant answered',
  receiveStream: async (data) => {}
});

await childAgent.start();
```

---

## Lifecycle Management {#lifecycle}

### Starting an Agent

```typescript
const agent = new oHumanLoginTool({
  respond: async (intent) => 'resolved',
  answer: async (question) => 'answered',
  receiveStream: async (data) => {}
});

// Start the agent (becomes addressable)
await agent.start();
console.log('Agent online at:', agent.address.toString());
```

### Stopping an Agent

```typescript
// Gracefully stop the agent
await agent.stop();
console.log('Agent offline');
```

### Error Handling

> **Note**: The callback functions (`respond`, `answer`, `receiveStream`) are user-provided and follow a different pattern from `_tool_` methods. In `_tool_` methods, you should throw errors for failures and the base class handles wrapping. In callbacks, you may catch and handle errors as shown below, since the base class will wrap the callback's return value into the standard response structure (`response.result.success`, `response.result.data`, `response.result.error`).

```typescript
const agent = new oHumanLoginTool({
  respond: async (intent: string) => {
    try {
      // Your logic
      return 'Success';
    } catch (error) {
      console.error('Error handling intent:', error);
      return 'Failed to process intent';
    }
  },
  
  answer: async (question: string) => {
    try {
      // Your logic
      return 'Answer';
    } catch (error) {
      console.error('Error answering question:', error);
      return 'Failed to answer question';
    }
  },
  
  receiveStream: async (data: any) => {
    try {
      // Your logic
    } catch (error) {
      console.error('Error processing stream:', error);
    }
  }
});
```

---

## Troubleshooting {#troubleshooting}

### Error: "Address already in use"

**Cause**: Another agent is already using the default address (`o://human` or `o://ai`).

**Solution**: Provide a custom address:
```typescript
const agent = new oHumanLoginTool({
  address: new oNodeAddress('o://team/alice'),
  // ... other config
});
```

---

### Error: "Cannot connect to leader"

**Cause**: Leader node is not reachable or not running.

**Solution**: 
1. Verify leader is running
2. Check leader address is correct
3. Or start without leader for local-only operation:
```typescript
const agent = new oHumanLoginTool({
  leader: null,  // No leader needed for local testing
  // ... other config
});
```

---

### Callback Function Not Called

**Cause**: Request is using wrong method name or parameters.

**Solution**: Verify the calling code uses correct method names:
- Use `method: 'intent'` (not `respond`)
- Use `method: 'question'` (not `answer`)
- Use `method: 'receive_stream'` (not `receiveStream`)

---

### TypeScript Type Errors

**Cause**: Missing peer dependencies.

**Solution**: Install all peer dependencies:
```bash
pnpm install @olane/o-core @olane/o-config @olane/o-protocol @olane/o-tool @olane/o-lane @olane/o-node
```

---

## Comparison: Human vs AI Login {#comparison}

| Aspect | `oHumanLoginTool` | `oAILoginTool` |
|--------|-------------------|----------------|
| **Default Address** | `o://human` | `o://ai` |
| **Use Case** | Human approval, oversight, decision-making | Automated processing, AI reasoning |
| **Response Time** | Slower (human input required) | Faster (automated) |
| **Context Handling** | Can interpret nuance | Requires context management |
| **Best For** | Approvals, complex decisions | Routine questions, data processing |

---

## Architecture {#architecture}

`o-login` nodes are **complex nodes** that use the `o-lane` capability loop for intent processing.

```
┌─────────────────────────────────────────────────────────────┐
│  o-login (extends oLaneTool)                                │
│                                                             │
│  Capabilities:                                              │
│  • Intent-driven interaction (via o-lane)                   │
│  • Addressable node (via o-node)                            │
│  • Tool discovery (via o-tool)                              │
│  • Network registration (via o-leader)                      │
│                                                             │
│  Three exposed tools:                                       │
│  • _tool_intent                                             │
│  • _tool_question                                           │
│  • _tool_receive_stream                                     │
└─────────────────────────────────────────────────────────────┘
```

**Related Concepts**:
- [Tools, Nodes, and Applications](/docs/concepts/tools-nodes-applications)
- [Human in the Loop](/docs/agents/human-in-the-loop)
- [Complex Nodes](/docs/concepts/nodes/complex-nodes)

---

## TypeScript Support {#typescript}

Full TypeScript definitions included:

```typescript
import { oLoginConfig } from '@olane/o-login';

// Config interface
interface oLoginConfig extends oNodeConfig {
  respond: (intent: string) => Promise<string>;
  answer: (intent: string) => Promise<string>;
  receiveStream: (data: any) => Promise<any>;
}

// Type-safe usage
const config: oLoginConfig = {
  respond: async (intent: string): Promise<string> => {
    return 'resolved';
  },
  answer: async (question: string): Promise<string> => {
    return 'answered';
  },
  receiveStream: async (data: any): Promise<any> => {
    console.log(data);
  }
};
```

---

## Related Packages {#related-packages}

- [`@olane/o-core`](../o-core) - Core primitives and base classes
- [`@olane/o-node`](../o-node) - Network-connected nodes with P2P
- [`@olane/o-tool`](../o-tool) - Tool augmentation system
- [`@olane/o-lane`](../o-lane) - Intent processing and capability loops
- [`@olane/o-leader`](../o-leader) - Service discovery and network coordination

---

## Next Steps {#next-steps}

**Learn More:**
- [Human in the Loop Patterns](https://olane.com/docs/agents/human-in-the-loop) - Understand the conceptual patterns
- [Package Reference](https://olane.com/docs/packages/o-login) - Complete API documentation
- [Working with Agents](https://olane.com/docs/agents/overview) - Agent integration guide
- [Complex Nodes](https://olane.com/docs/concepts/nodes/complex-nodes) - Understanding intent-driven nodes

**Build an Agent System:**
1. Create AI agent for routine tasks
2. Create human agent for escalations  
3. Implement escalation logic
4. Connect to existing nodes

**Integrate with Your App:**
1. Install `@olane/o-login`
2. Create agent login for your app
3. Handle intents and questions
4. Connect to Olane OS network

---

## Documentation {#documentation}

- [Full Documentation](https://olane.com/docs)
- [Human in the Loop Guide](https://olane.com/docs/agents/human-in-the-loop)
- [Package Reference](https://olane.com/docs/packages/o-login)
- [Olane OS Overview](../../README.md)

## Support {#support}

- [GitHub Issues](https://github.com/olane-labs/olane/issues)
- [Community Forum](https://olane.com/community)
- [Email Support](mailto:support@olane.com)

## License

ISC © Olane Inc.

---

**Part of the Olane OS ecosystem** - An agentic operating system where AI agents are the intelligent users, and you build the specialized tool nodes they use.

