# Building Agent-Agnostic Tools with o-node-template

Agents (human or AI) are the users of oLane OS. This guide helps you use the **o-node-template** to build agent-agnostic tools—tools that serve both human users and AI agents through a unified natural language interface.

## What is o-node-template?

**o-node-template** is a comprehensive starting point for creating new oLane tools. It provides:

- **Complete tool implementation example** demonstrating best practices
- **TypeScript configuration** optimized for oLane development
- **Testing infrastructure** with Jest and example tests
- **Method definitions** showing how to make tools discoverable to AI agents
- **Type-safe interfaces** for configuration, requests, and responses
- **Development tooling** including ESLint, Prettier, and debugging configurations

### When to use o-node-template

**Use this template when:**
- Creating a new standalone oLane tool from scratch
- Building tools that need to serve both human and AI agents
- Developing utilities, integrations, or services for the oLane ecosystem
- Starting with best practices and proper project structure

**Consider other approaches when:**
- Contributing to an existing tool or package
- Building MCP-specific integrations (see `@olane/o-mcp` patterns)
- Creating tools for private/enterprise use (see `@olane-labs/*` packages)

## Core Concept: Agent-Agnostic Design

The fundamental principle of oLane tools is **agent-agnostic design**—the same code serves both human and AI agents through a unified interface.

### How It Works

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oRequest } from '@olane/o-core';

class WeatherTool extends oLaneTool {
  async _tool_get_forecast(request: oRequest) {
    const { city, days } = request.params;

    // Same logic serves BOTH:
    // 1. Human typing: o-weather get-forecast --city "San Francisco" --days 5
    // 2. AI agent deciding: "I need the weather forecast for San Francisco"

    const forecast = await this.weatherAPI.getForecast(city, days);

    return {
      success: true,
      forecast,
      city,
      days
    };
  }
}
```

Whether invoked by a human through CLI or an AI agent making autonomous decisions, the same tool method handles both seamlessly.

### Why This Matters

**For Human Users:**
- Consistent, predictable interfaces
- Rich documentation and error messages
- Flexible parameter handling

**For AI Agents:**
- Discoverable capabilities through method schemas
- Clear parameter requirements and types
- Structured responses for decision-making

## Template Architecture

The o-node-template provides a complete example demonstrating key architectural components:

### Tool Class Structure

```typescript
// src/example-tool.tool.ts
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress, oNodeToolConfig } from '@olane/o-node';

export class ExampleTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://example'),
      description: 'Tool description for discovery',
      methods: EXAMPLE_METHODS, // Method definitions
    });
  }

  // Methods with _tool_ prefix are automatically discoverable
  async _tool_example_method(request: oRequest): Promise<ToolResult> {
    // Implementation
  }
}
```

**Key elements:**
- Extends `oLaneTool` base class
- Uses `oNodeAddress` for unique identification
- Registers method definitions for discoverability
- Methods prefixed with `_tool_` are exposed to agents

### Method Definitions

```typescript
// src/methods/example.methods.ts
import { oMethod } from '@olane/o-protocol';

export const EXAMPLE_METHODS: { [key: string]: oMethod } = {
  example_method: {
    name: 'example_method',
    description: 'Clear description AI agents can understand',
    parameters: [
      {
        name: 'message',
        type: 'string',
        description: 'What this parameter does',
        required: true,
      },
      {
        name: 'metadata',
        type: 'object',
        description: 'Optional context information',
        required: false,
      }
    ],
    dependencies: [], // Other methods this depends on
  }
};
```

**Method definitions enable:**
- Automatic discovery by AI agents via `myTools()`
- Parameter validation and type checking
- Self-documenting APIs
- Natural language understanding of capabilities

### File Structure

```
src/
├── index.ts                      # Main exports
├── example-tool.tool.ts         # Tool class implementation
└── methods/
    └── example.methods.ts       # Method definitions for discoverability
```

**Best practices:**
- Keep tool logic in the main tool file
- Define all methods in a separate methods file
- Export everything through index.ts
- Use interfaces for complex types (add `interfaces/` directory as needed)

## Quick Start: Creating Your Tool

### Step 1: Clone and Set Up

```bash
# Clone the template
git clone https://github.com/olane-labs/o-node-template.git my-tool
cd my-tool

