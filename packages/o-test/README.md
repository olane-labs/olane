# @olane/o-test

> Testing utilities and best practices for O-Network node development

## ⚠️ Important: Testing Framework Notes

Since O-Network is built on the **libp2p ecosystem**, the primary test runner is **aegir** with **Mocha** syntax.

- ✅ Primary: `aegir`, `chai`, Mocha syntax (`before`, `after`, `.to.equal()`)
- ✅ Also available: `jest` and `@types/jest` are included in devDependencies (^30.0.0) for packages that need Jest-style testing

> **Note**: Both test frameworks are available in this package. The `package.json` includes `jest`, `@types/jest`, and `ts-jest` in devDependencies alongside `aegir` and `chai`. The `test` script uses `aegir test` by default, but Jest can be used for individual packages or specific test scenarios. When writing new tests, follow the conventions of the file you are editing -- Mocha/Chai for aegir-based tests, or Jest assertions if the test file uses Jest.

See [MOCHA-MIGRATION.md](./MOCHA-MIGRATION.md) for migration guide.

## Overview

`@olane/o-test` provides comprehensive testing guidelines, utilities, and examples for building reliable O-Network nodes in the Olane OS ecosystem.

## Quick Start

### Installation

```bash
# From your package directory
pnpm install --save-dev @olane/o-test

# Install testing dependencies (aegir uses Mocha internally)
pnpm install --save-dev aegir chai
```

**Important:** Since we're using the **libp2p ecosystem**, we use **aegir** as our test runner, which uses **Mocha** (not Jest). Do not install Jest dependencies.

### Basic Test Structure

```typescript
import 'dotenv/config';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { oLeaderNode } from '@olane/o-leader';
import { MyTool } from '../src/my-tool.tool.js';

describe('MyTool', () => {
  let leaderNode: oLeaderNode;
  let tool: MyTool;

  before(async () => {
    // Create leader
    leaderNode = new oLeaderNode({
      parent: null,
      leader: null,
    });
    await leaderNode.start();

    // Create tool
    tool = new MyTool({
      parent: leaderNode.address,
      leader: leaderNode.address,
    });

    // Register with parent
    (tool as any).hookInitializeFinished = () => {
      leaderNode.addChildNode(tool);
    };

    await tool.start();
  });

  after(async () => {
    await tool.stop();
    await leaderNode.stop();
  });

  it('should start successfully', () => {
    expect(tool.state).to.equal(NodeState.RUNNING);
  });

  it('should execute method', async () => {
    const response = await tool.useSelf({
      method: 'my_method',
      params: { test: 'value' },
    });

    expect(response.result.success).to.be.true;
    expect(response.result.data).to.exist;
  });
});
```

## Documentation

### 📚 [Complete Testing Guide](./TESTING.md)

Comprehensive guide covering:
- Testing philosophy and baseline requirements
- Testing stack and configuration
- Lifecycle, method, and parent-child testing patterns
- Error handling and validation tests
- Test helpers and utilities
- CI/CD integration
- Common pitfalls and troubleshooting

### 🔄 [Jest to Mocha Migration Guide](./MOCHA-MIGRATION.md)

Quick reference for converting tests from Jest to Mocha:
- Side-by-side syntax comparison
- Complete code examples
- Common pitfalls and solutions
- Quick reference table

## Baseline Requirements

Every O-Network package **must** have:

| Requirement | File/Location |
|-------------|---------------|
| Test directory | `/test/` |
| Lifecycle test | `test/lifecycle.spec.ts` |
| Method tests | `test/methods.spec.ts` |
| Aegir config | `.aegir.js` (optional) |
| Test script | `"test": "aegir test"` in package.json |

**Note:** No Jest configuration needed - aegir uses Mocha internally for the libp2p ecosystem.

## Minimum Test Coverage

-  All nodes must have lifecycle tests (start/stop)
-  All public methods (`_tool_*`) must have happy path tests
-  All required parameters must have validation tests
-  Parent-child patterns must test registration and routing
-  Critical error paths must be tested

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test test/lifecycle.spec.ts

# Run with coverage
pnpm test -- --coverage
```

## Configuration Files

### `.aegir.js` (Optional)

Aegir works out of the box with sensible defaults. Configuration is only needed for customization:

```javascript
export default {
  test: {
    target: ['node'],  // or ['browser'], or ['node', 'browser']
  },
  build: {
    bundlesizeMax: '100KB',
  },
};
```

**Important for libp2p ecosystem:**
- ✅ Aegir uses **Mocha** as the test runner (not Jest)
- ✅ Use Mocha syntax: `before`, `after`, `beforeEach`, `afterEach`
- ✅ Use Chai assertions: `expect().to.equal()`, `expect().to.exist`, etc.
- ❌ Do NOT install or use `jest`, `@types/jest`, or `ts-jest`

## Critical Testing Rules

###  DO:

- Load environment with `import 'dotenv/config'`
- Use `.js` extensions in imports (ESM requirement)
- Create leader node before child nodes
- Inject `hookInitializeFinished` for parent-child registration
- Clean up all nodes in `afterEach`
- Access response data via `response.result.data`
- Test both success and error paths

### L DON'T:

- Override `start()` method (use hooks instead)
- Forget to call `stop()` on nodes
- Access `response.data` directly (use `response.result.data`)
- Use mocks for node instances (use real nodes)
- Share mutable state between tests

## Response Structure

When testing `node.use()` or `node.useSelf()` calls, responses are wrapped in the standard O-Network response structure. Understanding this structure is critical for writing correct assertions.

```typescript
// Response from use() / useSelf():
// {
//   jsonrpc: "2.0",
//   id: "request-id",
//   result: {
//     success: boolean,    // Whether the operation succeeded
//     data: any,           // The returned data (on success)
//     error?: string       // Error details (on failure)
//   }
// }

