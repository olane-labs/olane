# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Monorepo layout & architecture

- This is a TypeScript/ESM monorepo (`"type": "module"`) managed via npm workspaces in the root `package.json` (`"workspaces": ["packages/*"]`). Most packages are published under the `@olane/*` scope.
- High-level structure:
  - `packages/` – source for all core Olane OS libraries and tools.
  - `examples/` – small example apps/tool setups that demonstrate how to compose packages.
  - `docs/` – Mintlify-powered documentation site; mirrors and expands the root `README.md` concepts.

### Key packages and their roles

You’ll be most productive if you understand how the major packages layer together:

- `@olane/o-core` (`packages/o-core`)
  - Kernel layer of Olane OS – abstract runtime for tool nodes.
  - Defines `oCore`, `oAddress`, routing, connection management, metrics, lifecycle states, and JSON-RPC-style request/response.
  - Transport-agnostic: no direct libp2p or network details here.

- `@olane/o-node` (`packages/o-node`)
  - Production distribution layer built on `o-core`.
  - Implements libp2p networking, multiaddresses, P2P node types (`oServerNode`, `oClientNode`, `oWebSocketNode`), and secure connection gating.
  - Extends `oCore` to give concrete networked tool nodes with discovery and registration against leaders.

- `@olane/o-lane` (`packages/o-lane`)
  - Agentic process/lane manager on top of `o-node`.
  - Provides `oLane`, `oLaneTool`, capabilities, and the evaluate/plan/execute loop that turns intents into emergent multi-step workflows.
  - Lanes capture execution history (sequences) and support streaming updates.

- `@olane/os` (`packages/o-os`)
  - OS runtime that wires leaders and worker nodes into a running “Olane OS” instance.
  - Manages an `OlaneOS` process: starting/stopping leaders and worker nodes, entry-point routing (round-robin to workers), and configuration of the OS instance.

- `@olane/o-mcp` (`packages/o-mcp`)
  - Bridge between Model Context Protocol (MCP) servers and Olane networks.
  - `McpBridgeTool` runs as a complex node (lane-enabled) that can add remote/local MCP servers and expose them as `o://` tool nodes discoverable by agents.

- `@olane/o-tool-registry` (`packages/o-tool-registry`)
  - Legacy registry of pre-built tools (OAuth, embeddings, NER, vector storage, etc.).
  - Still functional, but being phased out in favor of dedicated tool packages; `initRegistryTools` can attach a bundle of tools as children under a parent node.

- `@olane/o-test` (`packages/o-test`)
  - Shared testing utilities and conventions for O-Network node development.
  - Encodes the expected testing stack (aegir + Mocha/Chai), directory layout, and baseline test coverage requirements.

Many other packages (`o-config`, `o-intelligence`, `o-leader`, `o-login`, `o-storage`, `o-server`, etc.) are support layers that sit under the OS/runtime, but the packages above define most of the architectural “big picture”.

### Conceptual model

At a high level, the architecture follows the three-layer pattern described in `README.md` and the package READMEs:

- **Agents (humans & LLMs)** – issue intents and tool calls.
- **Tool nodes** – instances of `oNodeTool`/`oLaneTool`/`Mcp*` classes that implement capabilities and live at `o://` addresses.
- **Olane OS runtime** – provided by `o-core`, `o-node`, `o-lane`, and `o-os` to handle addressing, routing, networking, discovery, and process management.

Most application work in this repo involves:

- Implementing new tool nodes (simple or lane-enabled) in one of the packages.
- Wiring those nodes into an `OlaneOS` instance or an existing network/leader.
- Exposing methods and method metadata so agents can discover and use them.

## Commands & workflows

### Install & bootstrap

Preferred package manager in the CLAUDE guides is **pnpm**, but the monorepo is wired via npm workspaces. In practice either works; scripts are defined in `package.json`.

From the repo root:

- Install dependencies for all packages:
  - `pnpm install`
  - or `npm install` (equivalent to `npm run install:all` since the root script is `"install:all": "npm install"`).

### Build

- Build all packages in the workspace:
  - From root: `npm run build`
    - Runs `npm run build --workspaces --if-present`, which calls each package’s `build` script (typically `tsc` or `rm -rf dist && tsc`).
- Build a single package:
  - `cd packages/o-core && npm run build`
  - `cd packages/o-node && npm run build`
  - `cd packages/o-os && npm run build`

Some packages (e.g. `@olane/os`) have convenience build scripts that trigger builds in related packages (`build:all` in `packages/o-os` builds the root and several tool packages before building `o-os`). Use those when working specifically on OS-level behavior.