# Install dependencies
npm install

# Verify setup
npm run build
npm test
```

### Step 2: Customize Package Information

**Update `package.json`:**
```json
{
  "name": "@olane/o-my-tool",  // Your tool name
  "description": "Description of what your tool does",
  "repository": {
    "url": "git+https://github.com/your-org/o-my-tool.git"
  }
}
```

### Step 3: Rename Files

```bash
# Rename the example tool file
mv src/example-tool.tool.ts src/my-tool.tool.ts

# Update method definitions file name if desired
mv src/methods/example.methods.ts src/methods/my-tool.methods.ts
```

### Step 4: Implement Your Tool

**Define your methods** in `src/methods/my-tool.methods.ts`:

```typescript
export const MY_TOOL_METHODS: { [key: string]: oMethod } = {
  process_data: {
    name: 'process_data',
    description: 'Process and validate data according to specified rules',
    parameters: [
      {
        name: 'data',
        type: 'object',
        description: 'The data object to process',
        required: true,
      },
      {
        name: 'rules',
        type: 'array',
        description: 'Validation rules to apply',
        required: false,
      }
    ],
    dependencies: [],
  }
};
```

**Implement the tool class** in `src/my-tool.tool.ts`:

```typescript
export class MyTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://my-tool'),
      description: 'My tool for data processing',
      methods: MY_TOOL_METHODS,
    });
  }

  async _tool_process_data(request: oRequest): Promise<ToolResult> {
    try {
      const { data, rules = [] } = request.params;

      // Validate required parameters
      if (!data) {
        return {
          success: false,
          error: 'Parameter "data" is required'
        };
      }

      // Your implementation here
      const processed = this.process(data, rules);

      return {
        success: true,
        processed,
        rulesApplied: rules.length
      };
    } catch (error: any) {
      this.logger.error('Error processing data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private process(data: any, rules: any[]): any {
    // Your processing logic
    return data;
  }
}
```

**Update exports** in `src/index.ts`:

```typescript
export * from './my-tool.tool.js';
export * from './methods/my-tool.methods.js';
```

### Step 5: Test and Build

```bash
# Build
npm run build

# Test
npm test

# Run in development mode
npm run dev
```

## Building Agent-Friendly Tools

### Method Design Principles

**1. Clear, Descriptive Names**

```typescript
// ✅ Good: Verb-noun pattern, clear intent
get_user_profile
create_database_backup
validate_email_format
calculate_tax_amount

// ❌ Avoid: Vague or ambiguous names
do_thing
process
handle
execute
```

**2. Comprehensive Parameter Schemas**

```typescript
// ✅ Good: Complete information for AI understanding
{
  name: 'email',
  type: 'string',
  description: 'User email address in standard format (user@domain.com)',
  required: true,
}

// ❌ Avoid: Minimal descriptions
{
  name: 'email',
  type: 'string',
  description: 'Email',
  required: true,
}
```

**3. Appropriate Required vs. Optional Parameters**

```typescript
// ✅ Good: Sensible defaults, required only what's necessary
parameters: [
  {
    name: 'city',
    type: 'string',
    description: 'City name for weather lookup',
    required: true,  // Can't work without this
  },
  {
    name: 'days',
    type: 'number',
    description: 'Number of forecast days (default: 5)',
    required: false,  // Has reasonable default
  }
]
```

### Response Patterns

**Structured Success Responses:**

```typescript
// ✅ Good: Rich, structured responses
async _tool_fetch_data(request: oRequest): Promise<ToolResult> {
  const data = await this.fetchFromAPI();

  return {
    success: true,
    data,
    recordCount: data.length,
    timestamp: Date.now(),
    source: 'api-v2'
  };
}
```

**Actionable Error Responses:**

```typescript
// ✅ Good: Structured errors agents can act on
async _tool_process(request: oRequest): Promise<ToolResult> {
  try {
    // ... implementation
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded (100 requests/hour)',
        retryable: true,
        retryAfter: 3600, // seconds
        suggestedAction: 'Wait 1 hour or use premium API key'
      }
    };
  }
}

