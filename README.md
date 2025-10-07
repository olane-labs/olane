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

Unlike OpenAI's workflows, LangGraph's StateGraph, n8n's visual DAGs, or CrewAI's fixed crews, **Olane's workflows emerge through agentic exploration**.

> 💡 **We call these Lanes.**

### Comparing OpenAI to Olane

A student in 2027 asks "How did emergent workflows become the industry standard?"

**OpenAI Workflow Builder**
OpenAI's Homework Helper agent design:
![openai workflow workflow](/docs/assets/openai-workflow-builder.png)
❌ Rigid, brittle, non-modular

</td>
<td width="50%">

**Olane OS**
Create the OpenAI Homework Helper agent with 3 addresses in Olane:
1. o://start/summarizer
2. o://start/agents
3. o://start/end
New workflow stored as o://lane/homework-helper. To re-use this, simply call the lane address o://lane/homework-helper with the user's question.

*What Olane did:*
```
1. o://start/summarizer [Olane OS - calls the summarizer]
  |--o://start/knowledge/search [Summarizer depends upon o://knowledge/search]
  |--o://start/llm [Summarizer needs an LLM to rewrite the user's question]
  |--Completed step 1
2. o://start/agents [Olane OS - calls the agents node "is a specialized agent necessary?"]
  |--o://start/end [If no, go to end and stop]
  |--Completed Step 2
3. o://start/agents/q&a [o://start/agents calls the o://q&a node to complete the question]
  |--o://start/llm [Q&A is needs an LLM to complete the question]
  |--o://start/end [Q&A finished]
  |--Completed step 3
```


**Result:** Olane discovers tools, determines optimal path, coordinates execution—all automatically.


[**Learn more about emergent workflows →**](/docs/concepts/emergent-workflows)

---

### 🤖 Agent-Agnostic Design

Build once and serve **both human users** (CLI/web) and **AI agents** (programmatic) through the same natural language interface.

```typescript
// Build a customer analytics tool once
class CustomerAnalytics extends oLaneTool {
  async _tool_get_customers(req) { /* ... */ }
  async _tool_calculate_ltv(req) { /* ... */ }
}

// Human analyst (CLI): 
// $ olane intent "Find high-value customers at risk of churning"

// AI agent (programmatic):
// await analytics.use({ 
//   method: 'intent', 
//   params: { intent: 'Find high-value customers at risk of churning' }
// });

// Same tool, same interface, same result—agent type doesn't matter
```

[**Learn more about agent-agnostic design →**](/docs/agents/agent-agnostic-design)

---

### 🧠 Generalist-Specialist Architecture

One LLM brain + many specialized tool nodes. No fine-tuning needed—specialization through context injection and tool augmentation.

```
Agent (GPT-4/Claude) → Coordinates → Specialized Tool Nodes
                                    ├─ o://finance/analyst
                                    ├─ o://data/pipeline  
                                    └─ o://customer/crm
```

[**Learn more about the architecture →**](/docs/concepts/architecture)

---

### 🌐 P2P Discovery & Coordination

Self-organizing mesh networks via libp2p. Tool nodes automatically discover each other—no service registry, no manual configuration, no hardcoded endpoints.

```typescript
// Add a tool anywhere in the network
const analytics = new CustomerAnalytics();
await analytics.start(); // Auto-registers at o://analytics/customers

// From anywhere else, just search
const nodes = await leader.search({ capability: 'customer_analysis' });
// → Finds o://analytics/customers automatically

// Or address directly
await leader.use(new oAddress('o://analytics/customers'), {
  method: 'intent',
  params: { intent: 'Find churning customers' }
});
```

**Result:** Horizontal scaling, zero config, self-healing network.

[**Learn more about networking →**](/packages/o-node/README.md)

---

## Quick Start

<!--
  Demo: Olane OS in action
  This GIF shows a real workflow using Olane OS.
-->
<p align="center">
  <img src="/docs/assets/demo-olane.gif" alt="Olane OS Demo" width="600"/>
</p>


**Get running in 2 minutes:**

```bash
# 1. Install
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
