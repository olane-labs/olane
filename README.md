# Olane OS

**A graph-based operating system where humans or AI agents are the user, and applications are nodes.**

[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://www.npmjs.com/package/@olane/o-core)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Documentation](https://img.shields.io/badge/docs-olane.com-blue)](https://olane.com/docs)

---

## TL;DR

Olane OS is the secure workspace for AI, humans and tools. Build your hyper-personalized AI environment and let agents do MORE *with* you.

**What makes Olane different?** While other frameworks require you to pre-define workflows upfront (LangGraph's StateGraph, n8n's visual DAGs, CrewAI's fixed crews), Olane enables **emergent workflows** that discover optimal paths through execution and learn from experience. This allows:
- Agents to **discover new workflows**
- Agents to **create plans**
- Agents to **operate securely with sensitive data**
- Agents to **solve complex tasks**
- Agents to **perform long-running tasks**
- Agents to **learn from past mistakes**
- Agents to **learn to use smaller models**
- Agents to **self-improve**
- Agents to **collaborate with humans**
- Agents to **collaborate with other Agents**
- Agents to **collaborate with other Olane OS**

[**Why emergent workflows are the future of AI Agents →**](/docs/concepts/emergent-workflows)

---

## Table of Contents

- [Why Olane OS?](#why-olane-os) - Key differentiators
- [What is Olane OS?](#what-is-olane-os) - Core concepts
- [Quick Start](#quick-start) - Get running in 5 minutes
- [Documentation](#documentation) - Guides and API reference
- [Framework Comparison](#framework-comparison) - vs LangGraph, n8n, CrewAI
- [Community](#community--support) - Get help and contribute

---

## Why Olane OS?

### 🔄 Emergent Workflows (Not Prebuilt)

Avoid hardcoding prebuilt workflows, instead engineer capabilities for AI agents to  **Olane's workflows emerge through agentic exploration**.

<p align="center"><b style="color: black;">🏎️ We call these Lanes. 🏎️</b></p>

Lanes (Olane workflows) capture agentic behavior as it develops. Emergent workflows capture how work actually happens mirroring human work patterns.

**How it works technically:**

- **Runtime workflow formation** - Execution paths are traced and stored as reusable workflows, not pre-compiled graphs
- **Automatic optimization** - Lanes track success/failure metrics and adjust tool selection based on historical performance
- **Usage-based pattern extraction** - Workflow patterns emerge from actual execution logs, not developer-defined state machines  
- **Zero configuration overhead** - No DAG definitions, YAML files, or visual editors—workflows are recorded from agent behavior
- **Probabilistic routing** - Agents choose tools based on semantic matching and past execution outcomes, not hardcoded paths

#### Why Multi-Human and Multi-Agent Workflows Require Emergent Capabilities

When multiple humans and AI agents collaborate, prebuilt workflows break down completely. Here's why emergent capabilities are essential:

| Challenge | Prebuilt Workflow Problem | Emergent Workflow Solution |
|-----------|---------------------------|----------------------------|
| **Unpredictable coordination** | Must predefine every handoff between agents | Agents discover optimal coordination patterns through execution |
| **Varying decision speeds** | Assumes synchronous, uniform timing | Adapts to human delays and AI speed automatically |
| **Dynamic availability** | Breaks when designated agent is unavailable | Routes work to available agents with similar capabilities |
| **Context switching** | Loses context when work passes between agent types | Maintains intent and context across all agent transitions |
| **Evolving roles** | Rigid role assignments (human approver, AI executor) | Agents naturally specialize based on performance history |
| **Distributed coordination** | Requires central orchestrator | P2P coordination emerges from agent interactions |

**Real-world example:**

```typescript
// Scenario: Generate compliance report requiring both AI analysis and human approval

// ❌ Prebuilt Workflow (LangGraph/CrewAI)
const workflow = new StateGraph({
  nodes: [
    'ai_agent_1_fetch_data',
    'ai_agent_2_analyze',
    'human_agent_1_review',   // What if they're offline?
    'ai_agent_1_format',
    'human_agent_2_approve'   // What if approval isn't needed?
  ],
  edges: [/* hardcoded transitions */]
});
// Breaks if: human is unavailable, AI finds no issues, priorities change

// ✅ Emergent Workflow (Olane OS)
const result = await complianceNode.use({
  method: 'intent',
  params: {
    intent: 'Generate Q4 compliance report with appropriate oversight'
  }
});
```

**What happens with emergent workflows:**

```
Cycle 1:  AI Agent A   → Fetches data, discovers 127 transactions
Cycle 2:  AI Agent A   → Analyzes transactions, flags 3 anomalies
Cycle 3:  AI Agent A   → Evaluates: "Anomalies found, need human review"
Cycle 4:  System       → Searches for available human agents
Cycle 5:  Human Agent  → Reviews flagged items (takes 2 hours - emergent workflow waits)
Cycle 6:  Human Agent  → Approves 2, requests deeper analysis on 1
Cycle 7:  AI Agent B   → Picks up deep analysis task (Agent A is busy)
Cycle 8:  AI Agent B   → Completes analysis, no issues found
Cycle 9:  AI Agent B   → Routes back to human (learned they want final approval)
Cycle 10: Human Agent  → Approves final report
Cycle 11: AI Agent A   → Formats and delivers compliance report
```

**Key emergent behaviors:**

- 🔄 **Adaptive handoffs** - Work naturally flowed between 2 AI agents and 1 human based on availability
- ⏱️ **Asynchronous coordination** - System paused for human review without breaking workflow  
- 🎯 **Context preservation** - Each agent maintained understanding of compliance requirements
- 📊 **Pattern learning** - System learned that this human prefers final approval on anomalies
- 🔀 **Dynamic routing** - AI Agent B picked up analysis when AI Agent A was busy

This coordination pattern wasn't programmed—it **emerged** from agents pursuing the shared intent while respecting each other's availability and capabilities.

[**Learn more about emergent workflows →**](/docs/concepts/emergent-workflows)

---

### 🤖 Log into Olane OS

Both humans and AI agents can log into Olane OS, becoming addressable nodes that can receive intents, answer questions, and process streamed data. Once logged in, you're part of the network—other nodes can discover and interact with you.

<table>
<tr>
<td width="50%">

**Human Agent Login**

```typescript
import { oHumanLoginTool } from '@olane/o-login';

const humanAgent = new oHumanLoginTool({
  respond: async (intent: string) => {
    // Handle intents (approvals, decisions)
    console.log('Received intent:', intent);
    return 'Intent resolved successfully';
  },
  answer: async (question: string) => {
    // Answer questions from other nodes
    return 'Human answer';
  },
  receiveStream: async (data: any) => {
    // Process streamed data
    console.log('Received stream:', data);
  }
});

await humanAgent.start();
// Now reachable at o://human
```

</td>
<td width="50%">

**AI Agent Login**

```typescript
import { oAILoginTool } from '@olane/o-login';

const aiAgent = new oAILoginTool({
  respond: async (intent: string) => {
    // AI processes autonomously
    const result = await processWithAI(intent);
    return result;
  },
  answer: async (question: string) => {
    // AI answers questions
    return await aiAnswers(question);
  },
  receiveStream: async (data: any) => {
    // AI processes streamed data
    await processStream(data);
  }
});

await aiAgent.start();
// Now reachable at o://ai
```

</td>
</tr>
</table>

**Same network, same capabilities, different execution models.** Human agents bring judgment and oversight. AI agents bring automation and scale. Both are first-class citizens in Olane OS.

[**Learn more about agent login →**](/packages/o-login/) | [**Agent-agnostic design →**](/docs/agents/agent-agnostic-design)

---

### 🧠 Intent-Driven



---

### 🌐 Run tool nodes anywhere. Connect from everywhere.

Olane OS nodes use [libp2p](https://libp2p.io/) for it's networking layer. This means tool nodes can run in browsers, mobile apps, IoT devices, edge servers, or the cloud—and AI agents can securely discover and use them all.

<table>
<tr>
<td width="50%">

**Tool Node in Browser**

```typescript
import { oWebSocketNode } from '@olane/o-node';

// Runs in any browser
const browserTool = new oWebSocketNode({
  address: new oAddress('o://browser/analytics'),
  leader: leaderAddress
});

await browserTool.start();
// AI agents can now call o://browser/analytics
```

</td>
<td width="50%">

**Tool Node on Mobile/IoT**

```typescript
import { oClientNode } from '@olane/o-node';

// Runs on mobile, Raspberry Pi, etc.
const deviceTool = new oClientNode({
  address: new oAddress('o://device/sensors'),
  leader: leaderAddress
});

await deviceTool.start();
// AI agents can now access device sensors
```

</td>
</tr>
</table>

**What this enables:**

| Traditional Limitation | Olane Solution |
|------------------------|----------------|
| AI agents can't access browser tools | **Agents call o://browser tools via WebRTC** |
| AI agents can't reach mobile/IoT | **Agents discover devices via DHT** |
| Tools require central servers | **P2P communication, no middleman** |
| Complex firewall/NAT setup | **Automatic hole-punching** |
| Insecure connections | **Encrypted by default (Noise protocol)** |

**Supported Transports:**
- 🌐 **WebSocket** - Browser-compatible
- 🔌 **TCP** - Server-to-server
- 📡 **WebRTC** - Direct browser connections
- ⚡ **QUIC** - Low-latency UDP-based
- 📱 **Bluetooth** - Coming soon for local devices

[**Learn more about P2P networking →**](/packages/o-node/README.md) | [**Network architecture patterns →**](/packages/o-node/README.md#network-architecture-patterns)

---

## Quick Start (run Olane OS locally)

<!--
  Demo: Olane OS in action
  This GIF shows a real workflow using Olane OS.
-->
<p align="center">
  <img src="/docs/assets/demo-olane.gif" alt="Olane OS Demo" width="600"/>
</p>


**Get running in 2 minutes:**

```bash
# 1. Install the cli - a lightweight version of Olane OS
npm install -g @olane/o-cli

# 2. Start Olane OS
olane

# 3. Just talk to it
> Add the Filesystem MCP server to this folder /Users/me/Documents
# ✓ Olane discovers, configures, and connects it automatically

> How many files are in that folder?
# ✓ Olane finds the right tool and executes it

> Add the Linear MCP server with API Key "XYZ"
# ✓ Linear tools now available at o://leader/node/mcp/linear
```

**That's it.** No config files, no manual wiring, no code. Tools discover each other and coordinate automatically.

[**📚 Full setup guide →**](./docs/getting-started/installation.mdx)

---

## What is Olane OS?

An operating system where **agents are the users** and **tool nodes are the applications**.

| Traditional Software | Olane OS |
|---------------------|----------|
| Users = Humans | **Users = Agents** (human or AI) |
| Apps = Fixed programs | **Apps = Tool Nodes** (discoverable capabilities) |
| Communication = APIs | **Communication = Natural language** |
| Workflows = Pre-defined | **Workflows = Emergent** |

**Core Concepts:**
- 🤖 **Agents** - Humans (CLI/web) or AI (GPT-4/Claude) expressing goals
- 🛠️ **Tool Nodes** - Specialized capabilities you build (`o://finance`, `o://crm`)
- 🌐 **o:// Protocol** - Hierarchical addressing like URLs
- 🔄 **Emergent Workflows** - Discovered through execution, not hardcoded

[**Deep dive into architecture →**](/docs/concepts/architecture)

---

## Documentation

| Category | Links |
|----------|-------|
| 🚀 **Getting Started** | [Installation](./docs/getting-started/installation.mdx) • [Quick Start](./docs/getting-started/quickstart.mdx) • [Core Concepts](./docs/concepts/overview.mdx) |
| 🎯 **Key Features** | [Emergent Workflows](/docs/concepts/emergent-workflows.mdx) • [Agent-Agnostic Design](./docs/agents/agent-agnostic-design.mdx) • [Architecture](./docs/concepts/architecture.mdx) |
| 📦 **Packages** | [o-core](./packages/o-core/) • [o-node](./packages/o-node/) • [o-tool](./packages/o-tool/) • [o-lane](./packages/o-lane/) • [o-leader](./packages/o-leader/) • [o-os](./packages/o-os/) |
| 📖 **Guides** | [Building Tool Nodes](./docs/guides/building-tool-nodes.mdx) • [Multi-Node Apps](./docs/guides/multi-node-applications.mdx) • [Testing](./docs/guides/testing.mdx) |
| 💡 **Examples** | [Financial Analyst](./examples/financial-analyst) • [CRM Application](./examples/crm-application) • [All Examples](./examples/) |
| 🔄 **Comparisons** | [vs LangGraph](./docs/comparisons/langgraph.mdx) • [vs CrewAI](./docs/comparisons/crewai.mdx) • [All Frameworks](./docs/comparisons/frameworks.mdx) |

[**📚 Browse all documentation →**](https://olane.com/docs)

---

## Architecture

Olane OS uses a **three-layer architecture**:

```
Agents (humans/AI) → Tool Nodes (your apps) → Olane OS (infrastructure)
```

| Layer | What It Is | Examples |
|-------|-----------|----------|
| **Agents** | Intelligent users | Humans (CLI/web), AI (GPT-4/Claude) |
| **Tool Nodes** | Applications you build | `o://finance/analyst`, `o://crm/customers` |
| **Olane OS** | Runtime infrastructure | Discovery, routing, networking |

[**Read the architecture guide →**](/docs/concepts/architecture) | [**Package details →**](/docs/packages/overview)

---

## Framework Comparison

| Feature | LangGraph | n8n | CrewAI | **Olane OS** |
|---------|-----------|-----|--------|----------|
| **Workflows** | Pre-defined StateGraph | Visual DAG | Fixed crews | **Emergent patterns** |
| **Flexibility** | Update graph manually | Rewire canvas | Redefine roles | **Adapts automatically** |
| **Learning** | Per-workflow only | Template-based | Limited | **Cross-execution** |
| **Discovery** | Manual wiring | Manual config | Manual config | **Automatic P2P** |
| **Agents** | Python only | Visual + code | AI only | **Human + AI** |
| **Scaling** | Vertical | Vertical | Vertical | **Horizontal** |

**Need more details?** Read the [in-depth framework comparison →](/docs/comparisons/frameworks) or [emergent workflows guide →](/docs/concepts/emergent-workflows)

---

## Community & Support

- **📚 Documentation**: [olane.com/docs](https://olane.com/docs)
- **💬 GitHub Discussions**: [github.com/olane-labs/olane/discussions](https://github.com/olane-labs/olane/discussions)
- **🐛 GitHub Issues**: [github.com/olane-labs/olane/issues](https://github.com/olane-labs/olane/issues)
- **💬 Discord**: [discord.gg/olane](https://discord.gg/olane)
- **📧 Email**: support@olane.io

---

## Contributing

We welcome contributions! See our [Contributing Guide](./CONTRIBUTING.md) for details.

**Areas for contribution:**
- Tool nodes and integrations
- Documentation and tutorials
- Core package improvements
- Real-world examples
- Bug fixes and performance

---

## License

Olane OS is dual-licensed under your choice of:

- **[MIT License](LICENSE-MIT)** - Simple, permissive license
- **[Apache License 2.0](LICENSE-APACHE)** - Permissive license with patent protection

**Why dual licensing?** Choose MIT for simplicity or Apache 2.0 for explicit patent grants. See [LICENSE](./LICENSE) for details.

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion shall be dual-licensed as above, without additional terms.

---

**Ready to build?** 
- 🚀 [Quick Start Guide](#quick-start)
- 📚 [Full Documentation](https://olane.com/docs)
- 💡 [Browse Examples](./examples/)
- 💬 [Join Discord](https://discord.gg/olane)

Copyright © 2025 Olane Inc.