// ❌ Avoid: Bare error throws
async _tool_process(request: oRequest): Promise<ToolResult> {
  // If this throws, agent doesn't know if retry will help
  const result = await this.api.call();
  return { success: true, result };
}
```

### Documentation for Discoverability

**JSDoc Comments:**

```typescript
/**
 * Fetch weather forecast for a specified city
 *
 * This method queries an external weather API and returns
 * a forecast for the specified number of days.
 *
 * @param request - oRequest with city and days parameters
 * @returns Weather forecast with temperature, conditions, and alerts
 *
 * @example
 * ```typescript
 * const result = await tool.callMyTool({
 *   method: 'get_forecast',
 *   params: { city: 'Seattle', days: 3 }
 * });
 * ```
 */
async _tool_get_forecast(request: oRequest): Promise<ToolResult> {
  // Implementation
}
```

## Common Tool Patterns

### Pattern 1: Simple Utility Tool

**Use case:** Stateless operations, data transformation, calculations

```typescript
export class TextUtilityTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://text-util'),
      methods: TEXT_METHODS,
    });
  }

  async _tool_transform_case(request: oRequest): Promise<ToolResult> {
    const { text, format } = request.params;

    const transforms = {
      upper: (s: string) => s.toUpperCase(),
      lower: (s: string) => s.toLowerCase(),
      title: (s: string) => s.replace(/\w\S*/g, t =>
        t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()
      )
    };

    return {
      success: true,
      original: text,
      transformed: transforms[format](text),
      format
    };
  }

  async _tool_count_words(request: oRequest): Promise<ToolResult> {
    const { text } = request.params;
    const words = text.trim().split(/\s+/).filter(Boolean);

    return {
      success: true,
      wordCount: words.length,
      characterCount: text.length,
      uniqueWords: new Set(words.map(w => w.toLowerCase())).size
    };
  }
}
```

### Pattern 2: External API Integration

**Use case:** Wrapping third-party services with agent-friendly interface

```typescript
import axios from 'axios';

export class WeatherTool extends oLaneTool {
  private apiKey: string;
  private baseURL = 'https://api.weather.com';

  constructor(config: WeatherToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://weather'),
      methods: WEATHER_METHODS,
    });
    this.apiKey = config.apiKey || process.env.WEATHER_API_KEY;
  }

  async _tool_get_forecast(request: oRequest): Promise<ToolResult> {
    try {
      const { city, days = 5 } = request.params;

      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: { q: city, days },
        headers: { 'X-API-Key': this.apiKey }
      });

      return {
        success: true,
        city,
        forecast: response.data.forecast,
        days,
        updatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      if (error.response?.status === 429) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'Weather API rate limit exceeded',
            retryable: true,
            retryAfter: 3600
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message,
          retryable: false
        }
      };
    }
  }

  async _tool_get_alerts(request: oRequest): Promise<ToolResult> {
    const { city } = request.params;

    const response = await axios.get(`${this.baseURL}/alerts`, {
      params: { q: city },
      headers: { 'X-API-Key': this.apiKey }
    });

    return {
      success: true,
      city,
      alerts: response.data.alerts,
      alertCount: response.data.alerts.length
    };
  }
}
```

### Pattern 3: Stateful Tools

**Use case:** Tools that maintain state between calls

```typescript
export class SessionTool extends oLaneTool {
  private sessions: Map<string, any> = new Map();

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://session'),
      methods: SESSION_METHODS,
    });
  }

  async _tool_create_session(request: oRequest): Promise<ToolResult> {
    const { sessionId, config = {} } = request.params;

    if (this.sessions.has(sessionId)) {
      return {
        success: false,
        error: `Session ${sessionId} already exists`
      };
    }

    this.sessions.set(sessionId, {
      id: sessionId,
      config,
      createdAt: Date.now(),
      data: {}
    });

    return {
      success: true,
      sessionId,
      message: 'Session created successfully'
    };
  }

  async _tool_update_session(request: oRequest): Promise<ToolResult> {
    const { sessionId, data } = request.params;

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} not found`
      };
    }

    session.data = { ...session.data, ...data };
    session.updatedAt = Date.now();

    return {
      success: true,
      sessionId,
      data: session.data
    };
  }

  async _tool_get_session(request: oRequest): Promise<ToolResult> {
    const { sessionId } = request.params;
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} not found`
      };
    }

    return {
      success: true,
      session
    };
  }

  async _tool_delete_session(request: oRequest): Promise<ToolResult> {
    const { sessionId } = request.params;
    const existed = this.sessions.delete(sessionId);

    return {
      success: true,
      deleted: existed,
      message: existed ? 'Session deleted' : 'Session did not exist'
    };
  }
}
```

## Method Definition Best Practices

### Naming Conventions

Use clear **verb-noun** patterns:

```typescript
// ✅ Good naming
get_user          // Retrieve
create_order      // Create new
update_profile    // Modify existing
delete_item       // Remove
validate_input    // Check/verify
calculate_total   // Compute
fetch_data        // Retrieve from external
send_notification // Transmit
process_payment   // Handle operation

