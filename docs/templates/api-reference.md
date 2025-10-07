# API Reference Template

**Purpose**: Complete technical reference with examples  
**Location**: `api/{area}.mdx`

---

## Template

```mdx
---
title: "Tools API Reference"
description: "Complete reference for the oTool system"
---

## Overview

The `oTool` system provides convention-based tool registration, parameter validation, and discovery for specialist agents.

<Info>
  For a practical guide, see [Build Specialist Agents](/use-cases/specialist-agents/overview)
</Info>

## Classes

### oToolBase

Base class for creating tool-enabled agents.

```typescript
import { oToolBase } from '@olane/o-tool';

class MyTool extends oToolBase {
  async _tool_myMethod(request: oRequest): Promise<any> {
    // Tool implementation
  }
}
```

**Inheritance hierarchy**:
```
oCore (from @olane/o-core)
  ↓
oToolBase
  ↓
Your Tool Class
```

### oTool(BaseClass)

Mixin function to add tool capabilities to any class.

```typescript
import { oTool } from '@olane/o-tool';
import { oNode } from '@olane/o-node';

class MyAgent extends oTool(oNode) {
  // Now has both oNode networking + oTool capabilities
}
```

**Parameters**:

<ParamField path="BaseClass" type="class" required>
  Base class to augment with tool capabilities
</ParamField>

**Returns**: Extended class with tool system

### oNodeTool

Pre-built combination of `oNode` + `oTool`.

```typescript
import { oNodeTool } from '@olane/o-tool';

class MyAgent extends oNodeTool {
  // Has networking + tools
}
```

Equivalent to: `class MyAgent extends oTool(oNode) { }`

### oLaneTool

Pre-built combination of `oNode` + `oTool` + `oLane`.

```typescript
import { oLaneTool } from '@olane/o-lane';

class MyAgent extends oLaneTool {
  // Has networking + tools + intent execution
}
```

**Use when**: You need intent-driven execution with context injection

## Tool Convention

### Naming Convention

Tools use a prefix-based naming convention:

| Prefix | Purpose | Required |
|--------|---------|----------|
| `_tool_` | Executable tool method | Yes |

Method schemas are defined using **oMethod definition files** (e.g., `*.methods.ts`) that provide structured metadata for AI discovery.

### Tool Method

Define executable tool methods:

```typescript
async _tool_methodName(request: oRequest): Promise<any> {
  const { param1, param2 } = request.params;
  
  // Your logic here
  
  return {
    success: true,
    data: result
  };
}
```

**Parameters**:

<ParamField path="request" type="oRequest" required>
  Request object containing:
  - `method`: Tool method name (without `_tool_` prefix)
  - `params`: Method parameters
  - `id`: Request ID
  - `address`: Caller address
</ParamField>

**Returns**: Any JSON-serializable object

<CodeGroup>
```typescript Example: Basic Tool
async _tool_calculate(request: oRequest) {
  const { a, b, operation } = request.params;
  
  switch (operation) {
    case 'add': return { result: a + b };
    case 'multiply': return { result: a * b };
    default: throw new Error(`Unknown operation: ${operation}`);
  }
}
```

```typescript Example: Async Tool
async _tool_fetchData(request: oRequest) {
  const { url } = request.params;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    status: response.status,
    data
  };
}
```

```typescript Example: Tool with Validation
async _tool_processUser(request: oRequest) {
  const { userId, action } = request.params;
  
  // Manual validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }
  
  // Process
  const result = await this.performAction(userId, action);
  
  return { success: true, result };
}
```
</CodeGroup>

### Method Schema (oMethod Definition)

Define method schemas using oMethod definition files for AI discovery and automatic validation. Method definitions provide structured metadata that AI agents use to understand how to call your tool methods.

```typescript
// method-name.methods.ts
import { oMethod } from '@olane/o-protocol';

