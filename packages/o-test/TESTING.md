# Testing Best Practices - O-Network Nodes

> Comprehensive testing guidelines and requirements for O-Network node development in the Olane OS ecosystem.

---

## ⚠️ CRITICAL: Testing Framework for libp2p Ecosystem

**We use Mocha (via aegir), NOT Jest.**

Since O-Network is built on the **libp2p ecosystem**, we use **aegir** as our test runner, which internally uses **Mocha** (not Jest).

### Quick Migration Guide

| Aspect | ❌ Jest (DON'T USE) | ✅ Mocha (USE THIS) |
|--------|---------------------|---------------------|
| **Imports** | `import { describe, it } from '@jest/globals'` | `import { describe, it, before, after } from 'mocha'` |
| **Setup** | `beforeAll()` | `before()` |
| **Teardown** | `afterAll()` | `after()` |
| **Equality** | `expect(x).toBe(y)` | `expect(x).to.equal(y)` |
| **Deep equality** | `expect(x).toEqual(y)` | `expect(x).to.deep.equal(y)` |
| **Existence** | `expect(x).toBeDefined()` | `expect(x).to.exist` |
| **Contains** | `expect(x).toContain(y)` | `expect(x).to.include(y)` |
| **Boolean** | `expect(x).toBe(true)` | `expect(x).to.be.true` |
| **Dependencies** | `jest`, `@types/jest`, `ts-jest` | `aegir`, `chai` |

### Installation

```bash
# ✅ CORRECT - Install only these
pnpm install --save-dev aegir chai

# ❌ WRONG - Do NOT install these
pnpm install --save-dev jest @types/jest ts-jest
```

---

## Table of Contents

1. [⚠️ CRITICAL: Testing Framework for libp2p Ecosystem](#️-critical-testing-framework-for-libp2p-ecosystem)
2. [Overview](#overview)
3. [Testing Philosophy](#testing-philosophy)
4. [Baseline Requirements](#baseline-requirements)
5. [Testing Stack](#testing-stack)
6. [Test Structure Patterns](#test-structure-patterns)
7. [Using TestEnvironment (Recommended)](#using-testenvironment-recommended)
8. [Critical Lifecycle Testing](#critical-lifecycle-testing)
9. [Method Testing Patterns](#method-testing-patterns)
10. [Parent-Child Testing](#parent-child-testing)
11. [Error Handling Tests](#error-handling-tests)
12. [Test Helpers & Utilities](#test-helpers--utilities)
13. [Running Tests](#running-tests)
14. [CI/CD Integration](#cicd-integration)
15. [Common Pitfalls](#common-pitfalls)
16. [Quick Reference](#quick-reference)

---

## Overview

Testing in the O-Network ecosystem focuses on **practical, integration-oriented tests** that validate real node behavior in realistic hierarchies. We prioritize:

- ✅ Real node instances over mocks
- ✅ Actual lifecycle management
- ✅ Parent-child relationships
- ✅ Simple, focused test cases
- ✅ Integration over unit isolation

---

## Testing Philosophy

### Core Principles

1. **Keep It Real**: Use actual node instances, not mocks
2. **Test Behavior**: Focus on what nodes do, not how they do it
3. **Lifecycle First**: Every test must properly start and stop nodes
4. **Simple Over Complex**: Prefer clear, minimal tests over exhaustive coverage
5. **Integration Focus**: Test nodes in realistic hierarchies

### What NOT to Test

- Internal private method implementation details
- Framework behavior (oNode, oLeaderNode internals)
- Third-party library functionality
- Network transport internals (unless building custom transport)

### What TO Test

- Node lifecycle (start, stop, state transitions)
- Public method behavior (`_tool_*` methods)
- Parent-child registration and routing
- Error handling and validation
- Method parameter validation
- Response structure and data

---

## Baseline Requirements

### Every O-Network Package MUST Have:

| Requirement | Description | File |
|-------------|-------------|------|
| **Test Directory** | Contains all test files | `/test/` |
| **Lifecycle Test** | Validates start/stop behavior | `test/lifecycle.spec.ts` |
| **Method Tests** | Tests each `_tool_*` method | `test/methods.spec.ts` |
| **Aegir Config** | Build and test tooling (optional) | `.aegir.js` |
| **Test Script** | Package.json test command | `"test": "aegir test"` |

**Note:** No Jest configuration needed - aegir uses Mocha internally.

### Minimum Test Coverage Requirements

- ✅ All nodes must have lifecycle tests (start/stop)
- ✅ All public methods (`_tool_*`) must have at least one happy path test
- ✅ All required parameters must have validation tests
- ✅ Parent-child patterns must test registration and routing
- ✅ Error paths for critical failures must be tested

---

## Testing Stack

### Core Dependencies

```json
{
  "devDependencies": {
    "aegir": "^47.0.21",
    "chai": "^5.1.2",
    "@types/node": "^22.0.0",
    "typescript": "^5.8.3",
    "tsx": "^4.20.3"
  }
}
```

**Important:** For the **libp2p ecosystem**, aegir v47+ uses **Mocha** as the test runner. Do NOT install Jest dependencies.

### Framework Details

| Tool | Version | Purpose |
|------|---------|---------|
| **aegir** | ^47.0.21 | Test runner using Mocha internally |
| **Mocha** | (via aegir) | Test framework and runner |
| **Chai** | ^5.1.2 | Assertion library (`expect`) |
| **dotenv** | Latest | Environment configuration |

### Configuration Files

#### `.aegir.js` (Optional)

Aegir works with zero configuration. Only create this file if you need customization:

```javascript
export default {
  test: {
    target: ['node'], // node, browser, or both
    timeout: 30000,   // Optional: test timeout in ms
  },
  build: {
    bundlesizeMax: '100KB',
  },
};
```

#### `package.json` scripts (required)

```json
{
  "scripts": {
    "test": "aegir test",
    "test:node": "aegir test -t node",
    "test:browser": "aegir test -t browser"
  }
}
```

### Test Framework: Mocha vs Jest

**For libp2p ecosystem packages:**
- ✅ Use **Mocha** (via aegir)
- ✅ Import: `import { describe, it, before, after, beforeEach, afterEach } from 'mocha'`
- ✅ Assertions: Use Chai - `expect().to.equal()`, `expect().to.exist`, `expect().to.include()`
- ❌ Do NOT install `jest`, `@types/jest`, or `ts-jest`

**Key differences:**

| Feature | Jest | Mocha (aegir) |
|---------|------|---------------|
| Setup | `beforeAll()` | `before()` |
| Teardown | `afterAll()` | `after()` |
| Per-test setup | `beforeEach()` | `beforeEach()` |
| Per-test teardown | `afterEach()` | `afterEach()` |
| Assertions | `.toBe()`, `.toEqual()` | `.to.equal()`, `.to.deep.equal()` |
| Check existence | `.toBeDefined()` | `.to.exist` |
| String contains | `.toContain()` | `.to.include()` |

---

## Test Structure Patterns

### Basic Test File Structure

```typescript
// test/feature-name.spec.ts
import 'dotenv/config';                    // ✅ Load env vars first
import { describe, it, before, after, beforeEach, afterEach } from 'mocha'; // ✅ Mocha imports
import { expect } from 'chai';             // ✅ Use chai assertions
import { NodeState } from '@olane/o-core'; // ✅ Import types
import { oLeaderNode } from '@olane/o-leader';
import { MyTool } from '../src/my-tool.tool.js'; // ✅ .js extension for ESM

describe('MyTool', () => {
  let leaderNode: oLeaderNode;
  let tool: MyTool;

  // ✅ Setup before each test (use beforeEach or before)
  beforeEach(async () => {
    leaderNode = new oLeaderNode({
      parent: null,
      leader: null,
    });
    await leaderNode.start();

    tool = new MyTool({
      parent: leaderNode.address,
      leader: leaderNode.address,
    });

    // ✅ CRITICAL: Hook injection for parent-child
    (tool as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(tool);
    };

    await tool.start();
  });

  // ✅ Cleanup after each test (use afterEach or after)
  afterEach(async () => {
    await tool.stop();
    await leaderNode.stop();
  });

  // ✅ Tests go here
  it('should start successfully', () => {
    expect(tool.state).to.equal(NodeState.RUNNING);
    expect(tool.address.toString()).to.equal('o://my-tool');
  });
});
```

### File Naming Conventions

| Test Type | File Name | Example |
|-----------|-----------|---------|
| Lifecycle | `lifecycle.spec.ts` | Node start/stop tests |
| Methods | `methods.spec.ts` | Tool method tests |
| Feature | `[feature].spec.ts` | `streaming.spec.ts` |
| Integration | `integration.spec.ts` | Cross-package tests |
| Performance | `benchmark.spec.ts` | Performance tests |

---

## Using TestEnvironment (Recommended)

### Overview

`@olane/o-test` provides a `TestEnvironment` class that **eliminates 80%+ of test boilerplate** by handling:
- ✅ Automatic node lifecycle tracking
- ✅ Leader and child node creation
- ✅ Hook injection for parent-child registration
- ✅ Automatic cleanup in reverse order
- ✅ Common utilities (waitFor, assertions, mocks)

### Quick Start with TestEnvironment

```typescript
import 'dotenv/config';
import { expect } from 'chai';
import { TestEnvironment, assertSuccess } from '@olane/o-test';
import { MyTool } from '../src/my-tool.tool.js';

describe('MyTool with TestEnvironment', () => {
  const env = new TestEnvironment();

  afterEach(async () => {
    await env.cleanup(); // Automatically stops all nodes
  });

  it('should work', async () => {
    // One line creates leader + tool + registration!
    const { leader, tool } = await env.createToolWithLeader(MyTool, {
      apiKey: 'test-key'
    });

    const result = await tool.useSelf({
      method: 'my_method',
      params: { test: 'value' }
    });

    assertSuccess(result); // Type-safe assertion
    expect(result.result.data).to.exist;
  });
});
```

### TestEnvironment API

#### Creating Nodes

```typescript
// Simple node (no leader)
const node = await env.createNode(MyTool, {
  address: new oNodeAddress('o://test'),
  apiKey: 'test-key'
});

// Tool with leader (recommended)
const { leader, tool } = await env.createToolWithLeader(MyTool, {
  apiKey: 'test-key'
});

// Leader only
const leader = await env.createLeader(oLeaderNode);
```

#### Tracking and Cleanup

```typescript
// Track manually created nodes
const customNode = new MyTool({});
env.track(customNode);
await customNode.start();

// Register cleanup callbacks
env.onCleanup(async () => {
  await externalService.disconnect();
});

// Manual cleanup (usually in afterEach)
await env.cleanup();

// Check status
expect(env.getNodeCount()).to.equal(2);
expect(env.allNodesStopped()).to.be.true;
```

#### Wait Utilities

```typescript
// Wait for condition
await env.waitFor(() => tool.isReady, 5000);

// Or use standalone function
import { waitFor, waitForAsync, sleep } from '@olane/o-test';

await waitFor(() => counter > 5, 3000);
await waitForAsync(async () => await db.isConnected());
await sleep(1000);
```

### Test Builders (Fluent API)

#### SimpleNodeBuilder

```typescript
import { SimpleNodeBuilder } from '@olane/o-test';

const node = await new SimpleNodeBuilder(MyTool)
  .withAddress('o://test-tool')
  .withDescription('Test instance')
  .withConfig({ apiKey: 'test', timeout: 5000 })
  .withAutoStart(true)
  .build(env);
```

#### LeaderChildBuilder

```typescript
import { LeaderChildBuilder } from '@olane/o-test';

const { leader, tool } = await new LeaderChildBuilder(MyTool)
  .withToolConfig({ apiKey: 'test-key' })
  .withLeaderAddress('o://custom-leader')
  .withLeaderDescription('Test leader')
  .build(env);
```

#### ManagerWorkerBuilder

```typescript
import { ManagerWorkerBuilder } from '@olane/o-test';

const { leader, manager, workers } = await new ManagerWorkerBuilder(
  MyManager,
  MyWorker
)
  .withManagerConfig({ maxInstances: 5 })
  .withWorkerCount(3)
  .withWorkerConfig({ timeout: 5000 })
  .build(env);
```

### Assertion Helpers

Type-safe assertions that throw descriptive errors:

```typescript
import {
  assertSuccess,
  assertError,
  assertRunning,
  assertStopped,
  assertHasData,
  assertDefined,
  assertArrayLength,
  assertHasProperty,
  assertOneOf,
  assert
} from '@olane/o-test';

// Response assertions
const result = await tool.useSelf({ method: 'test', params: {} });
assertSuccess(result); // Throws if result.success !== true
assertHasData(result); // Throws if result.result.data missing

// Error assertions
assertError(result, 'required'); // Checks error includes "required"

// Node state assertions
assertRunning(tool);
assertStopped(tool);

// General assertions
assertDefined(user, 'user');
assertArrayLength(items, 5);
assertHasProperty(obj, 'userId');
assertOneOf(status, ['pending', 'active', 'completed']);
assert(age >= 18, 'Must be 18 or older');
```

### Streaming with ChunkCapture

```typescript
import { ChunkCapture } from '@olane/o-test';

it('should handle streaming', async () => {
  const capture = new ChunkCapture();

  await tool.useSelf({
    method: 'stream_data',
    params: {},
    onChunk: capture.onChunk.bind(capture)
  });

  // Wait for chunks
  await capture.waitForChunks(5);
  expect(capture.chunkCount).to.equal(5);

  // Or wait for completion
  await capture.waitForComplete();

  // Access chunks
  expect(capture.firstChunk).to.exist;
  expect(capture.lastChunk).to.deep.equal({ done: true });

  // Find specific chunks
  const errors = capture.findChunks(c => c.type === 'error');
  expect(errors).to.have.lengthOf(0);

  // Convert to string
  const fullText = capture.asString();
});
```

### Mock Factories

```typescript
import {
  generateId,
  createMockUser,
  createMockTask,
  createMockSession,
  createMockRequest,
  createMockSuccessResponse,
  createMockErrorResponse,
  generateMockArray
} from '@olane/o-test';

// Generate IDs
const userId = generateId('user'); // "user-1234567890-abc"

// Create mock data
const user = createMockUser({ role: 'admin' });
const task = createMockTask({ status: 'completed' });
const session = createMockSession({ userId: user.userId });

// Mock responses
const success = createMockSuccessResponse({ userId: '123' });
const error = createMockErrorResponse('Not found');

// Generate arrays
const users = generateMockArray(() => createMockUser(), 10);
```

### Fixtures

Pre-built test data for consistency:

```typescript
import {
  MOCK_USERS,
  MOCK_TASKS,
  MOCK_SESSIONS,
  MOCK_CONFIGS,
  MOCK_ADDRESSES,
  MOCK_ERRORS,
  MOCK_STREAM_CHUNKS,
  INVALID_PARAMS,
  VALID_PARAMS,
  TEST_METHODS
} from '@olane/o-test';

// Use mock data
const testUser = MOCK_USERS.admin;
const pendingTask = MOCK_TASKS.pending;
const testConfig = MOCK_CONFIGS.simple;

// Validation testing
const result = await tool.useSelf({
  method: 'test',
  params: INVALID_PARAMS.empty
});
assertError(result, 'required');

// Test methods for mock tools
import { TEST_METHOD_SIMPLE, createTestMethod } from '@olane/o-test';
```

### Migration Guide

**Before (Traditional Pattern):**
```typescript
describe('MyTool', () => {
  let leaderNode: oLeaderNode;
  let tool: MyTool;

  beforeEach(async () => {
    leaderNode = new oLeaderNode({
      parent: null,
      leader: null,
    });
    await leaderNode.start();

    tool = new MyTool({
      parent: leaderNode.address,
      leader: leaderNode.address,
    });

    (tool as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(tool);
    };

    await tool.start();
  });

  afterEach(async () => {
    await tool.stop();
    await leaderNode.stop();
  });

  it('should work', async () => {
    const result = await tool.useSelf({ method: 'test', params: {} });
    expect(result.success).to.be.true;
  });
});
```

**After (With TestEnvironment):**
```typescript
describe('MyTool', () => {
  const env = new TestEnvironment();

  afterEach(async () => {
    await env.cleanup();
  });

  it('should work', async () => {
    const { tool } = await env.createToolWithLeader(MyTool);
    const result = await tool.useSelf({ method: 'test', params: {} });
    assertSuccess(result);
  });
});
```

**Reduction: 30+ lines → 11 lines (63% less code)**

### Benefits

- ✅ **Less Boilerplate**: 60-80% code reduction
- ✅ **Type Safety**: TypeScript assertions with proper guards
- ✅ **Automatic Cleanup**: No leaked nodes between tests
- ✅ **Consistent Patterns**: Same utilities across all packages
- ✅ **Better Errors**: Descriptive assertion failures
- ✅ **Streaming Support**: Built-in chunk capture and validation
- ✅ **Mock Data**: Pre-built fixtures for common scenarios

---

## Critical Lifecycle Testing

### Pattern 1: Simple Node Lifecycle

```typescript
describe('Lifecycle', () => {
  it('should start and stop successfully', async () => {
    const node = new MyTool({
      parent: null,
      leader: null,
    });

    // Verify initial state
    expect(node.state).to.equal(NodeState.STOPPED);

    // Start node
    await node.start();
    expect(node.state).to.equal(NodeState.RUNNING);

    // Stop node
    await node.stop();
    expect(node.state).to.equal(NodeState.STOPPED);
  });
});
```

### Pattern 2: Node with Leader

```typescript
describe('Lifecycle with Leader', () => {
  let leaderNode: oLeaderNode;
  let tool: MyTool;

  beforeEach(async () => {
    // ✅ ALWAYS create leader first
    leaderNode = new oLeaderNode({
      parent: null,
      leader: null,
    });
    await leaderNode.start();
  });

  afterEach(async () => {
    // ✅ Stop in reverse order: child first, then leader
    if (tool) await tool.stop();
    await leaderNode.stop();
  });

  it('should register with leader', async () => {
    tool = new MyTool({
      parent: leaderNode.address,
      leader: leaderNode.address,
    });

    // ✅ CRITICAL: Inject hook for registration
    (tool as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(tool);
    };

    await tool.start();

    expect(tool.state).to.equal(NodeState.RUNNING);
    expect(tool.leader.toString()).to.equal(leaderNode.address.toString());
  });
});
```

### Pattern 3: Testing Initialization Hooks

```typescript
describe('Initialization', () => {
  it('should initialize external services', async () => {
    const tool = new MyToolWithAPI({
      apiKey: 'test-key',
    });

    // Spy on initialization (optional)
    let initCalled = false;
    const originalHook = (tool as any).hookInitializeFinished;
    (tool as any).hookInitializeFinished = async () => {
      initCalled = true;
      await originalHook.call(tool);
    };

    await tool.start();

    expect(initCalled).to.be.true;
    expect(tool.state).to.equal(NodeState.RUNNING);
    // Verify service is ready
    expect((tool as any).apiClient).to.exist;

    await tool.stop();
  });
});
```

---

## Method Testing Patterns

### Pattern 1: Happy Path Method Test

```typescript
describe('Methods', () => {
  let leaderNode: oLeaderNode;
  let tool: MyTool;

  beforeEach(async () => {
    leaderNode = new oLeaderNode({
      parent: null,
      leader: null,
    });
    await leaderNode.start();

    tool = new MyTool({
      parent: leaderNode.address,
      leader: leaderNode.address,
    });

    (tool as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(tool);
    };

    await tool.start();
  });

  afterEach(async () => {
    await tool.stop();
    await leaderNode.stop();
  });

  describe('_tool_my_method', () => {
    it('should process valid request', async () => {
      const result = await tool.useSelf({
        method: 'my_method',
        params: {
          param1: 'test-value',
          param2: 123,
        },
      });

      // ✅ Check success flag
      expect(result.success).to.be.true;

      // ✅ Access data via result.data
      expect(result.result.data).to.exist;
      expect(result.result.data.processedValue).to.equal('test-value');
    });
  });
});
```

### Pattern 2: Parameter Validation Tests

```typescript
describe('_tool_create_user', () => {
  it('should validate required parameters', async () => {
    const result = await tool.useSelf({
      method: 'create_user',
      params: {}, // Missing required params
    });

    // ✅ Should fail validation
    expect(result.success).to.be.false;
    expect(result.error).to.include('username is required');
  });

  it('should validate parameter types', async () => {
    const result = await tool.useSelf({
      method: 'create_user',
      params: {
        username: 123, // Wrong type (should be string)
      },
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('must be a string');
  });

  it('should apply default values', async () => {
    const result = await tool.useSelf({
      method: 'create_user',
      params: {
        username: 'testuser',
        email: 'test@example.com',
        // role not provided - should default
      },
    });

    expect(result.success).to.be.true;
    expect(result.result.data.role).to.equal('user'); // Default value
  });
});
```

### Pattern 3: Testing Method Response Structure

```typescript
describe('Response Structure', () => {
  it('should return properly formatted response', async () => {
    const result = await tool.useSelf({
      method: 'get_data',
      params: { id: 'test-123' },
    });

    // ✅ Response structure validation
    expect(result).to.have.property('success');
    expect(result).to.have.property('result');
    expect(result.result).to.have.property('data');

    // ✅ Data validation
    const data = result.result.data;
    expect(data).to.have.property('id');
    expect(data.id).to.equal('test-123');
  });
});
```

---

## Parent-Child Testing

### Pattern 1: Testing Child Creation

```typescript
describe('Parent-Child Pattern', () => {
  let leaderNode: oLeaderNode;
  let manager: MyManager;

  beforeEach(async () => {
    leaderNode = new oLeaderNode({
      parent: null,
      leader: null,
    });
    await leaderNode.start();

    manager = new MyManager({
      parent: leaderNode.address,
      leader: leaderNode.address,
      maxInstances: 5,
    });

    (manager as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(manager);
    };

    await manager.start();
  });

  afterEach(async () => {
    await manager.stop();
    await leaderNode.stop();
  });

  it('should create child worker', async () => {
    const result = await manager.useSelf({
      method: 'create_worker',
      params: {
        workerId: 'test-worker-1',
        config: { apiKey: 'test-key' },
      },
    });

    expect(result.success).to.be.true;
    expect(result.result.data.workerId).to.equal('test-worker-1');
    expect(result.result.data.address).to.equal('o://my-manager/test-worker-1');
  });
});
```

### Pattern 2: Testing Child Routing

```typescript
describe('Child Routing', () => {
  it('should route requests to child worker', async () => {
    // Create worker
    await manager.useSelf({
      method: 'create_worker',
      params: { workerId: 'worker-1' },
    });

    // Route request to worker
    const result = await manager.useSelf({
      method: 'use_worker',
      params: {
        workerId: 'worker-1',
        method: 'process_task',
        params: { taskData: 'test-data' },
      },
    });

    expect(result.success).to.be.true;
    expect(result.result.data.result).to.exist;
    expect(result.result.data.workerId).to.include('worker-1');
  });

  it('should fail when worker not found', async () => {
    const result = await manager.useSelf({
      method: 'use_worker',
      params: {
        workerId: 'non-existent',
        method: 'process_task',
        params: {},
      },
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('not found');
  });
});
```

### Pattern 3: Testing Resource Limits

```typescript
describe('Resource Management', () => {
  it('should enforce max instances limit', async () => {
    const maxInstances = 3;
    const manager = new MyManager({
      parent: leaderNode.address,
      leader: leaderNode.address,
      maxInstances,
    });

    (manager as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(manager);
    };

    await manager.start();

    // Create max instances
    for (let i = 0; i < maxInstances; i++) {
      const result = await manager.useSelf({
        method: 'create_worker',
        params: { workerId: `worker-${i}` },
      });
      expect(result.success).to.be.true;
    }

    // Try to exceed limit
    const overflowResult = await manager.useSelf({
      method: 'create_worker',
      params: { workerId: 'overflow-worker' },
    });

    expect(overflowResult.success).to.be.false;
    expect(overflowResult.error).to.include('Max instances');

    await manager.stop();
  });
});
```

### Pattern 4: Testing Cascading Cleanup

```typescript
describe('Cleanup', () => {
  it('should stop all children when parent stops', async () => {
    // Create multiple workers
    await manager.useSelf({
      method: 'create_worker',
      params: { workerId: 'worker-1' },
    });
    await manager.useSelf({
      method: 'create_worker',
      params: { workerId: 'worker-2' },
    });

    // Verify workers exist
    const listResult = await manager.useSelf({
      method: 'list_workers',
      params: {},
    });
    expect(listResult.result.data.count).to.equal(2);

    // Stop manager
    await manager.stop();

    // Verify manager stopped
    expect(manager.state).to.equal(NodeState.STOPPED);

    // Children should also be stopped (verify via internal state if accessible)
    // This validates cascading cleanup implementation
  });
});
```

---

## Error Handling Tests

### Pattern 1: Validation Errors

```typescript
describe('Error Handling', () => {
  describe('Parameter Validation', () => {
    it('should throw error for missing required param', async () => {
      const result = await tool.useSelf({
        method: 'process_data',
        params: {
          // param1 missing
        },
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('param1 is required');
    });

    it('should throw error for invalid type', async () => {
      const result = await tool.useSelf({
        method: 'process_data',
        params: {
          param1: 123, // Should be string
        },
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('must be a string');
    });
  });
});
```

### Pattern 2: Business Logic Errors

```typescript
describe('Business Logic Errors', () => {
  it('should handle resource not found', async () => {
    const result = await tool.useSelf({
      method: 'get_user',
      params: {
        userId: 'non-existent-id',
      },
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('not found');
  });

  it('should handle invalid state transitions', async () => {
    // Create resource in initial state
    const createResult = await tool.useSelf({
      method: 'create_task',
      params: { taskId: 'task-1' },
    });
    expect(createResult.success).to.be.true;

    // Try invalid transition
    const result = await tool.useSelf({
      method: 'complete_task',
      params: {
        taskId: 'task-1',
        // Task not started, can't complete
      },
    });

    expect(result.success).to.be.false;
    expect(result.error).to.include('Invalid state');
  });
});
```

### Pattern 3: External Service Errors

```typescript
describe('External Service Errors', () => {
  it('should handle API connection failure', async () => {
    const tool = new MyTool({
      apiEndpoint: 'http://invalid-endpoint.test',
    });

    // Start should fail if API is required
    let startError: Error | null = null;
    try {
      await tool.start();
    } catch (error) {
      startError = error as Error;
    }

    expect(startError).to.exist;
    expect(startError?.message).to.include('connection');
  });

  it('should handle API timeout', async function () {
    this.timeout(10000); // Increase timeout for this test

    const result = await tool.useSelf({
      method: 'slow_operation',
      params: {},
    });

    // Verify timeout handling
    expect(result.success).to.be.false;
    expect(result.error).to.include('timeout');
  });
});
```

---

## Test Helpers & Utilities

### Creating Shared Test Helpers

```typescript
// test/helpers/test-nodes.ts
import { oLeaderNode } from '@olane/o-leader';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';

/**
 * Test leader node with streaming capabilities
 */
export class TestLeaderNode extends oLeaderNode {
  async *_tool_test_stream(): AsyncGenerator<any> {
    yield { message: 'stream-1' };
    yield { message: 'stream-2' };
    yield { message: 'stream-3' };
  }
}

/**
 * Test tool with streaming capabilities
 */
export class TestLaneTool extends oLaneTool {
  constructor(config: any) {
    super({
      ...config,
      address: new oNodeAddress('o://test-tool'),
      description: 'Test tool for unit tests',
    });
  }

  async *_tool_test_stream(): AsyncGenerator<any> {
    for (let i = 0; i < 5; i++) {
      yield { count: i };
    }
  }

  async _tool_echo(request: any): Promise<any> {
    return request.params;
  }
}
```

### Test Fixtures

```typescript
// test/fixtures/mock-data.ts

export const MOCK_USER = {
  userId: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
};

export const MOCK_TASK = {
  taskId: 'task-456',
  title: 'Test Task',
  status: 'pending',
  createdAt: Date.now(),
};

export const INVALID_PARAMS = {
  empty: {},
  wrongType: { userId: 123 },
  missing: { username: 'test' },
};
```

### Utility Functions

```typescript
// test/helpers/test-utils.ts

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Create and start leader node
 */
export async function createLeaderNode(): Promise<oLeaderNode> {
  const leader = new oLeaderNode({
    parent: null,
    leader: null,
  });
  await leader.start();
  return leader;
}

/**
 * Create and start tool with leader
 */
export async function createToolWithLeader<T>(
  ToolClass: new (config: any) => T,
  config: any = {}
): Promise<{ leader: oLeaderNode; tool: T }> {
  const leader = await createLeaderNode();

  const tool = new ToolClass({
    ...config,
    parent: leader.address,
    leader: leader.address,
  });

  (tool as any).hookInitializeFinished = () => {
    leader.addChildNode(tool as any);
  };

  await (tool as any).start();

  return { leader, tool };
}

/**
 * Cleanup leader and tool
 */
export async function cleanup(
  tool: any,
  leader: oLeaderNode
): Promise<void> {
  if (tool) await tool.stop();
  if (leader) await leader.stop();
}
```

### Using Test Helpers

```typescript
// test/my-tool.spec.ts
import 'dotenv/config';
import { expect } from 'chai';
import { MyTool } from '../src/my-tool.tool.js';
import { createToolWithLeader, cleanup } from './helpers/test-utils.js';
import { MOCK_USER } from './fixtures/mock-data.js';

describe('MyTool with Helpers', () => {
  let leader: oLeaderNode;
  let tool: MyTool;

  beforeEach(async () => {
    ({ leader, tool } = await createToolWithLeader(MyTool, {
      apiKey: 'test-key',
    }));
  });

  afterEach(async () => {
    await cleanup(tool, leader);
  });

  it('should create user with mock data', async () => {
    const result = await tool.useSelf({
      method: 'create_user',
      params: MOCK_USER,
    });

    expect(result.success).to.be.true;
    expect(result.result.data.userId).to.equal(MOCK_USER.userId);
  });
});
```

---

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test test/lifecycle.spec.ts

# Run tests with coverage
pnpm test -- --coverage

# Run tests for specific package (from monorepo root)
pnpm test --filter @olane/o-my-tool
```

### Debug Mode

```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with verbose output
pnpm test -- --verbose

# Run single test
pnpm test -- -t "should start successfully"
```

### Environment Variables

```bash
# .env.test (for test-specific config)
NODE_ENV=test
LOG_LEVEL=error
API_ENDPOINT=http://localhost:3000
API_KEY=test-key-123
MAX_INSTANCES=5
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '22.x'
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm test
```

---

## Common Pitfalls

### ❌ Pitfall 1: Not Calling hookInitializeFinished

```typescript
// ❌ WRONG: Child won't be registered
const tool = new MyTool({
  parent: leaderNode.address,
  leader: leaderNode.address,
});
await tool.start(); // Child not registered!

// ✅ CORRECT: Inject hook
(tool as any).hookInitializeFinished = () => {
  leaderNode.addChildNode(tool);
};
await tool.start();
```

### ❌ Pitfall 2: Not Cleaning Up Nodes

```typescript
// ❌ WRONG: Nodes leak between tests
describe('MyTool', () => {
  it('test 1', async () => {
    const tool = new MyTool({});
    await tool.start();
    // No cleanup!
  });
});

// ✅ CORRECT: Always clean up
describe('MyTool', () => {
  let tool: MyTool;

  afterEach(async () => {
    if (tool) await tool.stop();
  });

  it('test 1', async () => {
    tool = new MyTool({});
    await tool.start();
  });
});
```

### ❌ Pitfall 3: Wrong Import Extensions

```typescript
// ❌ WRONG: Missing .js extension (ESM requirement)
import { MyTool } from '../src/my-tool.tool';

// ✅ CORRECT: Include .js extension
import { MyTool } from '../src/my-tool.tool.js';
```

### ❌ Pitfall 4: Not Loading Environment

```typescript
// ❌ WRONG: Env vars not loaded
import { MyTool } from '../src/my-tool.tool.js';

// ✅ CORRECT: Load dotenv first
import 'dotenv/config';
import { MyTool } from '../src/my-tool.tool.js';
```

### ❌ Pitfall 5: Incorrect Response Access

```typescript
// ❌ WRONG: Accessing response incorrectly
const result = await tool.useSelf({ method: 'get_data', params: {} });
const data = result.data; // Undefined!

// ✅ CORRECT: Access via result.result.data
const data = result.result.data;
```

### ❌ Pitfall 6: Forgetting dotenv/config

```typescript
// ❌ WRONG: Environment variables won't load
describe('MyTool', () => {
  it('should work', async () => {
    const tool = new MyTool({
      apiKey: process.env.API_KEY, // undefined!
    });
  });
});

// ✅ CORRECT: Import dotenv/config at top
import 'dotenv/config';

describe('MyTool', () => {
  it('should work', async () => {
    const tool = new MyTool({
      apiKey: process.env.API_KEY, // Loaded from .env
    });
  });
});
```

---

## Quick Reference

### Test Checklist

- [ ] `import 'dotenv/config'` at top of file
- [ ] Use `.js` extensions in imports
- [ ] Create leader node in `beforeEach`
- [ ] Inject `hookInitializeFinished` for children
- [ ] Call `await node.start()` for all nodes
- [ ] Call `await node.stop()` in `afterEach`
- [ ] Use `expect` from `chai`
- [ ] Access results via `result.result.data`
- [ ] Check `result.success` before accessing data
- [ ] Test both success and error paths

### Essential Patterns

```typescript
// 1. Setup with leader
beforeEach(async () => {
  leaderNode = new oLeaderNode({ parent: null, leader: null });
  await leaderNode.start();

  tool = new MyTool({
    parent: leaderNode.address,
    leader: leaderNode.address,
  });

  (tool as any).hookInitializeFinished = () => {
    leaderNode.addChildNode(tool);
  };

  await tool.start();
});

// 2. Cleanup
afterEach(async () => {
  await tool.stop();
  await leaderNode.stop();
});

// 3. Test method
it('should work', async () => {
  const result = await tool.useSelf({
    method: 'my_method',
    params: { param1: 'value' },
  });

  expect(result.success).to.be.true;
  expect(result.result.data).to.exist;
});
```

### Common Assertions

```typescript
// State
expect(node.state).to.equal(NodeState.RUNNING);
expect(node.state).to.equal(NodeState.STOPPED);

// Success/failure
expect(result.success).to.be.true;
expect(result.success).to.be.false;

// Data existence
expect(result.result.data).to.exist;
expect(result.result.data.id).to.equal('test-123');

// Errors
expect(result.error).to.include('required');
expect(result.error).to.include('not found');

// Arrays
expect(result.result.data.items).to.have.lengthOf(3);
expect(result.result.data.workers).to.be.an('array');

// Objects
expect(result.result.data).to.have.property('id');
expect(result.result.data.config).to.deep.equal({ key: 'value' });
```

---

## Summary

**Remember the essentials:**

1. ✅ Always use `import 'dotenv/config'` first
2. ✅ Always create leader before children
3. ✅ Always inject `hookInitializeFinished` for parent-child
4. ✅ Always clean up with `stop()` in `afterEach`
5. ✅ Always use `.js` extensions in imports
6. ✅ Always access data via `result.result.data`
7. ✅ Always test both success and error paths

**Keep tests:**
- Simple and focused
- Integration-oriented (real nodes)
- Practical (real hierarchies)
- Complete (proper lifecycle management)

**Minimum required tests:**
- Lifecycle (start/stop)
- Each public method (happy path)
- Parameter validation
- Error handling

---

For questions, issues, or contributions, see the main CLAUDE.md documentation or open an issue on GitHub.
