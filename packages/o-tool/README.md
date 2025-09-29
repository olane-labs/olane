# @olane/o-tool

> Base class for building specialized AI agent tools in Olane OS

Transform generalist LLMs into specialist agents through tool augmentation. `o-tool` provides the foundation for creating discoverable, validated, and hierarchically-organized agent capabilities.

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
npm install @olane/o-tool
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
const response = await calculator.useSelf({
  method: 'add',
  params: { a: 5, b: 3 }
});

console.log(response.result); // { result: 8 }
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
- **`_params_methodName`** - Defines parameter schema (optional)

```typescript
class WeatherTool extends oToolBase {
  // Executable tool method
  async _tool_get_forecast(request: oRequest): Promise<ToolResult> {
    const { city } = request.params;
    return { forecast: '☀️ Sunny, 72°F' };
  }

  // Parameter schema (optional)
  _params_get_forecast() {
    return {
      city: { type: 'string', required: true, description: 'City name' }
    };
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
try {
  await tool.useSelf({ method: 'add', params: { a: 5 } });
} catch (error) {
  // Error: Missing required parameters: ["b"]
  console.log(error.message);
}
```

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
    const result = await this.use(new oAddress('o://calculator'), {
      method: 'add',
      params: { a: 10, b: 20 }
    });
    
    return { result: result.result * 2 };
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
await tool.useSelf({ method: 'index_network' });

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

```typescript
import { oRequest } from '@olane/o-core';

describe('CalculatorTool', () => {
  let tool: CalculatorTool;
  
  beforeEach(async () => {
    tool = new CalculatorTool();
    await tool.start();
  });
  
  it('should add two numbers', async () => {
    const request = new oRequest({
      method: 'add',
      params: { a: 5, b: 3 },
      id: '123'
    });
    
    const result = await tool.callMyTool(request);
    expect(result.result).toBe(8);
  });
  
  afterEach(async () => {
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
