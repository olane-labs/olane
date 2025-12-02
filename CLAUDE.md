# CLAUDE.md - O-Network Node Development Guide

> Comprehensive guide for AI agents to build O-Network nodes - addressable, distributed tools in the Olane OS ecosystem.

## ⚠️ CRITICAL RULES - READ FIRST

**Lifecycle Management:**
- ✅ **DO**: Use `hookInitializeFinished()` for 3rd party service initialization
- ✅ **DO**: Use `hookStartFinished()` for background tasks and child creation
- ✅ **DO**: Override `stop()` for cleanup
- ❌ **NEVER**: Override `start()` method - it orchestrates the entire lifecycle

**Error Handling:**
- ✅ **DO**: Throw errors for validation failures and exceptions
- ✅ **DO**: Return raw data on success
- ✅ **DO**: Let base class handle error wrapping
- ❌ **NEVER**: Return `{ success: false, error: ... }` objects
- ❌ **NEVER**: Wrap success responses in `{ success: true, result: ... }`

**Address Construction:**
- ✅ **DO**: Use simple addresses in constructors (e.g., `new oNodeAddress('o://my-tool')`)
- ✅ **DO**: Set `parent` and `leader` properties for hierarchical nodes
- ✅ **DO**: Let the system create nested addresses during registration
- ❌ **NEVER**: Create nested addresses in constructors (e.g., `new oNodeAddress('o://parent/child')`)
- ❌ **NEVER**: Manually construct hierarchical addresses - they're created at runtime

**Response Structure (when calling other tools):**
- When using `node.use()`, access data via `response.result.data`
- Always check `response.success` before accessing data
- Base class automatically wraps your returns

**Package Management:**
- ⚠️ **ALWAYS use `pnpm`, not `npm`**

---

## Table of Contents