### Tests

The repo standard is **aegir + Mocha/Chai**, not Jest, even though Jest devDependencies exist in several `package.json`s. Testing conventions are documented in `packages/o-test/README.md` and `packages/o-test/TESTING.md`.

Common patterns:

- Run tests across all packages:
  - From root: `npm test`
    - Script: `npm run test --workspaces --if-present` → each package runs its own `test` script (usually `aegir test`).
- Run only Node or browser tests across packages (where defined):
  - `npm run test:node`
  - `npm run test:browser`

Per-package, from inside `packages/<name>`:

- Run all tests for a single package:
  - `npm test` (or `pnpm test`) → `aegir test`.
- Run Node-only or browser-only tests:
  - `npm run test:node`
  - `npm run test:browser`
- Run a specific test file (pattern from `@olane/o-test`):
  - `npm test test/lifecycle.spec.ts`
  - You can substitute any other test path under `test/`, e.g. `npm test test/methods.spec.ts`.
- Package-specific test shortcuts (example from `@olane/os`):
  - `npm run test:basic` – basic OS usage tests.
  - `npm run test:capabilities` – OS capability-focused tests.
  - `npm run test:benchmarks` – performance/benchmark suite.

Testing conventions to keep in mind (from `@olane/o-test`):

- Each package should have:
  - `test/lifecycle.spec.ts` – start/stop and lifecycle coverage.
  - `test/methods.spec.ts` – public `_tool_*` method behavior and validation.
  - Optional parent-child tests for manager/worker patterns.
- Tests use Mocha’s `describe/it/before/after` and Chai `expect`, run via `aegir test`.

### Linting

- Lint all packages:
  - From root: `npm run lint`
    - Delegates to each package’s `lint` script via workspaces.
- Lint a specific package:
  - `cd packages/o-core && npm run lint` (usually `aegir lint`).
  - `cd packages/o-node && npm run lint` (eslint over `src/**/*.ts`).
  - `cd packages/o-lane && npm run lint` (eslint over `src/**/*.ts`).

### Development / watch scripts

There is no single global dev server. Development is typically done per package:

- `cd packages/o-core && npm run dev`
- `cd packages/o-node && npm run dev`
- `cd packages/o-lane && npm run dev`
- `cd packages/o-test && npm run dev`

These dev scripts usually run `tsx` against a local `src/tests/index.ts` or equivalent harness with `DEBUG=o-protocol:*` enabled for verbose logging.

### Documentation

To work on the documentation site locally:

- `npm run docs:dev` – start Mintlify dev server under `docs/`.
- `npm run docs:build` – build static docs.

Conceptual and API docs for most packages live under `docs/` and individual `packages/*/README.md` files; start with the root `README.md` for an architectural overview and then drill into specific packages.

### Versioning & publishing (maintainers)

The root `package.json` defines a Lerna-based flow:

- Compute changes and diffs:
  - `npm run lerna:changed`
  - `npm run lerna:diff`
- Bump versions:
  - `npm run lerna:version:patch`
  - `npm run lerna:version:minor`
  - `npm run lerna:version:major`
  - `npm run lerna:version:alpha` / `lerna:version:beta` / `lerna:version:rc` for prereleases.
- Publish from existing versions:
  - `npm run lerna:publish`
  - `npm run lerna:publish:dry` for a dry-run.

Individual package publishing is handled via their `prepublishOnly` and `build` scripts (usually `npm run build` then `npm publish` from the package directory) and is also documented in `CLAUDE.md`.

## Node & tool implementation patterns

The CLAUDE guides (`CLAUDE.md` in the repo root and `packages/o-test/CLAUDE.md`) encode important conventions for building O-Network nodes and tools. Future changes should respect these patterns.

### Base classes and when to use them

- `oNodeTool` (from `@olane/o-node`)
  - For simpler tools with 1–5 focused capabilities and direct method calls.
- `oLaneTool` (from `@olane/o-lane`)
  - For intent-driven tools with larger method surfaces; agents call `method: 'intent'` and the lane capability loop decides which `_tool_*` methods to invoke.
- `McpBridgeTool` / `McpTool` (from `@olane/o-mcp`)
  - For bridging MCP servers; MCP tools are auto-exposed as tool methods and discoverable in the Olane network.

### Lifecycle rules

When implementing new tools/nodes:

- **Do not** override `start()` – it orchestrates initialization, registration, and state transitions.
- Use the following hooks instead:
  - `hookInitializeFinished()` – initialize third-party services, heavy resources, and child node registration hooks; always `await super.hookInitializeFinished()` at the end.
  - `hookStartFinished()` – start background tasks, spawn child nodes, log registration; always `await super.hookStartFinished()` at the end.
  - `stop()` – override to perform cleanup (disconnect clients, stop children), then `await super.stop()`.
- Parent/manager tools that own children should cascade `stop()` to all children and clear internal maps.

### Addressing & parent-child patterns

- Constructors should use **simple addresses** for nodes, e.g. `new oNodeAddress('o://my-tool')` or `new oNodeAddress('o://worker-1')`.
- Hierarchical addresses (`o://parent/child`) are created at runtime based on `parent` and `leader` fields:
  - Parent sets `parent: this.address` and `leader: this.leader` when constructing a child.
  - The child’s effective address becomes `o://parent/<childId>` after registration.
- For manager/worker patterns:
  - Managers keep a `Map<id, worker>` of child instances.
  - After constructing a child, inject `hookInitializeFinished` to call `addChildNode(child)` so the hierarchy manager and routing know about it.
  - Expose manager methods like `_tool_create_worker`, `_tool_use_worker`, `_tool_list_workers`, `_tool_remove_worker` that manage and proxy to children.

### Method exposure & discovery

- All methods intended for agents must be prefixed with `_tool_` (e.g. `_tool_get_customer`, `_tool_process_task`). Methods without this prefix are not discoverable.
- Each tool class should provide method definitions via a separate `methods/*.methods.ts` file (e.g. `MY_TOOL_METHODS`) passed into the constructor config:
  - Method definitions describe `name`, `description`, parameter schemas (types, required flags, defaults), dependencies, example usages, and common errors.
  - These definitions are used for agent discovery, validation, and documentation.

### Error handling & return values

- Within `_tool_*` methods:
  - **Throw** errors for validation failures and exceptional conditions (e.g. missing required params, invalid enums, external service failures).
  - **Return raw data** (plain JSON-serializable objects) on success.
- The base classes handle wrapping your returns into the JSON-RPC response envelope.
- When calling other nodes via `use`:
  - Always inspect the `result` field on the response object as documented in `CLAUDE.md` and the package READMEs (for many tools this is `response.result.success`, `response.result.data`, `response.result.error`).
  - Do not assume the callee’s raw return shape; always go through the wrapper.

## Testing conventions

The repository-standard testing approach is centralized in `@olane/o-test` and is worth following whenever you add or modify tests.

### Stack and layout

- Test runner: **aegir**, which uses **Mocha** under the hood.
- Assertions: **Chai** (`expect` style).
- Per-package layout:
  - `test/lifecycle.spec.ts` – node lifecycle (start/stop), including parent-child registration when applicable.
  - `test/methods.spec.ts` – core `_tool_*` behaviors, parameter validation, error conditions.
  - Optional: `test/parent-child.spec.ts`, `test/helpers/`, and fixtures for more complex patterns.
- Avoid introducing new Jest-based tests; if you see Jest types/config, they exist primarily for compatibility and should not be the pattern for new code.

### Node testing patterns

Common patterns from `@olane/o-test` and the package READMEs:

- Create a leader node (`oLeaderNode`) in `before` hooks and attach tools as children via `leader.addChildNode(tool)` in `hookInitializeFinished`.
- Use real nodes instead of mocks – tests spin up actual `oNodeTool`/`oLaneTool` instances and call `start()`/`stop()`.
- When testing tool methods:
  - Prefer calling through the node’s own `use`/`useSelf` API with realistic payloads.
  - Verify both success paths (correct data shape) and error paths (validation errors, limits like max instances).
- Clean up thoroughly in `after`/`afterEach` by stopping tools and leaders to avoid leaked libp2p nodes between tests.

## OS-level runtime

When working on the OS/runtime as a whole (`@olane/os`):

- `OlaneOS` is configured with a list of nodes (leaders and workers) and optional lanes/plans; it then manages their lifecycle and acts as a router for external requests.
- Typical flow (see `packages/o-os/README.md` for code-level examples):
  - Construct an `OlaneOS` instance with a root leader (`NodeType.LEADER`) and one or more worker nodes (`NodeType.NODE`), usually using `oLaneTool` subclasses.
  - Call `os.start()` to bring the network up; the OS will start each node, register them, and expose an entry point.
  - Use `os.use(oAddress, { method, params })` to forward requests into the network.
  - Call `os.stop()` to gracefully shut everything down.

Understanding how `o-core`, `o-node`, `o-lane`, and `o-os` fit together—and following the node lifecycle, addressing, and testing conventions documented here—will make it much easier for future agents to modify or extend this repository safely.

