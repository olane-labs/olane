# Olane OS

**The network and transport layer for humans, AI agents, and tools — one address space, one interface.**

[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://www.npmjs.com/package/@olane/o-core)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Documentation](https://img.shields.io/badge/docs-olane.com-blue)](https://olane.com/docs)

---

## TL;DR

Olane is the transport layer that lets **humans, AI agents, and tools talk to each other through a single unified interface**. Every participant — a person, a Claude instance, a database, a browser tab, a Raspberry Pi — becomes an addressable node (`o://...`) reached the same way:

```typescript
await node.use(address, { method, params });
```

That uniformity is the unlock. The caller does not need to know whether the responder is a human approving a request, an AI agent running inference, or a deterministic tool returning data. **Same protocol. Same call pattern. Same address space.**

What this enables:

- 🧑‍🤝‍🤖 **Humans and agents on equal footing** — both are nodes, both can call and be called
- 🛠️ **Tools that don't care who's calling** — a finance node serves a human, an AI agent, or another tool identically
- 🔄 **Workflows that emerge instead of being pre-wired** — uniform routing means agents discover paths through execution
- 🌐 **Runs anywhere** — over libp2p (WebSocket, TCP, WebRTC, QUIC), so nodes live in browsers, servers, mobile, IoT
- 🧠 **One client, one mental model** — no separate SDKs per participant type

[**Why a unified interface changes everything →**](/docs/concepts/unified-interface)

---

## Table of Contents

- [The Unified Interface](#the-unified-interface) — one call pattern for humans, AI, and tools
- [First-Class Peers](#first-class-peers) — how humans, AI, and tools join the same network
- [The Transport](#the-transport-run-anywhere-reach-anywhere) — libp2p across browser, server, mobile, IoT
- [What Emerges](#what-emerges-from-a-unified-interface) — Lanes, discovery, adaptive coordination
- [Quick Start](#quick-start-run-olane-locally) — running in 2 minutes
- [What Is Olane OS?](#what-is-olane-os) — architecture and core concepts
- [Framework Comparison](#framework-comparison) — vs LangGraph, n8n, CrewAI
- [Community](#community--support) — get help and contribute

---

## The Unified Interface

Most agent frameworks invent a separate protocol per surface: an SDK for AI agents, a webhook system for humans, a tool registry for capabilities, a message bus for inter-agent communication. Olane collapses all four into one.

**The same call shape works everywhere:**

```typescript
// Calling a deterministic tool
await node.use('o://finance/analyst', {
  method: 'analyze',
  params: { quarter: 'Q4' },
});

// Asking a human (same call shape)
await node.use('o://human/brendon', {
  method: 'approve',
  params: { request: 'release v0.9' },
});

// Delegating to an AI agent (same call shape)
await node.use('o://ai/claude', {
  method: 'summarize',
  params: { document: '...' },
});

// Reaching a tool inside someone's browser (same call shape)
await node.use('o://browser/analytics', {
  method: 'track',
  params: { event: 'pageview' },
});
```

One call pattern. One address scheme. One discovery mechanism. The execution model on the other end — human judgment, AI inference, deterministic code — is opaque to the caller, and that's the point.

**Why this matters:**

| Without a unified interface | With Olane |
|---|---|
| Separate SDK per participant type | One client (`node.use()`) for everything |
| Humans behind webhooks, agents behind APIs | Both are first-class addressable nodes |
| Tools must know who's calling them | Tools serve any caller identically |
| Routing requires custom plumbing | Discovery and routing are uniform |
| Swapping a human for an AI requires a rewrite | Swapping is a routing decision at runtime |

---

## First-Class Peers

Every participant — human, AI, or tool — joins the same network the same way. Each gets an `o://` address and is reached through `node.use()`. There is no asymmetry.

| Participant | How it joins | Address shape |
|---|---|---|
| **Human** | `oHumanLoginTool` (CLI/web) | `o://human/<name>` |
| **AI agent** | `oAILoginTool` (any model) | `o://ai/<name>` |
| **Tool / app** | `oNodeTool` (your code) | `o://<your-namespace>` |

<table>
<tr>
<td width="50%">

**Human joins the network**

```typescript
import { oHumanLoginTool } from '@olane/o-login';

const human = new oHumanLoginTool({
  respond: async (intent: string) => {
    // Approvals, decisions, judgment calls
    return 'Approved with conditions';
  },
  answer: async (question: string) => {
    return 'Answer from human';
  },
  receiveStream: async (data: any) => {
    // Process streamed data
  }
});

await human.start();
// Now reachable at o://human — any node
// (AI or otherwise) can call this person.
```

</td>
<td width="50%">

**AI agent joins the network**

```typescript
import { oAILoginTool } from '@olane/o-login';

const ai = new oAILoginTool({
  respond: async (intent: string) => {
    // Autonomous processing
    return await runModel(intent);
  },
  answer: async (question: string) => {
    return await runModel(question);
  },
  receiveStream: async (data: any) => {
    await processStream(data);
  }
});

await ai.start();
// Now reachable at o://ai — any node
// (human or otherwise) can call this agent.
```

</td>
</tr>
</table>

**Same network. Same interface. Different execution models.** Humans bring judgment and oversight. AI agents bring automation and scale. Tools bring deterministic capability. The transport doesn't care which is which — and neither do callers.

[**Agent login →**](/packages/o-login/) | [**Agent-agnostic design →**](/docs/agents/agent-agnostic-design)

---

## The Transport: Run Anywhere, Reach Anywhere

Olane nodes use [libp2p](https://libp2p.io/) for transport. Nodes live in browsers, mobile apps, IoT devices, edge servers, or the cloud — and any addressable peer (human, AI, or tool) can reach any other through the same `o://` namespace.

<table>
<tr>
<td width="50%">

**Tool node in a browser**

```typescript
import { oWebsocketNode } from '@olane/o-node';

const browserTool = new oWebsocketNode({
  address: new oAddress('o://browser/analytics'),
  leader: leaderAddress
});

await browserTool.start();
// Reachable from anywhere on the network
```

</td>
<td width="50%">

**Tool node on mobile / IoT**

```typescript
import { oClientNode } from '@olane/o-node';

const deviceTool = new oClientNode({
  address: new oAddress('o://device/sensors'),
  leader: leaderAddress
});

await deviceTool.start();
// Reachable from anywhere on the network
```

</td>
</tr>
</table>

**What the transport gives you:**

| Traditional limitation | Olane |
|---|---|
| Browsers can't be servers | **WebRTC and WebSocket transports — browsers participate as full peers** |
| Mobile and IoT need a backend proxy | **Direct peer discovery via DHT** |
| Tools require central servers | **P2P, no middleman** |
| Firewalls and NAT block connections | **Automatic hole-punching** |
| Connections are insecure by default | **Encrypted by default (Noise protocol)** |

**Supported transports:**

- 🌐 **WebSocket** — browser-compatible
- 🔌 **TCP** — server-to-server
- 📡 **WebRTC** — direct browser-to-browser
- ⚡ **QUIC** — low-latency UDP
- 📱 **Bluetooth** — coming soon for local devices

[**P2P networking →**](/packages/o-node/README.md) | [**Network architecture patterns →**](/packages/o-node/README.md#network-architecture-patterns)

---

## What Emerges from a Unified Interface

When the interface is uniform and addresses are dynamic, you don't pre-build workflows — they **emerge**. We call these **Lanes**.

- 🔍 **Discovery is uniform** — agents find capabilities via DHT, not registries you maintain
- 🎯 **Routing is dynamic** — the system picks the best responder (human, AI, or tool) at execution time, not at compile time
- 📊 **Patterns are recorded** — successful execution paths become reusable Lanes, not pre-compiled DAGs
- 🔄 **Substitution is free** — a human falling offline routes to an AI peer with similar capabilities, and vice versa, because the call shape is the same

**Real-world example: a compliance report needing both AI analysis and human approval.**

```typescript
// You don't define the workflow. You express the intent.
const result = await complianceNode.use({
  method: 'intent',
  params: {
    intent: 'Generate Q4 compliance report with appropriate oversight'
  }
});
```

What happens at runtime:

```
Cycle 1:  AI Agent A   → Fetches data, discovers 127 transactions
Cycle 2:  AI Agent A   → Analyzes, flags 3 anomalies
Cycle 3:  AI Agent A   → Decides human review is needed
Cycle 4:  System       → Discovers available human peers
Cycle 5:  Human        → Reviews flagged items (system pauses 2 hrs)
Cycle 6:  Human        → Approves 2, requests deeper analysis on 1
Cycle 7:  AI Agent B   → Picks up deep analysis (Agent A is busy)
Cycle 8:  AI Agent B   → Completes, no further issues
Cycle 9:  AI Agent B   → Routes back to human for final approval
Cycle 10: Human        → Approves final report
Cycle 11: AI Agent A   → Formats and delivers
```

This coordination wasn't programmed. It **emerged** from peers pursuing a shared intent across a uniform interface — humans and AI substituted for each other, work paused for human latency without breaking, and the path is now recorded as a reusable Lane.

[**Emergent workflows →**](/docs/concepts/emergent-workflows)

---

## Get Started

A working OS instance in four steps. Same interface for tools, humans, and AI from the very first call.

**1. Install**

```bash
pnpm add @olane/os @olane/o-core @olane/o-login
```

**2. Start an OS instance**

An Olane OS instance needs a leader (the discovery / routing entry point) and at least one node. Both are addressable — `o://leader` and `o://node`.

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
const response = await os.use(new oAddress('o://node'), {
  method: 'some_tool',
  params: { /* ... */ },
});

if (response.result.success) {
  console.log(response.result.data);
} else {
  console.error(response.result.error);
}
```

**4. Bring a human or an AI into the same network**

The same `os.use(...)` call now reaches a person or a model — no new SDK, no new protocol.

```typescript
import { oHumanLoginTool, oAILoginTool } from '@olane/o-login';

// A human joins at o://human
const human = new oHumanLoginTool({
  respond: async (intent) => `Approved: ${intent}`,
  answer: async (q) => 'Human answer',
  receiveStream: async (data) => { /* ... */ },
});
await human.start();

// An AI agent joins at o://ai
const ai = new oAILoginTool({
  respond: async (intent) => await runModel(intent),
  answer: async (q) => await runModel(q),
  receiveStream: async (data) => { /* ... */ },
});
await ai.start();

// Reach either through the same call shape
await os.use(new oAddress('o://human'), {
  method: 'respond',
  params: { intent: 'Approve release v0.9' },
});

await os.use(new oAddress('o://ai'), {
  method: 'respond',
  params: { intent: 'Summarize the Q4 report' },
});
```

That's the unified interface in practice. Tools, humans, and AI are all reached through `os.use(address, ...)` — the caller doesn't change shape based on who's on the other end.

[**📚 Full setup guide →**](./docs/getting-started/installation.mdx) • [**Examples →**](./examples/)

---

## What Is Olane OS?

Olane OS is the operating system built on top of the Olane transport layer. Where the transport gives you uniform addressing and routing, the OS gives you the runtime, the discovery, and the conventions for building real systems on top of it.

```
Participants (humans / AI / tools)
        ↓
Unified Interface (o:// + node.use)
        ↓
Transport (libp2p — WebSocket, TCP, WebRTC, QUIC)
```

| Layer | What it is | Examples |
|---|---|---|
| **Participants** | Anything addressable | Humans (CLI/web), AI (Claude/GPT), tool nodes |
| **Unified interface** | One call pattern, one namespace | `o://...`, `node.use()` |
| **Transport** | P2P networking | libp2p, DHT discovery, encrypted by default |

**Core concepts:**

- 🌐 **`o://` protocol** — hierarchical addresses, like URLs, for any participant
- 🛠️ **Tool nodes** — capabilities you build (`o://finance`, `o://crm`)
- 🤖 **Agents** — humans or AI, both first-class addressable peers
- 🔄 **Lanes** — emergent, recorded workflows that arise from execution

[**Architecture deep dive →**](/docs/concepts/architecture)

---

## Documentation

| Category | Links |
|---|---|
| 🚀 **Getting Started** | [Installation](./docs/getting-started/installation.mdx) • [Quick Start](./docs/getting-started/quickstart.mdx) • [Core Concepts](./docs/concepts/overview.mdx) |
| 🎯 **Key Ideas** | [Unified Interface](/docs/concepts/unified-interface.mdx) • [Emergent Workflows](/docs/concepts/emergent-workflows.mdx) • [Agent-Agnostic Design](./docs/agents/agent-agnostic-design.mdx) |
| 📦 **Packages** | [o-core](./packages/o-core/) • [o-node](./packages/o-node/) • [o-tool](./packages/o-tool/) • [o-lane](./packages/o-lane/) • [o-leader](./packages/o-leader/) • [o-os](./packages/o-os/) |
| 📖 **Guides** | [Building Tool Nodes](./docs/guides/building-tool-nodes.mdx) • [Multi-Node Apps](./docs/guides/multi-node-applications.mdx) • [Testing](./docs/guides/testing.mdx) |
| 💡 **Examples** | [Financial Analyst](./examples/financial-analyst) • [CRM Application](./examples/crm-application) • [All Examples](./examples/) |
| 🔄 **Comparisons** | [vs LangGraph](./docs/comparisons/langgraph.mdx) • [vs CrewAI](./docs/comparisons/crewai.mdx) • [All Frameworks](./docs/comparisons/frameworks.mdx) |

[**📚 Browse all documentation →**](https://olane.com/docs)

---

## Framework Comparison

| | LangGraph | n8n | CrewAI | **Olane** |
|---|---|---|---|---|
| **Primary abstraction** | StateGraph | Visual DAG | Crew of agents | **Transport + unified interface** |
| **Humans in the loop** | Bolt-on (interrupts) | Webhooks/forms | Limited | **First-class addressable peers** |
| **AI agents** | First-class | Plugin | First-class | **First-class addressable peers** |
| **Tools** | Per-graph | Per-workflow | Per-crew | **Network-wide, addressable** |
| **Discovery** | Manual wiring | Manual config | Manual config | **Automatic, P2P (DHT)** |
| **Workflows** | Pre-defined graph | Visual canvas | Fixed crews | **Emergent, recorded as Lanes** |
| **Where it runs** | Server | Server | Server | **Browser, server, mobile, IoT** |
| **Inter-participant comms** | Custom per edge | Workflow-bound | Crew-bound | **One call pattern (`node.use()`)** |

[**In-depth framework comparison →**](/docs/comparisons/frameworks) | [**Why a unified interface →**](/docs/concepts/unified-interface)

---

## Community & Support

- **📚 Documentation**: [olane.com/docs](https://olane.com/docs)
- **💬 GitHub Discussions**: [github.com/olane-labs/olane/discussions](https://github.com/olane-labs/olane/discussions)
- **🐛 GitHub Issues**: [github.com/olane-labs/olane/issues](https://github.com/olane-labs/olane/issues)
- **💬 Discord**: [discord.gg/olane](https://discord.gg/olane)
- **📧 Email**: support@olane.io

---

## Contributing

We welcome contributions. See the [Contributing Guide](./CONTRIBUTING.md) for details.

**Areas:**

- Tool nodes and integrations
- Documentation and tutorials
- Core package improvements
- Real-world examples
- Bug fixes and performance

---

## License

Dual-licensed under your choice of:

- **[MIT License](LICENSE-MIT)** — simple, permissive
- **[Apache License 2.0](LICENSE-APACHE)** — permissive with patent protection

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion shall be dual-licensed as above, without additional terms.

---

**Ready to build?**

- 🚀 [Quick Start](#quick-start-run-olane-locally)
- 📚 [Full Documentation](https://olane.com/docs)
- 💡 [Browse Examples](./examples/)
- 💬 [Join Discord](https://discord.gg/olane)

Copyright © 2025 Olane Inc.
