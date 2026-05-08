# @olane/o-agent

**Addresses**: `o://agents` (registry) — agent sessions get single-segment slugs (see "Address scheme" below)
**Type**: Application Layer
**Domain**: Multi-Agent / Coding Assistants

## Overview

`@olane/o-agent` is the per-session agent broker for the local Olane OS. It
gives every running coding-agent session (Claude Code, Codex, future kinds) a
stable, addressable identity on the local olane network so agents can
discover each other and exchange messages bidirectionally.

The package ships:

- **`AgentNode`** — a tool node that hosts one running session's inbox,
  outbox, and capability card. Designed to run either in-process inside the
  OS host OR as a per-session daemon that joins the network from a
  separate process.
- **`AgentRegistryNode`** — sibling registry mounted on the OS leader at
  `o://agents`. Tracks live sessions via heartbeat + PID liveness; sweeps
  stale entries on a 60-second timer (TTL = 90 s).
- **`oAgentResolver`** — `oAddressResolver` subclass mirroring the
  `o-storage` pattern; dispatches sub-paths under an AgentNode's
  canonical address (`/inbox`, `/inbox/<id>`, `/send`, `/card`, `/status`,
  …) to the matching tool method. **Fires inside the AgentNode's host
  process only** — see "Cross-process callers" below.
- **A2A-shaped envelopes** — `AgentCard`, `InboxMessage`, and `MessagePart`
  mirror the public Google A2A schemas so a future `o://a2a-bridge` HTTP
  node can serve `/.well-known/agent.json` and bridge tasks without
  re-shaping the wire format.

## Status

**Phase 1, shipped.** All exports are stable: types, `oAgentResolver`,
`AgentRegistryNode`, `AgentNode`. Wired into `@olane/os` startup so
`o://agents` is a leader child by default.

## Address scheme

**olane convention:** node tools must declare exactly **one path segment**
in their constructor address (e.g. `o://node`, `o://services`, `o://relay`,
`o://storage`). Hierarchical addressing happens via either:

- **Child-node registration** — a parent node registers per-instance
  children via `_tool_child_register`. The leader/parent prefixes its
  own path post-registration, yielding addresses like
  `o://leader/agents/<id>`.
- **In-node sub-path resolvers** — a node's `oAddressResolver` (e.g.
  `oAgentResolver`, `oStorageResolver`) dispatches sub-paths under its
  canonical address to local methods. Sub-paths are resolved
  in-process; they don't manifest as additional nodes in the OS
  hierarchy.

Multi-segment constructor addresses are NOT a routing primitive and
will not behave as intended even with `_allowNestedAddress: true`.
That escape hatch exists for the limited cases where the OS itself
constructs already-hierarchical addresses internally — not for
arbitrary cross-process workers.

Per-session AgentNodes therefore use a **single-segment slug** that
encodes the user, agent kind, and session id:

```
o://agent-<user>-<kind>-<session-id>
```

After the leader registers the daemon under its hierarchy, the effective
address becomes:

```
o://leader/agent-<user>-<kind>-<session-id>
```

Use this prefixed form when calling `node.use(address, …)` from other
agents or CLIs. The structured fields stay on the card for filtering and
display:

```ts
card.olane = {
  kind: 'claude-code',
  sessionId: '1234',
  user: 'brendon',
  registeredAt: '2026-05-08T...',
};
```

## Architecture

```
                        ┌───────────────────┐
                        │   OlaneOS leader  │
                        │     o://leader    │
                        └─────────┬─────────┘
                                  │  (children)
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
         ┌───────────┐    ┌──────────────┐   ┌──────────────┐
         │ o://relay │    │  o://agents  │   │ ... (others) │
         │ RelayNode │    │ Registry     │   └──────────────┘
         └───────────┘    └──────┬───────┘
                                 │  registers / heartbeats
                ┌────────────────┼─────────────────┐
                ▼                ▼                 ▼
   o://leader/             o://leader/        o://leader/
   agent-brendon-          agent-brendon-     agent-brendon-
   claude-code-1234        codex-abcd         claude-code-9999
   AgentNode               AgentNode          AgentNode
```