## Testing Conventions

This project uses aegir with Mocha + Chai for tests.

•  Runner
  ◦  npm test (aegir)
  ◦  Do not assume Jest: avoid jest.mock, describe.each, expect(...).rejects.toThrow, etc.

## Principles

•  Test behavior, not shapes
◦  Prefer tests that call real code paths:
▪  Core node/leader types (e.g. startOS, oCloudLeader, oLeaderNode-based classes)
▪  Public handlers/entrypoints (HTTP/Lambda, CLIs)
▪  Storage, vector-store, and config utilities
◦  Avoid tests that only assert on hand-constructed literals:
▪  Bad: const state = { indexed: true }; expect(state.indexed).to.be.true;
▪  Good: call the function that produces or uses that state.
•  Use real modules, minimal stubbing
◦  Prefer using the real implementation under test.
◦  When you need to intercept behavior, override instance methods locally in the test (e.g. stub router.route on a constructed node) instead of building deep mock graphs.
•  Be environment-light
◦  Don’t require a real libp2p network, relay, or Supabase instance for unit tests.
◦  Where external dependencies are needed, use in-repo helpers/mocks that stay close to the real APIs.

## Helper Harness (Pattern)

For packages that need richer scenarios (networked leaders, storage, Lambda/HTTP handlers), follow this pattern:

•  A small TestEnvironment helper:
◦  Manages node lifecycle and cleanup (createLeader, createTool, cleanup).
◦  Provides access to shared mocks:
▪  getMockRelay() / getMockRelayAddress()
▪  getMockSupabase() (in-memory client)
◦  Exposes waitFor / waitForState helpers where polling is unavoidable.
•  A MockRelay:
◦  getAddress() → address for relay configuration.
◦  reserveCircuit(peerId), releaseCircuit(peerId), hasReservation(peerId).
◦  getMetrics(), setReservationDelay(ms), setReservationFailure(bool).
◦  Used to test logic that depends on the idea of circuit reservations, without a real relay.
•  A MockSupabase:
◦  Lightweight in-memory implementation of:
▪  storage.from(bucket).upload/download/remove/list
▪  from(table) with select/insert/update/delete/upsert
▪  auth operations (getUser, signInWithPassword, etc.)
◦  Used to test storage and vector-store tools without real Supabase.
•  Event/context builders (for HTTP/Lambda-style packages):
◦  e.g. LambdaEventBuilder and createMockContext to construct realistic request events and minimal contexts.

## Example Patterns

1. Validation-only unit test
```typescript
import { expect } from 'chai';
import { startOS } from '../src/os.js';

describe('startOS (validation)', () => {
  it('throws when relayTransport is missing', async () => {
    let error: any;

    try {
      // @ts-expect-error – intentionally incomplete
      await startOS({ osId: 'os-1' });
    } catch (e) {
      error = e;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.equal('RELAY_TRANSPORT is not set');
  });
});
```
2. Routing behavior via local method override
```typescript
import { expect } from 'chai';
import { oCloudLeader } from '../src/o-cloud.leader.js';
import { oNodeAddress } from '@olane/o-node';
import { oAddress } from '@olane/o-core';

describe('oCloudLeader routing', () => {
  const relayAddress = new oNodeAddress('o://relay');

  it('injects _token into routed requests in _tool_route', async () => {
    const leader = new oCloudLeader({
      leader: null,
      parent: null,
      relayAddress,
      _token: 'route-token',
      description: 'route test',
    } as any) as any;

    let routedRequest: any;
    leader.router.route = async (req: any) => {
      routedRequest = req;
      return { ok: true };
    };

    const request: any = {
      address: oAddress.leader(),
      targetAddress: oAddress.leader(),
      method: 'test',
      params: {},
    };

    const result = await leader._tool_route(request);

    expect(routedRequest).to.exist;
    expect(routedRequest.params).to.have.property('_token', 'route-token');
    expect(result).to.deep.equal({ ok: true });
  });
});
```

Anti‑Patterns to Avoid

•  Tests that never call production code and only operate on locally declared data.
•  Tests that assume fields/methods that don’t exist on real types (e.g. leader.clientCount if not part of the public API).
•  Reintroducing Jest-style APIs or global mocking infrastructure in a Mocha/aegir project.
•  Building large, divergent mock ecosystems that behave differently from real implementations (“parallel universes”).

Keep tests focused, fast, and coupled to the public behavior of the actual implementation, using the shared helpers only as thin scaffolding to reach realistic states.