// Correct assertion patterns:
const response = await tool.useSelf({
  method: 'my_method',
  params: { key: 'value' },
});

// Success case
expect(response.result.success).to.be.true;
expect(response.result.data).to.exist;
expect(response.result.data.someField).to.equal('expected');

// Error case
expect(response.result.success).to.be.false;
expect(response.result.error).to.include('error message');

// WRONG - these will not work:
// expect(response.success).to.be.true;     // undefined!
// expect(response.data).to.exist;           // undefined!
// expect(response.error).to.include('...');  // undefined!
```

> **Key rule**: Always access response fields through `response.result.success`, `response.result.data`, and `response.result.error`. Never access `response.success`, `response.data`, or `response.error` directly.

## Testing Philosophy

We prioritize **practical, integration-oriented tests** that validate real node behavior:

-  Real node instances over mocks
-  Actual lifecycle management
-  Parent-child relationships
-  Simple, focused test cases
-  Integration over unit isolation

## Test Patterns

### Lifecycle Testing

```typescript
it('should start and stop successfully', async () => {
  const node = new MyTool({
    parent: null,
    leader: null,
  });

  await node.start();
  expect(node.state).to.equal(NodeState.RUNNING);

  await node.stop();
  expect(node.state).to.equal(NodeState.STOPPED);
});
```

### Method Testing

```typescript
it('should validate required parameters', async () => {
  const response = await tool.useSelf({
    method: 'my_method',
    params: {}, // Missing required params
  });

  expect(response.result.success).to.be.false;
  expect(response.result.error).to.include('required');
});
```

### Parent-Child Testing

```typescript
it('should create and route to child', async () => {
  // Create child
  const createResponse = await manager.useSelf({
    method: 'create_worker',
    params: { workerId: 'worker-1' },
  });
  expect(createResponse.result.success).to.be.true;

  // Route to child
  const routeResponse = await manager.useSelf({
    method: 'use_worker',
    params: {
      workerId: 'worker-1',
      method: 'process_task',
      params: { data: 'test' },
    },
  });
  expect(routeResponse.result.success).to.be.true;
});
```

## Common Pitfalls

### Pitfall 1: Missing Hook Injection

```typescript
// L WRONG
const tool = new MyTool({ parent: leader.address, leader: leader.address });
await tool.start(); // Child not registered!

//  CORRECT
const tool = new MyTool({ parent: leader.address, leader: leader.address });
(tool as any).hookInitializeFinished = () => {
  leaderNode.addChildNode(tool);
};
await tool.start();
```

### Pitfall 2: No Cleanup

```typescript
// L WRONG
it('test', async () => {
  const tool = new MyTool({});
  await tool.start();
  // No cleanup - nodes leak!
});

//  CORRECT
afterEach(async () => {
  if (tool) await tool.stop();
  if (leader) await leader.stop();
});
```

### Pitfall 3: Wrong Response Access

```typescript
// L WRONG
const data = response.data;           // undefined!
const success = response.success;     // undefined!
const error = response.error;         // undefined!

//  CORRECT
const data = response.result.data;
const success = response.result.success;
const error = response.result.error;
```

## Test Helpers

Create shared utilities for common patterns:

```typescript
// test/helpers/test-utils.ts
export async function createToolWithLeader<T>(
  ToolClass: new (config: any) => T,
  config: any = {}
): Promise<{ leader: oLeaderNode; tool: T }> {
  const leader = new oLeaderNode({ parent: null, leader: null });
  await leader.start();

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
```

## Example Tests

See the `test/` directory for complete examples:

- `test/lifecycle.spec.ts` - Node lifecycle testing
- `test/methods.spec.ts` - Method validation and execution
- `test/parent-child.spec.ts` - Manager/worker pattern testing
- `test/helpers/` - Shared test utilities

## Resources

- [TESTING.md](./TESTING.md) - Complete testing guide
- [CLAUDE.md](./CLAUDE.md) - O-Network node development guide
- [Olane Documentation](https://docs.olane.ai) - Full ecosystem docs

## Package Structure

```
o-test/
   src/
      index.ts                  # Public exports
      example-tool.tool.ts      # Example tool implementation
      methods/
          example.methods.ts    # Method definitions
   test/
      lifecycle.spec.ts         # Lifecycle tests
      methods.spec.ts           # Method tests
      parent-child.spec.ts      # Parent-child tests
      helpers/
         test-utils.ts         # Test utilities
      fixtures/
          mock-data.ts          # Test data
   jest.config.js                # Jest configuration
   .aegir.js                     # Aegir configuration
   tsconfig.json                 # TypeScript configuration
   package.json                  # Package metadata
   README.md                     # This file
   TESTING.md                    # Complete testing guide
   CLAUDE.md                     # Development guide
```

## Contributing

When adding tests:

1. Follow the patterns in [TESTING.md](./TESTING.md)
2. Ensure all baseline requirements are met
3. Test both success and error paths
4. Clean up all resources
5. Use descriptive test names

## License

See the root LICENSE file in the Olane monorepo.

## Support

- GitHub Issues: [olane/issues](https://github.com/olane-labs/olane/issues)
- Documentation: [docs.olane.ai](https://docs.olane.ai)
- Community: [Discord](https://discord.gg/olane)

---

**Remember:**
-  Real nodes, not mocks
-  Proper lifecycle management
-  Clean up in `afterEach`
-  Test integration, not isolation
-  Keep it simple

For detailed testing patterns and examples, see [TESTING.md](./TESTING.md).