## Installation

```bash
pnpm install @olane/o-agent
```

## Cross-process daemon usage

The most common deployment pattern: each coding-agent session has its own
detached background process that hosts an `AgentNode`. The daemon joins
the running OS as a libp2p worker.

```ts
import { AgentNode, AgentCard, AGENT_KIND_METADATA, AgentKind } from '@olane/o-agent';
import { oNodeAddress, oNodeTransport } from '@olane/o-node';
import * as fs from 'fs/promises';

// 1. Read the running OS singleton's discovery file.
const osInfo = JSON.parse(
  await fs.readFile(`${process.env.HOME}/.olane/os.json`, 'utf8'),
);

// 2. Build a leader address with the OS's libp2p multiaddrs so we can
//    dial it during start().
const leaderAddress = new oNodeAddress(
  osInfo.leaderAddress,                                  // 'o://leader'
  osInfo.transports.map(m => new oNodeTransport(m)),
);

// 3. Construct the AgentNode at a SINGLE-SEGMENT slug.
const card: AgentCard = {
  name: 'Claude Code session 1234',
  url: 'o://agent-brendon-claude-code-1234',
  version: '1.0.0',
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: AGENT_KIND_METADATA[AgentKind.CLAUDE_CODE].defaultSkills.map(id => ({ id })),
  olane: {
    kind: AgentKind.CLAUDE_CODE,
    sessionId: '1234',
    user: 'brendon',
    registeredAt: new Date().toISOString(),
  },
};

const agent = new AgentNode({
  address: new oNodeAddress('o://agent-brendon-claude-code-1234'),
  leader: leaderAddress,
  parent: leaderAddress,
  // REQUIRED for cross-process daemons — libp2p must bind a port the
  // leader can dial back through during routing. In-process AgentNodes
  // (children of an in-process leader) do NOT need this.
  network: {
    listeners: ['/ip4/0.0.0.0/tcp/0'],
  },
  card,
});

await agent.start();
// AgentNode auto-registers with `o://agents` and starts a 30s heartbeat.
// Stays resident until SIGTERM; agent.stop() deregisters cleanly.
```

The daemon's effective address after registration is
`o://leader/agent-brendon-claude-code-1234`. Other agents reach it via:

```ts
await someClient.use('o://leader/agent-brendon-claude-code-1234', {
  method: 'receive',
  params: { message: { id, from, to, sentAt, parts } },
});
```

For a working end-to-end implementation see
`@copass/cli` `src/commands/olane.ts` — the `register` / `_host` /
`deregister` pattern that wraps this into Claude Code hook plumbing.

## Cross-process callers — sub-paths vs. method params

`oAgentResolver` translates sub-paths under an AgentNode's canonical
address (`o://addr/inbox`, `o://addr/inbox/<id>`, `o://addr/send`, …)
into method calls. **The resolver only fires inside the AgentNode's own
process** because each `oNode` registers its resolvers on its own router
during `initialize()` — the leader's resolver chain has no knowledge of
sub-paths it doesn't own.

This means:

| Caller location | How to call AgentNode methods |
|---|---|
| **Same process** (e.g. another `oLaneTool` running alongside) | Either `use(canonical, { method: 'receive', params: ... })` or the sub-path form `use(canonical + '/receive', ...)` works — the resolver translates the second form to the first. |
| **Different process** (CLI, separate daemon, MCP shellout) | Use `use(canonical, { method: 'receive', params: ... })`. Sub-path form **does not work** — the leader will return `node not found` because it tries to route to a literal `<canonical>/receive` node. |

In-process sub-path resolution is still useful for ergonomic in-tree
callers; cross-process consumers should use the explicit method-as-param
form.

## License

(MIT OR Apache-2.0) © oLane Inc.
