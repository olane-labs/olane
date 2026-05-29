# Olane OS

**An addressable, peer-to-peer runtime for tools, AI agents, and humans — one address space, one call.**

[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://www.npmjs.com/package/@olane/o-core)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Documentation](https://img.shields.io/badge/docs-olane.com-blue)](https://olane.com/docs)
[![Status](https://img.shields.io/badge/status-0.9.0%20·%20pre--1.0-orange.svg)](#project-status)

---

## TL;DR

Olane gives every participant in a system — a tool, an AI model, or a person — an `o://` address, and lets any of them call any other through a single primitive:

```typescript
await node.use(address, { method, params });
```

The caller never needs to know whether the responder is a deterministic tool returning data, an LLM running inference, or a human approving a request. **Same protocol. Same call shape. Same address space.** It runs over [libp2p](https://libp2p.io/), so nodes live in browsers, servers, and edge devices and reach each other directly.

What that unlocks:

- 🧩 **One interface for everything** — tools, AI, and humans are all reached with `node.use()`; no separate SDK per participant type
- 🔎 **Self-describing capabilities** — nodes publish typed method metadata (`oMethod`), so an AI agent can discover and call a node it has never seen before
- 🗣️ **Two ways to call a node** — by an exact method name, or by a natural-language *intent* that the node resolves itself via an LLM loop ([Lanes](#lanes-intent-driven-execution))
- 🤖 **Multi-provider intelligence built in** — one node (`o://intelligence`) fronts Anthropic, OpenAI, Gemini, Ollama, Perplexity, and Grok
- 🌐 **Runs as a peer mesh** — libp2p over WebSocket, TCP, and WebTransport, encrypted by default (Noise)

> **Status:** Olane is **0.9.0 / pre-1.0** and under active development. The core (`o://` addressing, `node.use()`, Lanes, the node runtime) is solid and code-backed; some surfaces noted below are on the [roadmap](#roadmap--not-yet-shipped).

---

## Table of Contents

- [The Unified Interface](#the-unified-interface) — one call pattern for tools, AI, and humans
- [First-Class Peers](#first-class-peers) — how tools, AI, and humans join the same network
- [Lanes: Intent-Driven Execution](#lanes-intent-driven-execution) — the agentic loop, recorded and replayable
- [Model Access](#model-access) — six LLM providers behind one address
- [The Transport](#the-transport) — libp2p across browser, server, and edge
- [Get Started](#get-started) — a working OS in four steps
- [What Is Olane OS?](#what-is-olane-os) — the three-layer model
- [Packages](#packages) — the full monorepo, grouped by layer
- [Framework Comparison](#framework-comparison) — vs LangGraph, n8n, CrewAI
- [Roadmap](#roadmap--not-yet-shipped) — what isn't built yet
- [Community & Contributing](#community--support)

---

## The Unified Interface

Most agent stacks invent a separate mechanism per surface: an SDK for AI agents, a registry for tools, webhooks for humans, a bus for inter-agent messaging. Olane collapses these into one address space and one call shape.

**The same call works everywhere — the difference is only whether you call by *method name* or by *intent*:**

```typescript
import { oAddress } from '@olane/o-core';

// 1. A deterministic tool — you know the method, so call it by name
await node.use(new oAddress('o://finance/analyst'), {
  method: 'analyze',
  params: { quarter: 'Q4' },
});

// 2. A human — reached at o://human, resolved via natural-language intent
await node.use(new oAddress('o://human'), {
  method: 'intent',
  params: { intent: 'Approve release v0.9' },
});

// 3. An AI agent — reached at o://ai, same intent-based call shape
await node.use(new oAddress('o://ai'), {
  method: 'intent',
  params: { intent: 'Summarize the Q4 report' },
});
```

One call pattern. One address scheme. One discovery mechanism. The execution model on the other end — human judgment, AI inference, deterministic code — is opaque to the caller, and that's the point.

**Why it matters:**

| Without a unified interface | With Olane |
|---|---|
| Separate SDK per participant type | One client (`node.use()`) for everything |
| Humans behind webhooks, agents behind APIs | Both are first-class addressable nodes |
| Tools must know who's calling them | Tools serve any caller identically |
| Routing requires custom plumbing | Addressing and routing are uniform |
| Integrating a new tool means reading its code | Methods are self-describing via `oMethod` metadata |

---

## First-Class Peers

Every participant joins the same network the same way: each gets an `o://` address and is reached through `node.use()`.

| Participant | How it joins | Default address |
|---|---|---|
| **Tool / app** | `oNodeTool` or `oLaneTool` (your code) | `o://<your-namespace>` |
| **Human** | `oHumanLoginTool` (CLI / web) | `o://human` |
| **AI agent** | `oAILoginTool` (any model) | `o://ai` |

A human and an AI join with identical wiring — you supply `respond` / `answer` / `receiveStream` handlers, and the node exposes them as the callable `intent`, `question`, and `receive_stream` methods:

<table>
<tr>
<td width="50%">

**Human joins the network**

```typescript
import { oHumanLoginTool } from '@olane/o-login';

const human = new oHumanLoginTool({
  // Approvals, decisions, judgment calls
  respond: async (intent: string) => {
    return 'Approved with conditions';
  },
  answer: async (question: string) => {
    return 'Answer from a human';
  },
  receiveStream: async (data: any) => {
    // Process streamed data
  },
});

await human.start();
// Reachable at o://human via
// node.use(o://human, { method: 'intent', ... })
```

</td>
<td width="50%">

**AI agent joins the network**

```typescript
import { oAILoginTool } from '@olane/o-login';

const ai = new oAILoginTool({
  // Autonomous processing
  respond: async (intent: string) => {
    return await runModel(intent);
  },
  answer: async (question: string) => {
    return await runModel(question);
  },
  receiveStream: async (data: any) => {
    await processStream(data);
  },
});

await ai.start();
// Reachable at o://ai via
// node.use(o://ai, { method: 'intent', ... })
```

</td>
</tr>
</table>

**Same network. Same interface. Different execution models.** Humans bring judgment and oversight; AI agents bring automation and scale; tools bring deterministic capability. Because all three are reached identically, routing a step to a person or to a model is a call to the same address shape — the caller doesn't change.

[**Login package →**](./packages/o-login/) · [**Agent-agnostic design →**](./docs/agents/agent-agnostic-design.mdx)

---

## Lanes: Intent-Driven Execution

A plain tool node is **callable by name** — you send `{ method, params }`. An `oLaneTool` is additionally **callable by intent**: you send a natural-language goal and the node runs an LLM loop to accomplish it. We call a single run a **Lane**.

A Lane is a real, bounded reason-act loop (`@olane/o-lane`):

1. **Evaluate** — the LLM (`o://intelligence`) is given the intent plus the accumulated cycle history and decides the next step.
2. **Execute** — for a chosen target address, the loop *handshakes* the tool to discover its methods, asks the LLM to pick a concrete `{ method, params }`, optionally routes it through an [approval gate](./packages/o-approval/), and invokes it via `node.use()`.
3. **Repeat** — the result feeds back into the next evaluate cycle, bounded by `MAX_CYCLES` (default 20), until the LLM emits a **stop** with a final answer.

Every cycle is recorded. When the run finishes, the full sequence (intent + each capability + result) is serialized, **content-addressed as a CID, and persisted** — and it can be **deterministically replayed** by CID, re-running only the state-changing tool calls while skipping the LLM, handshake, and approval steps.

```typescript
// You express the intent; the Lane discovers the path.
const result = await complianceNode.use(new oAddress('o://compliance'), {
  method: 'intent',
  params: { intent: 'Generate a Q4 compliance report and flag anomalies' },
});
```

An *illustrative* trace of what a Lane can produce — note that humans and AI are reached through the same interface, so a Lane can route work to either:

```
Cycle 1:  Evaluate → fetch transactions          (calls o://finance via node.use)
Cycle 2:  Evaluate → analyze, 3 anomalies flagged
Cycle 3:  Execute  → request human review         (calls o://human)
Cycle 4:  Human    → approves 2, asks for detail on 1
Cycle 5:  Evaluate → deeper analysis on the 1
Cycle 6:  Execute  → route back to o://human for sign-off
Cycle 7:  Stop     → format and return the report
```

This coordination wasn't pre-wired as a DAG — it was decided cycle-by-cycle by the model over a uniform interface, and the path is saved as a replayable Lane.

> **Honest scope:** the loop is a single-LLM, prompt-engineered ReAct loop (JSON parsed from the model response), not provider-native function-calling. The default dispatcher wires the **Evaluate** and **Execute** capabilities; **Search**, **Multiple-step**, and **Configure** capabilities exist in the codebase but are not yet wired into the standard loop. Automatic capability-based *failover* between a human and an AI is **not** implemented — interchangeability today means the call shape is identical, not that the system reroutes on its own.

[**o-lane →**](./packages/o-lane/) · [**Emergent workflows →**](./docs/concepts/emergent-workflows.mdx)

---

## Model Access

LLM access is itself just an addressable node. `o://intelligence` (`@olane/o-intelligence`) is a router that fronts six fully-implemented provider backends, each calling the vendor's HTTP API directly (no vendor SDK lock-in):

| Provider | Address | Notes |
|---|---|---|
| **Anthropic** | `o://anthropic` | Messages API, streaming; default `claude-sonnet-4-6` |
| **OpenAI** | `o://openai` | Chat, embeddings, image generation |
| **Gemini** | `o://gemini` | `generateContent` + streaming |
| **Ollama** | `o://ollama` | Local models (`localhost:11434`), pull/delete |
| **Perplexity** | `o://perplexity` | Includes search; default `sonar` |
| **Grok (xAI)** | `o://grok` | Chat completions |

Provider and API key are resolved in order: per-request params → environment variables → encrypted secure storage (`o://secure`) → an interactive prompt to `o://human`. Responses can stream. This is the layer the Lane loop calls to make every model decision.

```typescript
await node.use(new oAddress('o://intelligence'), {
  method: 'prompt',
  params: { prompt: 'Summarize this document', provider: 'anthropic' },
});
```

[**o-intelligence →**](./packages/o-intelligence/)

---

## The Transport

Olane nodes use [libp2p](https://libp2p.io/). Any addressable peer can reach any other through the same `o://` namespace, with no central server in the call path.

**Configured today** (`@olane/o-config`):

- 🌐 **WebSocket** — browser-compatible
- 🔌 **TCP** — server-to-server
- 🚀 **WebTransport** — HTTP/3 (QUIC-based), browser-compatible
- 🔒 **Noise** encryption on every connection (default), with Yamux stream multiplexing
- 🛰️ **Kademlia DHT** for peer routing
- 🔁 **circuit-relay-v2** to reach peers behind NAT/firewalls via a relay

| Traditional limitation | Olane today |
|---|---|
| Browsers can't be peers | **WebSocket + WebTransport let browsers participate** |
| Connections are insecure by default | **Encrypted by default (Noise)** |
| Peers behind NAT are unreachable | **Relayed connections via circuit-relay-v2** |
| Peer routing needs central coordination | **Kademlia DHT for routing** |

**Capability discovery** is handled by a leader-hosted registry: nodes register their address and protocols with `o://leader`, and address resolution queries that registry (libp2p's DHT handles the lower-level peer routing). Direct **WebRTC** and **raw QUIC** transports, **Bluetooth**, and registry-free DHT capability discovery are on the [roadmap](#roadmap--not-yet-shipped).

[**o-node →**](./packages/o-node/) · [**Browser nodes →**](./docs/guides/browser-nodes.mdx)

---

## Get Started

A working OS instance in four steps.

**1. Install**

```bash
pnpm add @olane/os @olane/o-core @olane/o-login
```

**2. Start an OS instance**

An instance needs a leader (the discovery / routing root) and at least one node — both are addressable.

```typescript
import { OlaneOS } from '@olane/os';
import { NodeType, oAddress } from '@olane/o-core';

const os = new OlaneOS({
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader'),
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://node'),
      leader: null,
      parent: null,
    },
  ],
});

await os.start();
```

**3. Call any address — same shape for everything**

```typescript
const node = os.entryNode();

const response = await node.use(new oAddress('o://node'), {
  method: 'hello_world',
  params: {},
});

if (response.result.success) {
  console.log(response.result.data);
} else {
  console.error(response.result.error);
}
```

**4. Bring a human or an AI into the same network**

Each login tool joins as a child of the OS's root leader, so the rest of the network can reach it. Once attached, the same `node.use(...)` call reaches a person or a model.

```typescript
import { oHumanLoginTool, oAILoginTool } from '@olane/o-login';

const leader = os.rootLeader!;

// A human joins at o://human
const human = new oHumanLoginTool({
  leader: leader.address,
  parent: leader.address,
  respond: async (intent) => `Approved: ${intent}`,
  answer: async (q) => 'Human answer',
  receiveStream: async (data) => { /* ... */ },
});
leader.addChildNode(human);

// An AI agent joins at o://ai
const ai = new oAILoginTool({
  leader: leader.address,
  parent: leader.address,
  respond: async (intent) => await runModel(intent),
  answer: async (q) => await runModel(q),
  receiveStream: async (data) => { /* ... */ },
});
leader.addChildNode(ai);

// Reach either through the same call shape and the same `intent` method
await node.use(new oAddress('o://human'), {
  method: 'intent',
  params: { intent: 'Approve release v0.9' },
});

await node.use(new oAddress('o://ai'), {
  method: 'intent',
  params: { intent: 'Summarize the Q4 report' },
});
```

> Note: `respond` / `answer` / `receiveStream` are the *handlers you supply*; the *callable methods* over the network are `intent`, `question`, and `receive_stream`.

[**📚 Full setup guide →**](./packages/o-os/)

---

## What Is Olane OS?

Olane models a system in three layers — and crucially, the OS's own services (leader, storage, intelligence) are themselves ordinary addressable nodes. There is no privileged "system" API.

```
Agents (humans / AI)  ── send intents & method calls
        ↓
Tool nodes (o:// + node.use)  ── what you build
        ↓
Transport (libp2p — WebSocket, TCP, WebTransport)
```

| Layer | What it is | Examples |
|---|---|---|
| **Agents** | Whoever sends a call — *not* a class you build | Humans (CLI/web), AI models |
| **Tool nodes** | The addressable capabilities you build | `o://finance`, `o://crm`, `o://intelligence` |
| **Transport** | The P2P substrate | libp2p, Noise encryption, DHT routing |

Tool nodes form a clean inheritance ladder, each rung adding one concern:

```
oCore         →  identity, lifecycle, the use() primitive, o:// addressing
oToolBase     →  method discovery (any _tool_<name> is auto-exposed) + validation
oNodeTool     →  libp2p transport, hierarchy, registration   (callable by name)
oLaneTool     →  the intent loop + handshake + replay          (callable by intent)
McpBridgeTool →  exposes an external MCP server's tools as methods
```

The practical distinction is **callable by name vs callable by description**: a plain `oNodeTool` is invoked with a known `{ method, params }`; an `oLaneTool` additionally accepts a natural-language `intent` and runs the LLM loop to pick methods itself.

[**Three-layer model →**](./docs/understanding/three-layer-model.mdx) · [**Tools, nodes & applications →**](./docs/concepts/tools-nodes-applications.mdx)

---

## Packages

This monorepo publishes 24 `@olane/*` packages. The ones most people touch first are **`@olane/os`**, **`@olane/o-core`**, **`@olane/o-node`**, **`@olane/o-lane`**, and **`@olane/o-intelligence`**.

### Foundation

| Package | What it does |
|---|---|
| [`@olane/o-core`](./packages/o-core/) | Abstract base node: lifecycle, `o://` addressing, the `use()` primitive, response builder, auth/trace context. |
| [`@olane/o-protocol`](./packages/o-protocol/) | JSON-RPC 2.0 wire types and the `oMethod` schema (typed params, descriptions, examples) that powers method discovery. |
| [`@olane/o-config`](./packages/o-config/) | Default libp2p config (transports, Noise, Yamux, DHT) and a `createNode()` factory. |
| [`@olane/o-context`](./packages/o-context/) | Async context primitive — `AsyncLocalStorage` on Node, variable-swap in the browser. |

### Runtime

| Package | What it does |
|---|---|
| [`@olane/o-node`](./packages/o-node/) | The concrete libp2p implementation of `o-core`: server/client/WebSocket nodes, hierarchy, registration, routing. |
| [`@olane/o-leader`](./packages/o-leader/) | The root node: in-memory registry (`o://leader/registry`) and `join_network` handling. |
| [`@olane/o-tool`](./packages/o-tool/) | Base tool class: `_tool_<name>` method discovery, parameter validation, built-in protocol methods. |
| [`@olane/os`](./packages/o-os/) | The top-level runtime that boots and supervises a leader + worker topology and OS services (fs, vector store, agent registry, storage), with config persistence and lane replay. |
| [`@olane/o-storage`](./packages/o-storage/) | Storage node with disk, in-memory, encrypted, and AI-summary providers over `o://`. |
| [`@olane/o-client-limited`](./packages/o-client-limited/) | Outbound-only / edge client node preset (no inbound listeners). |

### Agentic

| Package | What it does |
|---|---|
| [`@olane/o-lane`](./packages/o-lane/) | The intent loop: turns a natural-language intent into an evaluate→execute LLM cycle; records and replays runs by CID. |
| [`@olane/o-agent`](./packages/o-agent/) | Per-session agent nodes and a registry with A2A-shaped capability cards and message inboxes. |
| [`@olane/o-approval`](./packages/o-approval/) | Human-in-the-loop approval gate that pauses risky tool actions for confirmation (allow / review / auto modes). |
| [`@olane/o-login`](./packages/o-login/) | Entry-point nodes that let a human (`o://human`) or AI (`o://ai`) join and route intents/questions to your handlers. |

### Intelligence

| Package | What it does |
|---|---|
| [`@olane/o-intelligence`](./packages/o-intelligence/) | Multi-provider LLM router (`o://intelligence`): Anthropic, OpenAI, Gemini, Ollama, Perplexity, Grok, with key management and streaming. |

### Integration

| Package | What it does |
|---|---|
| [`@olane/o-mcp`](./packages/o-mcp/) | Bridges external MCP servers (HTTP or stdio) into the `o://` namespace as callable tool methods. |
| [`@olane/o-server`](./packages/o-server/) | Express HTTP/REST + JWT edge that exposes a node's `use()` to standard web clients. |
| [`@olane/o-gateway-registry`](./packages/o-gateway-registry/) | Resolves gateway namespaces to libp2p addresses via a `did:web` + Ed25519-signed public registry. |
| [`@olane/o-gateway-olane`](./packages/o-gateway-olane/) | Reference resolver routing `olane`-namespace requests to the public leader. |
| [`@olane/o-gateway-interface`](./packages/o-gateway-interface/) | The `oGateway` type contract gateways implement. |

### Tooling & dev

| Package | What it does |
|---|---|
| [`@olane/o-monitor`](./packages/o-monitor/) | Network observability node: health, heartbeats, libp2p metrics, Prometheus + REST. |
| [`@olane/o-test`](./packages/o-test/) | Test assertions and mock factories that understand the `oResponse` envelope and node lifecycle. |
| [`@olane/o-tools-common`](./packages/o-tools-common/) | `initCommonTools()` — attaches storage, encryption, vector search, and approval to a node in one call. |
| [`@olane/o-tool-registry`](./packages/o-tool-registry/) | *(Deprecated)* Bundle of prebuilt tools (OAuth, HF embeddings, vector store, NER); superseded by per-tool packages. |

---

## Framework Comparison

| | LangGraph | n8n | CrewAI | **Olane** |
|---|---|---|---|---|
| **Primary abstraction** | StateGraph | Visual DAG | Crew of agents | **Address space + `node.use()`** |
| **Humans in the loop** | Bolt-on (interrupts) | Webhooks/forms | Limited | **First-class addressable peers** |
| **AI agents** | First-class | Plugin | First-class | **First-class addressable peers** |
| **Tools** | Per-graph | Per-workflow | Per-crew | **Network-wide, addressable, self-describing** |
| **Calling model** | Graph edges | Workflow links | Crew tasks | **By method name *or* by intent (Lanes)** |
| **Discovery** | Manual wiring | Manual config | Manual config | **Leader registry + libp2p routing** |
| **Where it runs** | Server | Server | Server | **Browser, server, edge (libp2p)** |
| **Inter-participant comms** | Custom per edge | Workflow-bound | Crew-bound | **One call pattern (`node.use()`)** |

[**Why Olane →**](./docs/why-olane.mdx) · [**Three-layer model →**](./docs/understanding/three-layer-model.mdx)

---

## Roadmap / Not Yet Shipped

To keep this README honest, here is what the codebase **does not** do yet (these are goals, not current behavior):

- **Transports:** direct **WebRTC** (browser-to-browser) and **raw QUIC** are not wired; **Bluetooth** is aspirational. Shipped transports are WebSocket, TCP, and WebTransport.
- **NAT traversal:** reachability behind NAT uses **circuit-relay-v2** (relayed connections), not direct hole-punching (DCUtR/AutoNAT).
- **Discovery:** capability/address lookup runs through a **leader-hosted, in-memory registry**, not a fully decentralized DHT lookup (the DHT handles peer routing only). Registry persistence/TTL is in progress.
- **Lane capabilities:** only **Evaluate** and **Execute** are wired into the default loop. **Search**, **Multiple-step**, and **Configure** exist in the tree but aren't yet part of the standard dispatch.
- **Human ↔ AI failover:** humans and AI are *interchangeable to call* (same address shape), but the system does **not** automatically reroute a step from an offline human to a similar-capability AI peer.
- **Maturity:** packages are at **0.9.0** (pre-1.0). Expect breaking changes.

---

## Documentation

| Category | Links |
|---|---|
| 🚀 **Getting Started** | [Introduction](./docs/introduction.mdx) · [Installation](./docs/getting-started/installation.mdx) · [Quickstart](./docs/getting-started/quickstart.mdx) · [Your First Network](./docs/getting-started/your-first-network.mdx) |
| 🎯 **Key Ideas** | [Why Olane](./docs/why-olane.mdx) · [Three-Layer Model](./docs/understanding/three-layer-model.mdx) · [Agent-Agnostic Design](./docs/agents/agent-agnostic-design.mdx) |
| 🧩 **Concepts** | [Tools / Nodes / Applications](./docs/concepts/tools-nodes-applications.mdx) · [Everything is a Node](./docs/concepts/nodes/everything-is-a-node.mdx) · [Addressing](./docs/concepts/addressing/overview.mdx) · [Communication & Routing](./docs/concepts/communication/routing.mdx) |
| 🤖 **Agents** | [Overview](./docs/agents/overview.mdx) · [Human-in-the-Loop](./docs/agents/human-in-the-loop.mdx) · [Human Interfaces](./docs/agents/human-interfaces.mdx) |
| 🛠️ **Tools** | [MCP Integration](./docs/concepts/tools/mcp-integration.mdx) · [Emergent Workflows](./docs/concepts/emergent-workflows.mdx) |

[**📚 Browse all documentation →**](https://olane.com/docs)

---

## Project Status

Olane is **pre-1.0 (0.9.0)** and evolving quickly. The foundational model — `o://` addressing, the `node.use()` primitive, the node runtime, Lanes, and multi-provider intelligence — is implemented and exercised by the OS itself. APIs may change before 1.0, and the [roadmap](#roadmap--not-yet-shipped) items above are not yet available. Feedback and contributions during this phase are especially welcome.

---

## Community & Support

- **📚 Documentation**: [olane.com/docs](https://olane.com/docs)
- **💬 GitHub Discussions**: [github.com/olane-labs/olane/discussions](https://github.com/olane-labs/olane/discussions)
- **🐛 GitHub Issues**: [github.com/olane-labs/olane/issues](https://github.com/olane-labs/olane/issues)
- **💬 Discord**: [discord.gg/olane](https://discord.gg/olane)

---

## Contributing

We welcome contributions. See the [Contributing Guide](./CONTRIBUTING.md), [Code of Conduct](./CODE_OF_CONDUCT.md), and [Governance](./GOVERNANCE.md).

**Good places to start:**

- Tool nodes and integrations
- Documentation and real-world examples
- Roadmap items (transports, Lane capabilities, registry persistence)
- Bug fixes and performance

This is a `pnpm` + Lerna monorepo. Use `pnpm` (not `npm`), build with `pnpm build`, and test with `pnpm test`.

---

## License

Dual-licensed under your choice of:

- **[MIT License](LICENSE-MIT)** — simple, permissive
- **[Apache License 2.0](LICENSE-APACHE)** — permissive with patent protection

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion shall be dual-licensed as above, without additional terms.

---

**Ready to build?**

- 🚀 [Get Started](#get-started)
- 📚 [Full Documentation](https://olane.com/docs)
- 💬 [Join Discord](https://discord.gg/olane)

Copyright © 2025 Olane Inc.