// ❌ Avoid unclear names
handle_user
do_order
thing
exec
```

### Parameter Design

```typescript
// ✅ Good: Complete parameter definition
{
  name: 'email',
  type: 'string',
  description: 'User email address in RFC 5322 format. Used for notifications and authentication.',
  required: true,
}

// ✅ Good: Complex type with clear structure
{
  name: 'options',
  type: 'object',
  description: 'Configuration options with fields: timeout (number, ms), retries (number), headers (object)',
  required: false,
}

// ✅ Good: Union types
{
  name: 'format',
  type: 'string',
  description: 'Output format: "json" | "xml" | "csv"',
  required: false,
}
```

### Dependencies Between Methods

```typescript
// Example: Method that depends on another
export const METHODS = {
  initialize: {
    name: 'initialize',
    description: 'Initialize the connection',
    parameters: [...],
    dependencies: [], // No dependencies
  },

  execute_query: {
    name: 'execute_query',
    description: 'Execute a database query',
    parameters: [...],
    dependencies: ['initialize'], // Must call initialize first
  },

  close: {
    name: 'close',
    description: 'Close the connection',
    parameters: [],
    dependencies: ['initialize'], // Must initialize before closing
  }
};
```

## Testing for Agent Interactions

### Test Method Discovery

```typescript
// test/discovery.spec.ts
import { MyTool } from '../src';