1. [Project Overview & Quick Start](#1-project-overview--quick-start)
2. [Architecture & Patterns](#2-architecture--patterns)
3. [Building Nodes](#3-building-nodes)
4. [Parent-Child System](#4-parent-child-system)
5. [Method Discovery](#5-method-discovery)
6. [Development & Publishing](#6-development--publishing)
7. [Testing](#7-testing)
8. [Integration & Networking](#8-integration--networking)
9. [Best Practices & Troubleshooting](#9-best-practices--troubleshooting)
10. [Configuration Reference](#10-configuration-reference)
11. [Complete Example](#11-complete-example)
12. [Quick Reference](#12-quick-reference)

---

## 1. Project Overview & Quick Start

### What is o-node-template?

Template for creating **O-Network nodes** - addressable, distributed tools (`o://my-tool`) that serve both humans and AI agents through the same interface.

**Use when you need:**
- Tool accessible via `o://` protocol
- Service for both humans and AI agents
- Distributed component in Olane OS ecosystem
- Simple stateless utility or complex multi-instance manager

### Project Structure

```
o-node-template/
├── src/
│   ├── index.ts              # Main exports
│   ├── tool-name.tool.ts     # Tool implementation
│   ├── methods/              # Method definitions (AI discovery)
│   │   └── example.methods.ts
│   └── interfaces/           # TypeScript types (optional)
├── test/                     # Tests
├── package.json              # Metadata & dependencies
├── tsconfig.json             # TypeScript config
└── CLAUDE.md                 # This file
```

### Essential Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build TypeScript |
| `pnpm test` | Run tests |
| `pnpm run dev` | Watch mode |
| `pnpm run lint` | Run linting |
| `pnpm run clean` | Clean build artifacts |

### Key Files

**package.json:**
```json
{
  "name": "@olane/o-your-tool",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts",
  "peerDependencies": {
    "@olane/o-core": "^0.7.12",
    "@olane/o-node": "^0.7.12",
    "@olane/o-tool": "^0.7.12"
  }
}
```

---

## 2. Architecture & Patterns

### Three Node Types

| Type | Use For | Pattern | State | Example |
|------|---------|---------|-------|---------|
| **oNodeTool** | 1-5 focused capabilities | Direct method calls | Stateless | Currency converter |
| **oLaneTool** | 5-20+ capabilities | Intent-driven (AI decides methods) | Emergent workflows | Customer analytics |
| **McpTool** | MCP server bridge | Auto-expose MCP capabilities | Proxy to MCP | Git operations |

### Simple vs Parent-Child Pattern

**Use Simple (oNodeTool/oLaneTool) when:**
- 1-5 focused capabilities
- Static configuration
- No multiple instances needed
- Stateless or simple state

**Use Parent-Child (Manager/Worker) when:**
- Multiple isolated instances with different configs
- Dynamic spawning on-demand
- Per-instance authentication (different API keys)
- Resource limits needed (max instances)
- Multi-tenant scenarios with scoped access

**Architecture Comparison:**

```
Simple Pattern:
┌─────────────────┐
│   MyTool        │
│   Single Use    │
└─────────────────┘

Parent-Child Pattern:
┌──────────────────────────┐
│   Manager (Parent)       │
│   - Advertises caps      │
│   - Spawns on-demand     │
│   - Manages lifecycle    │
└──────────────────────────┘
    ↓ spawns multiple
┌────────────┐ ┌────────────┐
│  Worker #1 │ │  Worker #2 │
│  Isolated  │ │  Isolated  │
└────────────┘ └────────────┘
```

### Choosing Base Class

```typescript
import { oNodeTool } from '@olane/o-node';     // Simple tools
import { oLaneTool } from '@olane/o-lane';     // Intent-driven tools
import { McpTool } from '@olane/o-mcp';        // MCP bridges
```

**Decision Tree:**
1. Bridging MCP server? → `McpTool`
2. Intent-driven AI workflows (5+ methods)? → `oLaneTool`
3. Simple, direct method calls? → `oNodeTool`

---

## 3. Building Nodes

### Tool Class Structure

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress, oNodeToolConfig } from '@olane/o-node';
import { oRequest } from '@olane/o-core';
import { MY_METHODS } from './methods/my-tool.methods.js';

export class MyTool extends oLaneTool {
  private apiClient?: ExternalAPIClient;

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://my-tool'),
      description: 'Clear description for AI agents',
      methods: MY_METHODS,
    });
  }

  // ✅ Initialize 3rd party services in hook
  async hookInitializeFinished(): Promise<void> {
    this.apiClient = new ExternalAPIClient(this.config.apiKey);
    await this.apiClient.connect();
    await super.hookInitializeFinished();
  }

  // ✅ Start background tasks in hook
  async hookStartFinished(): Promise<void> {
    // Start monitoring, create children, etc.
    await super.hookStartFinished();
  }

  // Tool methods must be prefixed with _tool_
  async _tool_my_method(request: oRequest): Promise<any> {
    const { param1, param2 } = request.params;

    // ✅ Throw errors for validation
    if (!param1) {
      throw new Error('param1 is required');
    }

    // Implementation
    const result = await this.processData(param1, param2);

    // ✅ Return raw result - base class wraps it
    return result;
  }

  // ✅ Cleanup in stop()
  async stop(): Promise<void> {
    if (this.apiClient) {
      await this.apiClient.disconnect();
    }
    await super.stop();
  }

  // Private helpers (not exposed)
  private async processData(param1: string, param2?: any): Promise<any> {
    return await this.apiClient.process(param1, param2);
  }
}
```

### Lifecycle Flow

```
start() [DO NOT OVERRIDE]
  → initialize()
  → hookInitializeFinished() ✅ EXTEND THIS
  → register()
  → hookStartFinished() ✅ EXTEND THIS
  → RUNNING
```

### Validation Pattern

```typescript
async _tool_create_user(request: oRequest): Promise<any> {
  const { username, email, role } = request.params;

  // ✅ Throw errors for validation
  if (!username || typeof username !== 'string') {
    throw new Error('username is required and must be a string');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('email must be a valid email address');
  }

  const userRole = role || 'user';
  if (!['user', 'admin', 'moderator'].includes(userRole)) {
    throw new Error('role must be one of: user, admin, moderator');
  }

  // ✅ Return raw data
  return {
    userId: result.id,
    username: result.username,
    email: result.email,
    role: result.role
  };
}
```

### Calling Other Tools

```typescript
async _tool_process_order(request: oRequest): Promise<any> {
  const { customerId, items } = request.params;

  // Call customer tool
  const customerResponse = await this.customerTool.use(
    this.customerTool.address,
    { method: 'get_customer', params: { customerId } }
  );

  // ✅ Check success
  if (!customerResponse.success) {
    throw new Error(`Failed to get customer: ${customerResponse.error}`);
  }

  // ✅ Access data via result.data
  const customer = customerResponse.result.data;

  if (!customer.active) {
    throw new Error('Customer account is not active');
  }

  // ✅ Return raw data (base wraps it)
  return {
    orderId: generateId(),
    customer: { id: customer.id, name: customer.name },
    items: items
  };
}
```

---

## 4. Parent-Child System

### Manager (Parent) Implementation

```typescript
import { oNodeTool } from '@olane/o-node';
import { oNodeAddress } from '@olane/o-node';
import { oRequest } from '@olane/o-core';

export class MyManager extends oNodeTool {
  private workers: Map<string, MyWorker> = new Map();
  private maxInstances: number;

  constructor(config: { maxInstances?: number }) {
    super({
      ...config,
      address: new oNodeAddress('o://my-manager'),
      description: 'Manages multiple worker instances',
    });
    this.maxInstances = config.maxInstances || 10;
  }

  async _tool_create_worker(request: oRequest): Promise<any> {
    const { workerId, config } = request.params;
    const finalWorkerId = workerId || this.generateWorkerId();

    // Check existing
    if (this.workers.has(finalWorkerId)) {
      return {
        workerId: finalWorkerId,
        existing: true,
        address: `o://my-manager/${finalWorkerId}`
      };
    }

    // Check limits
    if (this.workers.size >= this.maxInstances) {
      throw new Error(`Max instances (${this.maxInstances}) reached`);
    }

    // Create worker with simple address - parent linkage creates nested address
    const worker = new MyWorker({
      address: new oNodeAddress(`o://${finalWorkerId}`), // ✅ Simple address
      parent: this.address,  // System creates nested address during registration
      leader: this.leader,
      ...config,
    });

    // ✅ Hook injection for child registration
    (worker as any).hookInitializeFinished = async () => {
      this.addChildNode(worker);
      this.logger.info('Worker registered', { workerId: finalWorkerId });
    };

    await worker.start();
    this.workers.set(finalWorkerId, worker);

    // After start(), worker.address is automatically 'o://my-manager/{workerId}'

    return {
      workerId: finalWorkerId,
      address: worker.address.toString(), // Returns nested address after registration
    };
  }

  async _tool_use_worker(request: oRequest): Promise<any> {
    const { workerId, method, params } = request.params;

    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    // Proxy to worker
    return await worker.use(
      new oNodeAddress(worker.address.toString()),
      { method, params }
    );
  }

  async _tool_list_workers(request: oRequest): Promise<any> {
    return {
      workers: Array.from(this.workers.entries()).map(([id, w]) => ({
        workerId: id,
        address: w.address.toString(),
        status: w.status,
      })),
      count: this.workers.size,
      maxInstances: this.maxInstances
    };
  }

  async _tool_remove_worker(request: oRequest): Promise<any> {
    const { workerId } = request.params;
    const worker = this.workers.get(workerId);

    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    await worker.stop();
    this.workers.delete(workerId);

    return { workerId, deleted: true };
  }

  // ✅ Cascade stop to all children
  async stop(): Promise<void> {
    this.logger.info('Stopping manager and workers', {
      count: this.workers.size
    });

    await Promise.all(
      Array.from(this.workers.values()).map(w => w.stop())
    );

    this.workers.clear();
    await super.stop();
  }

  private generateWorkerId(): string {
    return `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Worker (Child) Implementation

```typescript
export class MyWorker extends oNodeTool {
  private apiClient?: ExternalAPI;

  constructor(config: { apiKey?: string; resourceScope?: string }) {
    super({
      ...config,
      description: 'Worker with isolated configuration',
    });
  }

  async hookInitializeFinished(): Promise<void> {
    // Worker-specific API client
    this.apiClient = new ExternalAPI({
      apiKey: this.config.apiKey,
      scope: this.config.resourceScope
    });
    await this.apiClient.connect();
    await super.hookInitializeFinished();
  }

  async _tool_process_task(request: oRequest): Promise<any> {
    const { taskData } = request.params;
    const result = await this.apiClient.process(taskData);

    return {
      result,
      workerId: this.address.toString()
    };
  }

  async stop(): Promise<void> {
    if (this.apiClient) {
      await this.apiClient.disconnect();
    }
    await super.stop();
  }
}
```

### Key Pattern: Hook Injection

```typescript
// In parent's create method:
const child = new ChildTool({
  address: new oNodeAddress(`o://${childId}`), // ✅ Simple address
  parent: this.address,    // ✅ Parent reference (creates nested path)
  leader: this.leader,     // ✅ Leader reference
});

// ✅ Inject hook to register with parent
(child as any).hookInitializeFinished = async () => {
  this.addChildNode(child);
};

await child.start();
// After start(), child.address becomes 'o://parent/{childId}'
this.children.set(childId, child);
```

---

## 5. Method Discovery

### Method Naming

All exposed methods **must** be prefixed with `_tool_`:

```typescript
// ✅ Correct - will be discovered
async _tool_get_user(request: oRequest): Promise<any> { }
async _tool_create_session(request: oRequest): Promise<any> { }

// ❌ Incorrect - will NOT be discovered
async getUser(request: oRequest): Promise<any> { }
```

**Naming Pattern:** `_tool_<verb>_<noun>`

Examples: `_tool_get_customer`, `_tool_create_order`, `_tool_update_status`

### Method Definitions

```typescript
// src/methods/my-tool.methods.ts
import { oMethod } from '@olane/o-protocol';

export const MY_TOOL_METHODS: { [key: string]: oMethod } = {
  get_customer: {
    name: 'get_customer',
    description: 'Retrieves customer information by ID. Returns full profile including contact details and account status.',

    parameters: [
      {
        name: 'customerId',
        type: 'string',
        description: 'Unique customer identifier (UUID)',
        required: true,
        exampleValues: ['cust_abc123']
      },
      {
        name: 'includeHistory',
        type: 'boolean',
        description: 'Include purchase history',
        required: false,
        defaultValue: false
      },
      {
        name: 'fields',
        type: 'array',
        description: 'Specific fields to return',
        required: false,
        structure: {
          itemType: 'string',
          enum: ['name', 'email', 'phone', 'status']
        }
      }
    ],

    examples: [
      {
        description: 'Get basic customer info',
        params: { customerId: 'cust_abc123' },
        expectedResult: {
          success: true,
          result: {
            customerId: 'cust_abc123',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'active'
          }
        }
      }
    ],

    commonErrors: [
      {
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: 'Customer does not exist',
        remediation: 'Verify customer ID. Use list_customers to search.',
        retryable: false
      }
    ],

    performance: {
      estimatedDuration: 500,
      maxDuration: 5000,
      idempotent: true,
      cacheable: true
    },

    approvalMetadata: {
      riskLevel: 'low',
      category: 'read',
      description: 'Read-only customer data retrieval'
    }
  }
};
```

### Parameter Types Reference

| Type | Example |
|------|---------|
| String | `{ name: 'username', type: 'string', required: true }` |
| Number | `{ name: 'amount', type: 'number', required: true }` |
| Boolean | `{ name: 'verified', type: 'boolean', defaultValue: false }` |
| Array | `{ name: 'tags', type: 'array', structure: { itemType: 'string' } }` |
| Object | `{ name: 'address', type: 'object', structure: { properties: {...} } }` |
| Enum | `{ name: 'status', type: 'string', structure: { enum: ['pending', 'done'] } }` |

### Using in Tool

```typescript
import { MY_TOOL_METHODS } from './methods/my-tool.methods.js';

export class MyTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      methods: MY_TOOL_METHODS,  // ✅ Provide definitions
    });
  }
}
```

---

## 6. Development & Publishing

### Development Workflow

```bash
# Setup
pnpm install
cp .env.example .env

# Development
pnpm run dev          # Watch mode
pnpm test            # Run tests
pnpm run lint        # Lint code

# Production
pnpm run build       # Build
pnpm test           # Verify
```

### Build Output

```
src/                    dist/src/
  index.ts       →       index.js
  my-tool.tool.ts  →     my-tool.tool.js
  methods/         →     methods/
    *.methods.ts   →       *.methods.js
                         [+ .d.ts files]
```

### Publishing to NPM

**Public package:**
```bash
npm login
npm publish --access public
```

**Private package:**
```json
{
  "publishConfig": {
    "access": "restricted"
  }
}
```
```bash
npm publish
```

### Monorepo (Lerna)

```bash
# Version
pnpm lerna version patch --yes
pnpm lerna version prerelease --preid alpha --yes --force-publish

# Publish
pnpm lerna publish from-package --yes

# Scope commands
pnpm lerna run build --scope @olane/o-my-tool
```

### CI/CD Example

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 7. Testing

### Unit Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'jest';
import { MyTool } from '../src/my-tool.tool.js';

describe('MyTool', () => {
  let tool: MyTool;

  beforeAll(async () => {
    tool = new MyTool({});
    await tool.start();
  });

  afterAll(async () => {
    await tool.stop();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully', () => {
      expect(tool).toBeDefined();
      expect(tool.address.toString()).toBe('o://my-tool');
    });
  });

  describe('_tool_my_method', () => {
    it('should process valid request', async () => {
      const result = await tool.use(tool.address, {
        method: 'my_method',
        params: { param1: 'test' }
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should validate required parameters', async () => {
      const result = await tool.use(tool.address, {
        method: 'my_method',
        params: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('param1 is required');
    });
  });
});
```

### Parent-Child Testing

```typescript
describe('Manager and Worker', () => {
  let manager: MyManager;

  beforeAll(async () => {
    manager = new MyManager({ maxInstances: 5 });
    await manager.start();
  });

  afterAll(async () => {
    await manager.stop();
  });

  it('should create worker', async () => {
    const result = await manager.use(manager.address, {
      method: 'create_worker',
      params: { workerId: 'test-1' }
    });

    expect(result.success).toBe(true);
    expect(result.workerId).toBe('test-1');
  });

  it('should route to worker', async () => {
    await manager.use(manager.address, {
      method: 'create_worker',
      params: { workerId: 'test-2' }
    });

    const result = await manager.use(manager.address, {
      method: 'use_worker',
      params: {
        workerId: 'test-2',
        method: 'process_task',
        params: { taskData: 'test' }
      }
    });

    expect(result.success).toBe(true);
  });

  it('should enforce max instances', async () => {
    for (let i = 0; i < 5; i++) {
      await manager.use(manager.address, {
        method: 'create_worker',
        params: { workerId: `worker-${i}` }
      });
    }

    const result = await manager.use(manager.address, {
      method: 'create_worker',
      params: { workerId: 'overflow' }
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('MAX_INSTANCES_REACHED');
  });
});
```

---

## 8. Integration & Networking

### Core Dependencies

| Package | Version | Required | Purpose |
|---------|---------|----------|---------|
| `@olane/o-core` | ^0.7.12 | Yes | Core types |
| `@olane/o-node` | ^0.7.12 | Yes | Node base classes |
| `@olane/o-tool` | ^0.7.12 | Yes | Tool interfaces |
| `@olane/o-lane` | ^0.7.12 | Optional | Intent-driven support |
| `@olane/o-mcp` | ^0.7.12 | Optional | MCP integration |

### Lane Support

```typescript
import { oLaneTool } from '@olane/o-lane';

export class MyLaneTool extends oLaneTool {
  // Methods called automatically based on intent
  // Lane decides which methods to use
}
```

### MCP Integration

```typescript
import { McpTool } from '@olane/o-mcp';

export class GitTool extends McpTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://git'),
      mcpServerPath: '/path/to/mcp/server',
      mcpServerArgs: ['--config', 'git.json'],
    });
  }
  // MCP methods auto-exposed, no implementation needed
}
```

### Network Discovery

Nodes auto-register via libp2p when `start()` is called:

```typescript
async hookStartFinished(): Promise<void> {
  // Node is now registered and discoverable
  this.logger.info('Registered', {
    address: this.address.toString()
  });
  await super.hookStartFinished();
}

// Call other nodes
async _tool_coordinate(request: oRequest): Promise<any> {
  const otherNode = new oNodeAddress('o://other-tool');
  return await this.use(otherNode, {
    method: 'some_method',
    params: { data: 'test' }
  });
}
```

---

## 9. Best Practices & Troubleshooting

### Critical Rules Summary

| Rule | DO | DON'T |
|------|-----|-------|
| **Lifecycle** | Use `hookInitializeFinished()`, `hookStartFinished()` | Override `start()` |
| **Errors** | Throw errors | Return error objects |
| **Returns** | Return raw data | Wrap in `{ success, result }` |
| **State** | Isolate per child | Share mutable state |
| **Cleanup** | Cascade `stop()` to children | Forget child cleanup |

### Common Mistakes

| Problem | Solution | Reference |
|---------|----------|-----------|
| Method not discovered | Add `_tool_` prefix | [Section 5](#5-method-discovery) |
| "start() overridden" | Use hooks instead | [Section 3](#3-building-nodes) |
| Child not registering | Inject hook before `start()` | [Section 4](#4-parent-child-system) |
| Service not ready | Initialize in `hookInitializeFinished()` | [Section 3](#3-building-nodes) |
| Module format mismatch | Set `"type": "module"` in package.json | [Section 1](#1-project-overview--quick-start) |

### Quick Troubleshooting

**Build errors:**
```bash
pnpm run deep:clean
pnpm install
pnpm run build
```

**Type errors:**
```bash
pnpm run type-check
# Use .js extensions in imports for ESM
import { MyClass } from './my-class.js';  // ✅
```

**Test timeouts:**
```typescript
jest.setTimeout(30000);  // Increase timeout
```

**Child not found:**
```typescript
// Ensure parent and leader references set
const child = new Child({
  parent: this.address,  // ✅ Required
  leader: this.leader,   // ✅ Required
});
```

---

## 10. Configuration Reference

### Environment Variables

```bash
# .env.example
NODE_ENV=development
LOG_LEVEL=info

# Tool-specific
API_KEY=your_api_key
API_ENDPOINT=https://api.example.com

# Limits
MAX_INSTANCES=10
SESSION_TIMEOUT=3600000
```

### Config Options

```typescript
interface oNodeToolConfig {
  address?: oNodeAddress;        // Node address
  description?: string;          // AI-readable description
  leader?: oNodeAddress;         // Network leader
  parent?: oNodeAddress;         // Parent node (for children)
  transports?: oNodeTransport[]; // Network transports
  methods?: { [key: string]: oMethod };  // Method definitions
  [key: string]: any;            // Custom config
}
```

### Lifecycle Hooks

| Hook | When | Use For | Call Super |
|------|------|---------|------------|
| `hookInitializeFinished()` | After `initialize()`, before `register()` | Init 3rd party services, load resources | Yes (end) |
| `hookStartFinished()` | After `register()`, fully started | Start background tasks, create children | Yes (end) |
| `stop()` | When stopping | Cleanup resources, disconnect services | Yes (end) |

### Command Reference

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install deps |
| `pnpm run build` | Build TS |
| `pnpm test` | Run tests |
| `pnpm run dev` | Watch mode |
| `pnpm run lint` | Lint |
| `pnpm run lint:fix` | Fix linting |
| `pnpm run clean` | Clean build |
| `pnpm run deep:clean` | Clean all |
| `pnpm lerna version patch` | Bump version |
| `pnpm lerna publish from-package` | Publish |

---

## 11. Complete Example

Complete browser session manager demonstrating all key patterns:

```typescript
// ═══════════════════════════════════════════════════════════════
// PARENT: Browser Session Manager
// ═══════════════════════════════════════════════════════════════
import { oNodeTool } from '@olane/o-node';
import { oNodeAddress, oNodeToolConfig } from '@olane/o-node';
import { oRequest } from '@olane/o-core';

export class BrowserManager extends oNodeTool {
  private sessions: Map<string, BrowserSession> = new Map();
  private maxSessions: number;
  private sessionTimeout: number;

  constructor(config: { maxSessions?: number; sessionTimeout?: number }) {
    super({
      ...config,
      address: new oNodeAddress('o://browser'),
      description: 'Manages isolated browser session instances',
    });
    this.maxSessions = config.maxSessions || 10;
    this.sessionTimeout = config.sessionTimeout || 3600000;
  }

  // ✅ PATTERN: Background task initialization
  async hookStartFinished(): Promise<void> {
    setInterval(() => this.cleanupExpiredSessions(), 60000);
    this.logger.info('Browser manager started', {
      maxSessions: this.maxSessions
    });
    await super.hookStartFinished();
  }

  // ✅ PATTERN: Child creation with validation and limits
  async _tool_create_session(request: oRequest): Promise<any> {
    const { sessionId, headless = true } = request.params;
    const finalSessionId = sessionId || this.generateSessionId();

    if (this.sessions.has(finalSessionId)) {
      return {
        sessionId: finalSessionId,
        existing: true,
        address: `o://browser/${finalSessionId}`
      };
    }

    // ✅ PATTERN: Resource limit enforcement
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Max sessions (${this.maxSessions}) reached`);
    }

    const session = new BrowserSession({
      address: new oNodeAddress(`o://${finalSessionId}`), // ✅ Simple address
      parent: this.address,  // System creates nested address during registration
      leader: this.leader,
      headless,
    });

    // ✅ PATTERN: Hook injection for child registration
    (session as any).hookInitializeFinished = async () => {
      this.addChildNode(session);
      this.logger.info('Session registered', { sessionId: finalSessionId });
    };

    await session.start();
    this.sessions.set(finalSessionId, session);

    // ✅ PATTERN: Return raw data
    // After start(), session.address is automatically 'o://browser/{sessionId}'
    return {
      sessionId: finalSessionId,
      address: session.address.toString(), // Returns nested address after registration
      createdAt: Date.now(),
    };
  }

  // ✅ PATTERN: Request routing to children
  async _tool_use_session(request: oRequest): Promise<any> {
    const { sessionId, method, params } = request.params;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.updateLastAccessed();
    return await session.use(
      new oNodeAddress(session.address.toString()),
      { method, params }
    );
  }

  async _tool_list_sessions(request: oRequest): Promise<any> {
    return {
      sessions: Array.from(this.sessions.entries()).map(([id, s]) => ({
        sessionId: id,
        address: s.address.toString(),
        createdAt: s.createdAt,
        lastAccessedAt: s.lastAccessedAt,
      })),
      count: this.sessions.size,
    };
  }

  async _tool_close_session(request: oRequest): Promise<any> {
    const { sessionId } = request.params;
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await session.stop();
    this.sessions.delete(sessionId);
    return { sessionId, closed: true };
  }

  // ✅ PATTERN: Cascading cleanup to all children
  async stop(): Promise<void> {
    this.logger.info('Stopping manager', { count: this.sessions.size });
    await Promise.all(
      Array.from(this.sessions.values()).map(s => s.stop())
    );
    this.sessions.clear();
    await super.stop();
  }

  private generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt > this.sessionTimeout) {
        session.stop();
        this.sessions.delete(id);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CHILD: Browser Session Worker
// ═══════════════════════════════════════════════════════════════
import puppeteer, { Browser, Page } from 'puppeteer';

export class BrowserSession extends oNodeTool {
  private browser?: Browser;
  private page?: Page;
  public createdAt: number = Date.now();
  public lastAccessedAt: number = Date.now();

  constructor(config: { headless?: boolean }) {
    super({
      ...config,
      description: 'Isolated browser session instance',
    });
  }

  // ✅ PATTERN: 3rd party service initialization
  async hookInitializeFinished(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.config.headless ?? true,
      args: ['--no-sandbox'],
    });
    this.page = await this.browser.newPage();
    this.logger.info('Browser session initialized');
    await super.hookInitializeFinished();
  }

  // ✅ PATTERN: Worker method with validation
  async _tool_navigate(request: oRequest): Promise<any> {
    const { url, waitUntil = 'networkidle2' } = request.params;

    if (!url) {
      throw new Error('url is required');
    }

    await this.page!.goto(url, { waitUntil });
    const title = await this.page!.title();

    return { url, title, timestamp: Date.now() };
  }

  async _tool_screenshot(request: oRequest): Promise<any> {
    const { path, fullPage = false } = request.params;
    const screenshot = await this.page!.screenshot({ path, fullPage });
    return { path, size: screenshot.length };
  }

  async _tool_get_content(request: oRequest): Promise<any> {
    return {
      url: this.page!.url(),
      title: await this.page!.title(),
      content: await this.page!.content(),
    };
  }

  updateLastAccessed(): void {
    this.lastAccessedAt = Date.now();
  }

  // ✅ PATTERN: Child cleanup
  async stop(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    await super.stop();
  }
}
```

**Key Patterns Demonstrated:**
- ✅ Lifecycle hooks (never override `start()`)
- ✅ Parent-child with hook injection
- ✅ Resource limits and validation
- ✅ State isolation per child
- ✅ Request routing
- ✅ Cascading cleanup
- ✅ Error handling (throw, don't return)
- ✅ Raw data returns

---

## 12. Quick Reference

### Decision Flowcharts

**Which Base Class?**
```
Need MCP bridge? → McpTool
    ↓ No
Intent-driven (5+ methods)? → oLaneTool
    ↓ No
Simple direct calls → oNodeTool
```

**Simple vs Parent-Child?**
```
Need multiple isolated instances? → Parent-Child
    ↓ No
Per-instance auth/config? → Parent-Child
    ↓ No
Resource limits? → Parent-Child
    ↓ No
Simple single instance → Simple Pattern
```

### Common Tasks Cookbook

**Create simple tool:**
```typescript
class MyTool extends oNodeTool {
  constructor(config) {
    super({
      ...config,
      address: new oNodeAddress('o://my-tool'),
      description: '...',
    });
  }

  async _tool_my_method(request: oRequest): Promise<any> {
    // Validate, process, return
  }
}
```

**Initialize external service:**
```typescript
async hookInitializeFinished(): Promise<void> {
  this.client = new ExternalClient();
  await this.client.connect();
  await super.hookInitializeFinished();
}
```

**Create child node:**
```typescript
const child = new ChildTool({
  address: new oNodeAddress(`o://${id}`), // Simple address
  parent: this.address,  // Creates nested address at runtime
  leader: this.leader,
});

(child as any).hookInitializeFinished = async () => {
  this.addChildNode(child);
};

await child.start();
// After start(), child.address is 'o://parent/{id}'
```

**Call another tool:**
```typescript
const response = await this.otherTool.use(address, {
  method: 'method_name',
  params: { ... }
});

if (!response.success) {
  throw new Error(response.error);
}

const data = response.result.data;
```

### Resources

- **Olane OS Docs**: Main ecosystem documentation
- **O-Protocol Spec**: Protocol details
- **MCP Docs**: Model Context Protocol
- **GitHub Issues**: Bug reports, feature requests
- **Community Discord**: Questions and support

---

## Summary

You now have everything needed to build O-Network nodes:

**Remember:**
- ✅ Use `pnpm`, not npm
- ✅ Never override `start()` - use hooks
- ✅ Throw errors, return raw data
- ✅ Access `response.result.data` when calling tools
- ✅ Inject hooks for child registration
- ✅ Isolate state between children
- ✅ Cascade cleanup from parent to children

**Start simple, scale to complex as needed.**
