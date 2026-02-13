# @olane/o-tool

> Tool augmentation system for Olane OS - build specialized tool nodes (applications) that AI agents use

The tool system layer of Olane OS. Transform generalist LLMs into specialists through tool augmentation and context injection - create discoverable, validated capabilities without fine-tuning models.

[![npm version](https://img.shields.io/npm/v/@olane/o-tool.svg)](https://www.npmjs.com/package/@olane/o-tool)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- 🔧 **Convention-Based Tool Registration** - Automatic discovery via `_tool_` prefix
- ✅ **Built-in Parameter Validation** - Type-safe parameter checking with clear error messages
- 🔍 **Automatic Discovery** - Tools indexed in vector store for semantic search by agents
- 🏗️ **Mixin Architecture** - Compose tool capabilities with any `oCore` class
- 🌲 **Hierarchical Organization** - Inherit context and capabilities from parent tools
- 📡 **Streaming Support** - Handle long-running operations with progress updates
- 🎯 **Built-in Tools** - Handshake, routing, indexing, and lifecycle management included

## Installation

```bash
pnpm install @olane/o-tool
```

## Quick Start

### Creating a Simple Tool

```typescript
import { oToolBase, oRequest, ToolResult } from '@olane/o-tool';
import { oAddress } from '@olane/o-core';

class CalculatorTool extends oToolBase {
  constructor() {
    super({
      address: new oAddress('o://calculator'),
      description: 'Performs mathematical calculations',
      methods: {
        add: {
          description: 'Add two numbers',
          parameters: {
            a: { type: 'number', required: true },
            b: { type: 'number', required: true }
          }
        }
      }
    });
  }

  // Tool methods use _tool_ prefix for automatic registration
  async _tool_add(request: oRequest): Promise<ToolResult> {
    const { a, b } = request.params;
    return { result: a + b };
  }
}

// Start the tool
const calculator = new CalculatorTool();
await calculator.start();

// Use the tool
const response = await calculator.use({
  method: 'add',
  params: { a: 5, b: 3 }
});

// response.result.success === true
// response.result.data contains the tool's return value
console.log(response.result.data); // { result: 8 }
```

### Using the Mixin Pattern

Extend any `oCore` class with tool capabilities:

```typescript
import { oTool } from '@olane/o-tool';
import { oNode } from '@olane/o-node';

class MyNetworkTool extends oTool(oNode) {
  constructor(config) {
    super(config);
  }

  async _tool_process(request: oRequest): Promise<ToolResult> {
    // Your custom logic here
    return { status: 'processed' };
  }
}
```

## Core Concepts

### Tool Convention Pattern

Tools are automatically discovered using naming conventions:

- **`_tool_methodName`** - Defines an executable tool method

Method metadata is defined using `oMethod` definition files that provide structured schemas for AI agents to understand how to use your tool methods.

```typescript
// weather.methods.ts - Define method schemas for AI discovery
import { oMethod } from '@olane/o-protocol';

export const WEATHER_METHODS: { [key: string]: oMethod } = {
  get_forecast: {
    name: 'get_forecast',
    description: 'Get weather forecast for a city',
    dependencies: [],
    parameters: [
      {
        name: 'city',
        type: 'string',
        value: 'string',
        description: 'City name to get forecast for',
        required: true,
      },
    ],
  },
};

// weather.tool.ts - Implement the tool
class WeatherTool extends oToolBase {
  constructor() {
    super({
      address: new oAddress('o://weather'),
      description: 'Weather forecast service',
      methods: WEATHER_METHODS,
    });
  }

  // Executable tool method
  async _tool_get_forecast(request: oRequest): Promise<ToolResult> {
    const { city } = request.params;
    return { forecast: '☀️ Sunny, 72°F' };
  }
}
```

### Built-in Tools

Every tool automatically includes these methods:

| Method | Description |
|--------|-------------|
| `handshake` | Capability negotiation between agents |
| `route` | Route requests through the hierarchy |
| `index_network` | Index tool in vector store for discovery |
| `hello_world` | Connectivity test |
| `stop` | Graceful shutdown |
| `child_register` | Register child tools in hierarchy |

### Automatic Validation

Parameter validation happens automatically before tool execution:

```typescript
// Missing required parameters trigger clear errors
const response = await tool.use({ method: 'add', params: { a: 5 } });

if (!response.result.success) {
  // Error: Missing required parameters: ["b"]
  console.log(response.result.error);
}
```

### Response Structure

When calling tools via `node.use()`, responses follow a standard wrapped structure:

```typescript
{
  jsonrpc: "2.0",
  id: "request-id",
  result: {
    success: boolean,    // Whether the call succeeded
    data: any,           // The return value on success
    error?: string       // Error message on failure
  }
}
```

Always access response fields through the `result` property:

```typescript
const response = await tool.use(tool.address, {
  method: 'some_method',
  params: { /* ... */ }
});

// Check success
if (response.result.success) {
  const data = response.result.data;    // Access return value
} else {
  const error = response.result.error;  // Access error message
}
```

> **Common mistake**: Accessing `response.success` or `response.data` directly will not work. Always use `response.result.success`, `response.result.data`, and `response.result.error`.

## Examples

### Search Tool with Vector Store Integration

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';

class SearchTool extends oLaneTool {
  constructor(config) {
    super({
      ...config,
      address: new oAddress('o://search'),
      description: 'Search for information in the network'
    });
  }

  async _tool_vector(request: oRequest): Promise<ToolResult> {
    const { query } = request.params;
    
    const response = await this.use(new oAddress('o://vector-store'), {
      method: 'search_similar',
      params: { query, limit: 10 }
    });
    
    return response.result.data;
  }
}
```

### Tool with Streaming Support

```typescript
class DataProcessorTool extends oToolBase {
  async _tool_process_large_file(request: oRequest & { stream?: Stream }): Promise<ToolResult> {
    const { filePath } = request.params;
    const { stream } = request;
    
    // Send progress updates
    for (let i = 0; i < 100; i += 10) {
      if (stream) {
        await CoreUtils.sendResponse(
          { progress: i, status: 'processing' },
          stream
        );
      }
    }
    
    return { status: 'complete', processed: true };
  }
}
```

### Hierarchical Tool Organization

```typescript
// Parent tool
const parentTool = new CalculatorTool();
await parentTool.start();

// Child tool inherits context from parent
class AdvancedCalculatorTool extends oToolBase {
  async initialize() {
    await super.initialize();
    
    // Register with parent
    await this.use(new oAddress('o://calculator'), {
      method: 'child_register',
      params: { address: this.address.toString() }
    });
  }

  async _tool_complex_calculation(request: oRequest): Promise<ToolResult> {
    // Can leverage parent tool capabilities
    const response = await this.use(new oAddress('o://calculator'), {
      method: 'add',
      params: { a: 10, b: 20 }
    });

    if (!response.result.success) {
      throw new Error(response.result.error);
    }

    return { result: response.result.data.result * 2 };
  }
}
```

## API Reference

### `oToolBase`

Base class for creating tools.

**Key Methods:**
- `execute(request: oRequest, stream?: Stream): Promise<RunResult>` - Execute tool with request
- `run(request: oRequest, stream?: Stream): Promise<RunResult>` - Run with validation
- `myTools(): Promise<string[]>` - Get list of available tool methods
- `callMyTool(request: oRequest, stream?: Stream): Promise<ToolResult>` - Call specific tool method
- `index(): Promise<{summary: string}>` - Index tool in vector store
- `whoami(): Promise<object>` - Get tool metadata

### `oTool(Base)`

Mixin function that adds tool capabilities to any `oCore` class.

```typescript
function oTool<T extends new (...args: any[]) => oToolBase>(Base: T): T
```

**Usage:**
```typescript
class CustomTool extends oTool(MyBaseClass) {
  // Tool methods...
}
```

### Interfaces

#### `oToolConfig`
```typescript
interface oToolConfig extends Omit<oCoreConfig, 'address'> {
  description?: string;
  methods?: Record<string, MethodMetadata>;
}
```

#### `ToolResult`
```typescript
interface ToolResult {
  [key: string]: unknown;
}
```

#### `RunResult`
```typescript
interface RunResult extends ToolResult {
  error?: oError;
}
```

### Utilities

#### `MethodUtils.findMissingParams(tool, method, params)`

Validates parameters against tool method requirements.

```typescript
const missing = MethodUtils.findMissingParams(tool, 'add', { a: 5 });
// Returns: ['b']
```

## Tool Discovery & Indexing

Tools automatically integrate with Olane's vector store for semantic discovery:

```typescript
// Index your tool for agent discovery
await tool.use({ method: 'index_network' });

// Agents can now discover your tool semantically
const results = await this.use(new oAddress('o://vector-store'), {
  method: 'search_similar',
  params: { query: 'calculate numbers' }
});
// Returns: o://calculator with tool descriptions
```

## Error Handling

Tools use structured error handling with `oError`:

```typescript
import { oError, oErrorCodes } from '@olane/o-core';

async _tool_divide(request: oRequest): Promise<ToolResult> {
  const { a, b } = request.params;
  
  if (b === 0) {
    throw new oError(
      oErrorCodes.INVALID_PARAMETERS,
      'Cannot divide by zero',
      { a, b }
    );
  }
  
  return { result: a / b };
}
```

## Testing

This project uses Mocha/Chai via [aegir](https://github.com/ipfs/aegir) for testing. Do not use Jest.

```typescript
import { expect } from 'aegir/chai';
import { oRequest } from '@olane/o-core';

describe('CalculatorTool', () => {
  let tool: CalculatorTool;

  before(async () => {
    tool = new CalculatorTool();
    await tool.start();
  });

  it('should add two numbers', async () => {
    const response = await tool.use(tool.address, {
      method: 'add',
      params: { a: 5, b: 3 }
    });

    expect(response.result.success).to.be.true;
    expect(response.result.data.result).to.equal(8);
  });

  it('should return error for missing params', async () => {
    const response = await tool.use(tool.address, {
      method: 'add',
      params: { a: 5 }
    });

    expect(response.result.success).to.be.false;
    expect(response.result.error).to.exist;
  });

  after(async () => {
    await tool.stop();
  });
});
```

## Related Packages

- **[@olane/o-core](../o-core)** - Core OS functionality and base classes
- **[@olane/o-node](../o-node)** - Network-connected tools with P2P capabilities
- **[@olane/o-protocol](../o-protocol)** - Protocol definitions and types
- **[@olane/o-lane](../o-lane)** - Lane-based tool organization
- **[@olane/o-tools-common](../o-tools-common)** - Pre-built common tools

## Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details on our code of conduct and development process.

## License

ISC © oLane Inc.

## Resources

- [Full Documentation](../../docs)
- [Olane OS Overview](../../README.md)
- [Examples](../../examples)
- [GitHub Repository](https://github.com/olane-labs/olane)
- [Report Issues](https://github.com/olane-labs/olane/issues)