export const METHOD_DEFINITIONS: { [key: string]: oMethod } = {
  methodName: {
    name: 'methodName',
    description: 'Description of what this method does',
    dependencies: [],
    parameters: [
      {
        name: 'paramName',
        type: 'string' | 'number' | 'boolean' | 'object' | 'array',
        value: 'string' | 'number' | 'boolean' | 'object' | 'array',
        description: 'Parameter description',
        required: boolean,
      },
    ],
  },
};
```

<ParamField path="type" type="string" required>
  Parameter type: `string`, `number`, `boolean`, `object`, or `array`
</ParamField>

<ParamField path="required" type="boolean" default={false}>
  Whether parameter is required
</ParamField>

<ParamField path="description" type="string">
  Human-readable parameter description
</ParamField>

<ParamField path="default" type="any">
  Default value if not provided
</ParamField>

**Example**:

```typescript
// calculator.methods.ts - Define method schemas
import { oMethod } from '@olane/o-protocol';

export const CALCULATOR_METHODS: { [key: string]: oMethod } = {
  calculate: {
    name: 'calculate',
    description: 'Perform a calculation operation',
    dependencies: [],
    parameters: [
      {
        name: 'a',
        type: 'number',
        value: 'number',
        description: 'First operand',
        required: true,
      },
      {
        name: 'b',
        type: 'number',
        value: 'number',
        description: 'Second operand',
        required: true,
      },
      {
        name: 'operation',
        type: 'string',
        value: 'string',
        description: 'Operation to perform (add, multiply, etc.)',
        required: true,
      },
    ],
  },
};

// calculator.tool.ts - Use in tool
import { CALCULATOR_METHODS } from './calculator.methods';

class CalculatorTool extends oToolBase {
  constructor() {
    super({
      address: new oAddress('o://calculator'),
      methods: CALCULATOR_METHODS,
    });
  }
}
```

### Tool Description

Provide tool descriptions for LLM context:

```typescript
_description_methodName() {
  return 'Human-readable description of what this tool does';
}
```

**Example**:

```typescript
_description_calculate() {
  return 'Performs mathematical calculations on two numbers. Supports add, subtract, multiply, and divide operations.';
}
```

## Built-in Tools

All tool-enabled agents include these built-in tools:

<AccordionGroup>
  <Accordion title="handshake">
    Negotiate capabilities between agents
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://other-agent',
      method: 'handshake'
    });
    ```
    
    **Returns**: Agent capabilities, available methods, and metadata
  </Accordion>

  <Accordion title="route">
    Route request to appropriate destination
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://target',
      method: 'route',
      params: {
        destination: 'o://final-destination',
        request: { /* forwarded request */ }
      }
    });
    ```
  </Accordion>

  <Accordion title="hello_world">
    Test connectivity
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://test-agent',
      method: 'hello_world'
    });
    ```
    
    **Returns**: `{ message: 'Hello from {address}' }`
  </Accordion>

  <Accordion title="stop">
    Gracefully shutdown agent
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://agent-to-stop',
      method: 'stop'
    });
    ```
  </Accordion>
</AccordionGroup>

## Tool Discovery

### Listing Tools

Get all available tools on an agent:

```typescript
const tools = await agent.listTools();

// Returns array of tool metadata
[
  {
    name: 'calculate',
    description: 'Performs mathematical calculations',
    parameters: {
      a: { type: 'number', required: true },
      b: { type: 'number', required: true }
    }
  },
  // ... more tools
]
```

### Tool Indexing

Index tools in vector store for semantic search:

```typescript
await agent.use({
  method: 'index_network',
  params: {
    vectorStore: yourVectorStore,
    includeTools: true
  }
});
```

### Searching Tools

Find tools by semantic meaning:

```typescript
const results = await vectorStore.search(
  'financial analysis tools'
);

// Returns relevant tools:
// - analyze_revenue
// - forecast_growth
// - assess_risk
```

## Error Handling

Tool methods should throw errors for invalid inputs:

```typescript
async _tool_divide(request: oRequest) {
  const { a, b } = request.params;
  
  if (b === 0) {
    throw new Error('Division by zero not allowed');
  }
  
  return { result: a / b };
}
```

Error response format:

<ResponseExample>
```json Error Response
{
  "jsonrpc": "2.0",
  "id": "req_123",
  "error": {
    "code": -32000,
    "message": "Division by zero not allowed",
    "data": {
      "method": "divide",
      "params": { "a": 10, "b": 0 }
    }
  }
}
```
</ResponseExample>

## Complete Example

Full implementation of a tool-enabled agent:

<CodeGroup>
```typescript Complete Example
// calculator.methods.ts - Define method schemas
import { oMethod } from '@olane/o-protocol';

