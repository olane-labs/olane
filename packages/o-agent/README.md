# @olane/o-agent

**Address**: `o://agents` (registry) and `o://<user>/<kind>/<session-id>` (per session)
**Type**: Application Layer
**Domain**: Multi-Agent / Coding Assistants

## Overview

`@olane/o-agent` is the per-session agent broker for the local Olane OS. It
gives every running coding-agent session (Claude Code, Codex, future kinds) a
stable, addressable identity on the local olane network so agents can
discover each other and exchange messages bidirectionally.

The package ships:

- **`AgentNode`** — one canonical address per session (e.g.
  `o://brendon/claude-code/1234`). Sub-resources (`/inbox`, `/inbox/<id>`,
  `/send`, `/card`, `/status`) are dispatched by an `oAgentResolver` that
  mirrors the `o-storage` pattern verbatim.
- **`AgentRegistryNode`** — sibling registry mounted on the OS leader at
  `o://agents`. Tracks live sessions via heartbeat + PID liveness; sweeps
  stale entries on a 60-second timer (TTL = 90 s).
- **A2A-shaped envelopes** — `AgentCard`, `InboxMessage`, and `MessagePart`
  mirror the public Google A2A schemas so a future `o://a2a-bridge` HTTP
  node can serve `/.well-known/agent.json` and bridge tasks without
  re-shaping the wire format.

## Status

**Phase 1, in progress.** This package currently exports only the type
contracts (`AgentCard`, `InboxMessage`, `RegistryEntry`, `AgentKind`).
`AgentNode`, `AgentRegistryNode`, and `oAgentResolver` land in subsequent PRs
per the [ADR](../../../o-network-cli/docs/adr/0001-olane-agent-broker.md).

## Architecture (target)

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
   o://brendon/         o://brendon/         o://brendon/
   claude-code/1234     codex/abcd           claude-code/9999
   AgentNode            AgentNode            AgentNode
```

Each `AgentNode` exposes its inbox, outbox, and card via sub-paths under its
canonical address. Other agents (or external CLIs / MCP tools) call those
addresses through `node.use()` like any other olane tool.

## Installation

```bash
pnpm install @olane/o-agent
```

## License

(MIT OR Apache-2.0) © oLane Inc.