describe('MyTool - Agent Discovery', () => {
  let tool: MyTool;

  beforeAll(async () => {
    tool = new MyTool({});
    await tool.start();
  });

  afterAll(async () => {
    await tool.stop();
  });

  it('should list all available methods', async () => {
    const methods = await tool.myTools();

    expect(methods).toContain('process_data');
    expect(methods).toContain('get_status');
    expect(methods.length).toBeGreaterThan(0);
  });

  it('should provide method descriptions', async () => {
    const methodInfo = tool.getMethodInfo('process_data');

    expect(methodInfo.description).toBeDefined();
    expect(methodInfo.parameters).toBeInstanceOf(Array);
  });
});
```

### Test Parameter Validation

```typescript
// test/validation.spec.ts
describe('MyTool - Parameter Validation', () => {
  it('should reject missing required parameters', async () => {
    const result = await tool.callMyTool({
      method: 'process_data',
      params: {} // Missing required 'data' parameter
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should accept valid parameters', async () => {
    const result = await tool.callMyTool({
      method: 'process_data',
      params: {
        data: { test: true },
        rules: ['validate']
      }
    });

    expect(result.success).toBe(true);
  });

  it('should use default values for optional parameters', async () => {
    const result = await tool.callMyTool({
      method: 'process_data',
      params: { data: { test: true } }
      // 'rules' parameter omitted
    });

    expect(result.success).toBe(true);
  });
});
```

### Test Error Responses

```typescript
// test/errors.spec.ts
describe('MyTool - Error Handling', () => {
  it('should return structured errors', async () => {
    // Simulate error condition
    const result = await tool.callMyTool({
      method: 'process_data',
      params: { data: null }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Check if error is structured (not just a string)
    if (typeof result.error === 'object') {
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toBeDefined();
    }
  });

  it('should indicate if errors are retryable', async () => {
    // Test retry logic
    const result = await tool.callMyTool({
      method: 'external_call',
      params: { endpoint: 'failing' }
    });

    if (!result.success && typeof result.error === 'object') {
      expect(result.error).toHaveProperty('retryable');
    }
  });
});
```

### Test Complete Workflows

```typescript
// test/workflows.spec.ts
describe('MyTool - Agent Workflows', () => {
  it('should support multi-step agent workflow', async () => {
    // Step 1: Initialize
    const init = await tool.callMyTool({
      method: 'initialize',
      params: { config: { mode: 'test' } }
    });
    expect(init.success).toBe(true);

    // Step 2: Process data
    const process = await tool.callMyTool({
      method: 'process_data',
      params: { data: { value: 123 } }
    });
    expect(process.success).toBe(true);

    // Step 3: Get status
    const status = await tool.callMyTool({
      method: 'get_status',
      params: {}
    });
    expect(status.success).toBe(true);
    expect(status.initialized).toBe(true);
  });
});
```

## Tool Discovery & Registration

### How AI Agents Discover Your Tool

When an AI agent encounters your tool, it uses the following discovery process:

1. **Tool Registration**: Your tool registers with the oLane registry
2. **Method Listing**: Agent calls `myTools()` to get available methods
3. **Schema Inspection**: Agent reads method definitions to understand parameters
4. **Execution**: Agent calls methods based on understanding of capabilities

### Implementing `myTools()`

The base `oLaneTool` class automatically provides `myTools()` based on your method definitions:

```typescript
// Automatically available - no implementation needed!
const methods = await tool.myTools();
// Returns: ['example_method', 'process_data', 'get_status']
```

### Complete Method Schemas

Ensure your method definitions are complete for AI understanding:

```typescript
// ✅ Complete schema - AI can fully understand
{
  name: 'send_email',
  description: 'Send an email message to one or more recipients with optional attachments',
  parameters: [
    {
      name: 'to',
      type: 'string | string[]',
      description: 'Recipient email address(es). Single address or array of addresses.',
      required: true,
    },
    {
      name: 'subject',
      type: 'string',
      description: 'Email subject line. Plain text, no HTML.',
      required: true,
    },
    {
      name: 'body',
      type: 'string',
      description: 'Email body content. Supports plain text or HTML.',
      required: true,
    },
    {
      name: 'attachments',
      type: 'array',
      description: 'Optional file attachments. Array of {filename: string, content: Buffer} objects.',
      required: false,
    }
  ],
  dependencies: [],
}

// ❌ Incomplete - AI lacks context
{
  name: 'send_email',
  description: 'Send email',
  parameters: [
    { name: 'to', type: 'string', required: true },
    { name: 'subject', type: 'string', required: true },
    { name: 'body', type: 'string', required: true }
  ],
  dependencies: [],
}
```

## Development Workflow

### Using Development Scripts

```bash
# Watch mode with hot-reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode (if configured)
npm test -- --watch

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Debugging

**VS Code Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tool",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Console Debugging:**

```typescript
// Use the built-in logger
this.logger.debug('Processing request:', request);
this.logger.info('Operation completed successfully');
this.logger.warn('Rate limit approaching');
this.logger.error('Operation failed:', error);
```

### Hot-Reload Development

```typescript
// src/dev.ts - Development entry point
import { MyTool } from './my-tool.tool.js';

async function main() {
  const tool = new MyTool({
    // Development configuration
  });

  await tool.start();

  console.log('Tool started in development mode');
  console.log('Available methods:', await tool.myTools());

  // Test your methods here
  const result = await tool.callMyTool({
    method: 'process_data',
    params: { data: { test: true } }
  });

  console.log('Result:', result);
}

main().catch(console.error);
```

Run with:
```bash
npm run dev
# Uses tsx watch for automatic reloading
```

## Publishing Your Tool

### Prepare for Publishing

**1. Update package.json:**

```json
{
  "name": "@olane/o-my-tool",
  "version": "1.0.0",
  "description": "Clear description of what your tool does",
  "keywords": ["olane", "tool", "your-domain"],
  "author": "Your Name",
  "license": "(MIT OR Apache-2.0)",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/o-my-tool.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/o-my-tool/issues"
  },
  "homepage": "https://github.com/your-org/o-my-tool#readme"
}
```

**2. Update README.md** with:
- Clear description of tool purpose
- Installation instructions
- Usage examples
- API reference
- Configuration options

**3. Add CHANGELOG.md:**

```markdown
# Changelog

## [1.0.0] - 2025-11-18

### Added
- Initial release
- `process_data` method for data processing
- `get_status` method for tool status
- Complete TypeScript types
```

**4. Ensure tests pass:**

```bash
npm test
npm run lint
npm run build
```

### Publishing to NPM

```bash
# Login to npm (if not already logged in)
npm login

# Publish (public package)
npm publish --access public

# Or for scoped private package
npm publish --access restricted
```

### Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes to API
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

```bash
# Bump version
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Publish new version
npm publish
```

## Best Practices Checklist

Use this checklist when developing your tool:

### Method Design
- [ ] Clear, descriptive method names using verb-noun pattern
- [ ] Complete method descriptions explaining what, why, and how
- [ ] All parameters have clear descriptions
- [ ] Required vs. optional parameters are appropriate
- [ ] Type annotations are accurate and complete
- [ ] Dependencies between methods are documented

### Implementation
- [ ] All methods have `_tool_` prefix
- [ ] Error handling with try/catch in all methods
- [ ] Structured error responses with codes and messages
- [ ] Success responses include relevant metadata
- [ ] Logging at appropriate levels (debug, info, warn, error)
- [ ] Input validation for all parameters
- [ ] Sensible defaults for optional parameters

### Type Safety
- [ ] TypeScript strict mode enabled
- [ ] Interfaces defined for complex types
- [ ] No `any` types without justification
- [ ] Return types specified on all methods
- [ ] Request/response types properly defined

### Testing
- [ ] Unit tests for each method
- [ ] Tests for error conditions
- [ ] Tests for parameter validation
- [ ] Tests for method discovery
- [ ] Integration tests for workflows
- [ ] Test coverage > 80%

### Documentation
- [ ] README with usage examples
- [ ] JSDoc comments on all public methods
- [ ] Method descriptions in method definitions
- [ ] CHANGELOG documenting changes
- [ ] Example usage in README or examples/ directory
- [ ] Inline comments explaining complex logic

### Agent Compatibility
- [ ] Methods are discoverable via `myTools()`
- [ ] Method schemas are complete and accurate
- [ ] Errors include retry guidance
- [ ] Responses are structured and parseable
- [ ] Parameter names are clear and unambiguous

### Code Quality
- [ ] ESLint passes with no errors
- [ ] Prettier formatting applied
- [ ] No console.log in production code (use logger)
- [ ] No hardcoded credentials or secrets
- [ ] Environment variables for configuration

## Troubleshooting

### Type Errors

**Problem:** TypeScript compilation fails with type errors

**Solutions:**

```bash
# Check TypeScript version matches peer dependencies
npm ls typescript

# Verify tsconfig.json extends correct base
cat tsconfig.json | grep extends
# Should show: "@tsconfig/node20/tsconfig.json"

# Clean and rebuild
npm run clean
npm run build

# Check for peer dependency issues
npm ls @olane/o-core @olane/o-tool @olane/o-lane
```

**Common issues:**
- Missing peer dependencies: `npm install --save-peer @olane/o-core @olane/o-tool @olane/o-lane`
- Mismatched versions: Update all @olane packages to same version
- Missing types: `npm install --save-dev @types/node`

### Method Discovery Failures

**Problem:** Methods not appearing in `myTools()` output

**Solutions:**

1. **Verify method prefix:**
```typescript
// ❌ Wrong - missing prefix
async example_method(request: oRequest) { }

// ✅ Correct - has _tool_ prefix
async _tool_example_method(request: oRequest) { }
```

2. **Check method definitions:**
```typescript
// Ensure methods are registered in constructor
constructor(config: oNodeToolConfig) {
  super({
    ...config,
    methods: MY_METHODS, // ← Must include this
  });
}
```

3. **Verify method names match:**
```typescript
// Method definition
const METHODS = {
  example_method: { name: 'example_method', ... }
};

// Implementation must match exactly
async _tool_example_method(request: oRequest) { }
```

### Parameter Validation Issues

**Problem:** Parameters not validating correctly or causing errors

**Solutions:**

1. **Check parameter types in definition:**
```typescript
// Definition says 'string'
{
  name: 'value',
  type: 'string',
  required: true
}

// But implementation expects number
const { value } = request.params;
const result = value * 2; // ← Will fail if value is string
```

2. **Validate in implementation:**
```typescript
async _tool_process(request: oRequest): Promise<ToolResult> {
  const { value } = request.params;

  // Explicit validation
  if (typeof value !== 'number') {
    return {
      success: false,
      error: 'Parameter "value" must be a number'
    };
  }

  // Now safe to use
  return { success: true, result: value * 2 };
}
```

3. **Handle missing optional parameters:**
```typescript
// ✅ Provide defaults
const { timeout = 5000, retries = 3 } = request.params;

// ✅ Or check existence
if (request.params.config) {
  // Use config
}
```

### Testing Issues

**Problem:** Tests failing or not running properly

**Solutions:**

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- test/my-tool.spec.ts

# Check for async issues - ensure proper cleanup
```

**Common test issues:**

1. **Async cleanup:**
```typescript
// ✅ Proper cleanup
afterAll(async () => {
  await tool.stop(); // Wait for cleanup
});

// ❌ Missing await
afterAll(() => {
  tool.stop(); // Might not complete before next test
});
```

2. **Test isolation:**
```typescript
// Each test should be independent
beforeEach(async () => {
  tool = new MyTool({});
  await tool.start();
});

afterEach(async () => {
  await tool.stop();
});
```

### Build Problems

**Problem:** Build fails or produces incorrect output

**Solutions:**

```bash
# Check TypeScript configuration
npx tsc --showConfig

# Verify include/exclude paths
cat tsconfig.json

# Clean everything and rebuild
npm run deep:clean
npm install
npm run build

# Check for circular dependencies
npm ls
```

**Common build issues:**

1. **Module resolution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node", // ← Important
  }
}
```

2. **Output directory:**
```json
{
  "compilerOptions": {
    "outDir": "./dist", // ← Ensure this matches package.json "main"
  }
}
```

3. **Import extensions:**
```typescript
// ✅ Include .js extension for ESM
import { MyTool } from './my-tool.tool.js';

// ❌ Missing extension
import { MyTool } from './my-tool.tool';
```

## Related Resources

### oLane Ecosystem Documentation

- **[oLane Core Documentation](https://docs.olane.ai/core)** - Core concepts and architecture
- **[oLane Protocol](https://docs.olane.ai/protocol)** - Protocol specifications
- **[oLane Tool Registry](https://docs.olane.ai/registry)** - Tool registration and discovery

### Example Tools

Study these existing tools for patterns and best practices:

- **[o-approval](../o-approval)** - Approval workflow patterns
- **[o-intelligence](../o-intelligence)** - AI integration patterns
- **[o-monitor](../o-monitor)** - System monitoring patterns

### Community Resources

- **[GitHub Discussions](https://github.com/olane-labs/olane/discussions)** - Q&A and community support
- **[Issue Tracker](https://github.com/olane-labs/o-node-template/issues)** - Bug reports and feature requests
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to this template

### Additional Reading

- **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)** - For MCP-based integrations
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - TypeScript best practices
- **[Jest Documentation](https://jestjs.io/)** - Testing with Jest

---

## Contributing

We welcome contributions to improve this template! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Make your changes
4. Add/update tests as needed
5. Ensure all tests pass (`npm test`)
6. Run linting (`npm run lint`)
7. Commit your changes (`git commit -m 'Add improvement'`)
8. Push to the branch (`git push origin feature/improvement`)
9. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Questions or Suggestions?

- Open an issue on [GitHub](https://github.com/olane-labs/o-node-template/issues)
- Join the discussion in [GitHub Discussions](https://github.com/olane-labs/olane/discussions)
- Check the [oLane documentation](https://docs.olane.ai)

**Happy building! Your agent-agnostic tools power the future of AI-human collaboration.**