export const CALCULATOR_METHODS: { [key: string]: oMethod } = {
  add: {
    name: 'add',
    description: 'Adds two numbers together',
    dependencies: [],
    parameters: [
      {
        name: 'a',
        type: 'number',
        value: 'number',
        description: 'First number',
        required: true,
      },
      {
        name: 'b',
        type: 'number',
        value: 'number',
        description: 'Second number',
        required: true,
      },
    ],
  },
  divide: {
    name: 'divide',
    description: 'Divides first number by second number. Throws error if divisor is zero.',
    dependencies: [],
    parameters: [
      {
        name: 'a',
        type: 'number',
        value: 'number',
        description: 'Dividend',
        required: true,
      },
      {
        name: 'b',
        type: 'number',
        value: 'number',
        description: 'Divisor',
        required: true,
      },
    ],
  },
};

// calculator.agent.ts - Implement the tool
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';
import { CALCULATOR_METHODS } from './calculator.methods';

export class CalculatorAgent extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://tools/calculator'),
      name: 'Calculator',
      description: 'Mathematical calculation agent',
      methods: CALCULATOR_METHODS,
    });
  }

  // Addition tool
  async _tool_add(request: oRequest) {
    const { a, b } = request.params;
    return { result: a + b, operation: 'addition' };
  }

  // Division tool
  async _tool_divide(request: oRequest) {
    const { a, b } = request.params;
    
    if (b === 0) {
      throw new Error('Division by zero not allowed');
    }
    
    return { 
      result: a / b, 
      operation: 'division',
      precision: 2 
    };
  }
}

// Usage
const calculator = new CalculatorAgent();
await calculator.start();

// Direct tool call
const sum = await calculator.use({
  method: 'add',
  params: { a: 5, b: 3 }
});
console.log(sum); // { result: 8, operation: 'addition' }

// Intent-driven
const result = await calculator.use({
  method: 'intent',
  params: {
    intent: 'Calculate 10 divided by 2'
  }
});
// Agent resolves intent → calls divide tool
```
</CodeGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Build Specialist Agent" icon="rocket" href="/use-cases/specialist-agents/quickstart">
    Create your first tool
  </Card>
  <Card title="Tool Concepts" icon="book" href="/concepts/tools/overview">
    Learn tool system
  </Card>
  <Card title="Parameter Validation" icon="check" href="/concepts/tools/parameter-validation">
    Advanced validation
  </Card>
  <Card title="Examples" icon="code" href="/examples">
    See more examples
  </Card>
</CardGroup>

## Related APIs

- [Agents API](/api/agents)
- [Lanes API](/api/lanes)
- [Communication API](/api/communication)
```

---

## Section Breakdown

### Overview
- **1-2 sentences** describing the API
- Link to practical guide
- State the purpose clearly

### Classes
For each class:
- **Class name as heading**
- Brief description
- Basic usage example
- Inheritance hierarchy (if applicable)
- When to use

### Methods/Functions
For each method:
- **Method signature**
- Description
- Parameters (use `<ParamField>`)
- Return value
- 2-3 code examples showing different use cases

### Parameter Documentation
Use structured `<ParamField>` components:
```mdx
<ParamField path="name" type="type" required>
  Description
</ParamField>
```

### Examples
- Multiple examples per method
- Use `<CodeGroup>` for variants
- Show common patterns
- Include error handling

### Complete Example
- **Full working code** at the end
- Demonstrates multiple features
- Ready to copy and run
- Includes usage examples

---

## Best Practices

### Structure
```markdown
1. Overview + quick links
2. Classes/main concepts
3. Detailed API docs
4. Code examples
5. Error handling
6. Complete example
7. Next steps
```

### Parameter Fields
Always include:
```mdx
<ParamField path="name" type="string" required>
  Clear description of what this parameter does
</ParamField>
```

### Multiple Examples
Show variety of use cases:
```typescript
// Example 1: Basic usage
// Example 2: Async/complex
// Example 3: With validation
```

### Error Documentation
Show error responses:
```json
{
  "error": {
    "code": -32000,
    "message": "Error description"
  }
}
```

### Cross-Links
Link to:
- Related APIs
- Concept pages
- Practical guides
- Examples

