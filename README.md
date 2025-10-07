# Olane OS

**An agentic operating system where agents (human or AI) are the users, and you build tool nodes as applications.**

[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://www.npmjs.com/package/@olane/o-core)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Documentation](https://img.shields.io/badge/docs-olane.com-blue)](https://olane.com/docs)

---

## TL;DR

Olane OS is a **distributed runtime for building agent-agnostic, intent-driven applications**. Build tool nodes with specialized capabilities that agents discover and coordinate dynamically. Works with both human agents (CLI/web) and AI agents (programmatically) through natural language.

```typescript
// Create an OS instance with a tool node
const os = new OlaneOS();
await os.start();

// Agents send natural language intents
const result = await os.use(
  new oAddress('o://messaging'),
  {
    method: 'intent',
    params: {
      intent: 'Send an email to dillon explaining what Olane OS is'
    }
  }
);
```


**What just happened?** The tool node accepted natural language, autonomously determined which tools to use, coordinated multi-step analysis, and returned results—no pre-defined workflows required.

![Olane OS Architecture](./olane-os.png)


---

## What is Olane OS?

Olane OS inverts the traditional software stack:

```
Traditional Software              Olane OS
┌──────────────────┐             ┌──────────────────┐
│  Users (Humans)  │             │  Agents (AI/Human)│
│  ↓               │             │  ↓               │
│  Applications    │             │  Tool Nodes      │
│  ↓               │    VS       │  ↓               │
│  Operating System│             │  Olane OS        │
└──────────────────┘             └──────────────────┘
```

**Key Concepts:**
- **Agents** (human or AI) express goals in natural language
- **Tool Nodes** are specialized applications with discoverable capabilities
- **o:// Protocol** enables hierarchical addressing and routing
- **Emergent Workflows** discovered through execution, not pre-defined
- **Agent-Agnostic** - build once, serve both human and AI agents

---

## Quick Start

### 1. Installation

```bash
npm install @olane/os @olane/o-core @olane/o-leader @olane/o-lane @olane/o-node @olane/o-tool
```

### 2. Create Your First Tool Node

```typescript
// financial-analyst.tool.ts
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';

class FinancialAnalystNode extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://finance/analyst'),
      methods: FINANCIAL_METHODS, // Define in separate file
      laneContext: {
        domain: 'Financial Analysis',
        expertise: ['Revenue Analysis', 'Expense Tracking', 'Report Generation']
      }
    });
  }

  // Tool 1: Calculate revenue
  async _tool_calculate_revenue(request: oRequest) {
    const { startDate, endDate } = request.params;
    // Your domain logic here
    return { revenue: 150000, growth: 12.5, currency: 'USD' };
  }

  // Tool 2: Calculate expenses
  async _tool_calculate_expenses(request: oRequest) {
    const { startDate, endDate } = request.params;
    return { expenses: 95000, categories: { /* ... */ } };
  }

  // Tool 3: Generate report
  async _tool_generate_report(request: oRequest) {
    const { revenue, expenses, format } = request.params;
    return { report: 'Executive Summary...', format };
  }
}

// Start the node
const analyst = new FinancialAnalystNode();
await analyst.start();

// Agents send natural language intents
const result = await analyst.use({
  method: 'intent',
  params: { intent: 'Analyze Q4 2024 and generate PDF report' }
});

// Node autonomously coordinates: calculate_revenue → calculate_expenses → generate_report
```

### 3. Choose Your Path

| Path | Use Case | Packages | Example |
|------|----------|----------|---------|
| **Simple Tool Node** | 1-5 tools, direct invocation | `o-core` + `o-tool` + `o-node` | Currency converter, validator |
| **Intent-Driven Node** | 5-20+ tools, autonomous coordination | Add `o-lane` | Financial analyst, data pipeline |
| **Multi-Node Application** | Complete platforms, multiple domains | Add `o-leader` + `o-os` | CRM, e-commerce, analytics |

---

## Key Features

### 🤖 **Agent-Agnostic Design**
Build once, serve both human agents (CLI/web) and AI agents (programmatically) through unified natural language interface.

### 🔄 **Emergent Workflows**
No pre-defined graphs. Workflows emerge through execution and adapt to changing requirements. Tool nodes learn optimal paths over time.

### 🧠 **Generalist-Specialist Architecture**
One LLM brain + many specialized tool nodes with context injection and tool augmentation. No fine-tuning needed.

### 🌲 **Hierarchical Organization**
Filesystem-like `o://` addressing with automatic context inheritance:
```
o://company/finance/analyst  # Inherits company + finance context
```

### 📦 **Modular Packages**
Install only what you need. Start minimal, scale to distributed multi-node systems.

### 🔌 **P2P Networking**
Self-organizing networks via libp2p. No central servers required.

---

## Documentation

### Core Documentation
- **[Getting Started Guide](./docs/getting-started/installation.mdx)** - Complete setup tutorial
- **[Core Concepts](./docs/concepts/overview.mdx)** - Architecture, tools, nodes, applications
- **[Agent-Agnostic Design](./docs/agents/agent-agnostic-design.mdx)** - Build for human and AI agents
- **[Why Olane?](./docs/why-olane.mdx)** - Comparison to LangGraph, CrewAI, AutoGen

### Package Documentation
- **[o-core](./packages/o-core/README.md)** - Kernel layer and core abstractions
- **[o-node](./packages/o-node/README.md)** - P2P networking implementation
- **[o-tool](./packages/o-tools-common/README.md)** - Tool system and conventions
- **[o-lane](./packages/o-lane/README.md)** - Intent-driven execution
- **[o-leader](./packages/o-leader/README.md)** - Network coordination
- **[o-os](./packages/o-os/README.md)** - Runtime system

### Guides & Examples
- **[Building Tool Nodes](./docs/guides/building-tool-nodes.mdx)** - Step-by-step guide
- **[Multi-Node Applications](./docs/guides/multi-node-applications.mdx)** - Coordinated systems
- **[Example: Financial Analyst](./examples/financial-analyst)** - Intent-driven node
- **[Example: CRM Application](./examples/crm-application)** - Multi-node coordination
- **[All Examples](./examples/)** - Browse all examples

---

## Architecture Overview

### Three-Layer Model

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: AGENTS (Users)                                │
│  • Humans via CLI, web UI, API                          │
│  • AI models (GPT-4, Claude, Gemini)                    │
│  • Express goals in natural language                    │
└─────────────────────────────────────────────────────────┘
                        ⬇ sends intents
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: TOOL NODES (Applications)                     │
│  • Domain-specific capabilities you build               │
│  • Agent-agnostic interface                             │
│  • Discoverable via o:// addressing                     │
└─────────────────────────────────────────────────────────┘
                        ⬇ runs on
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: OLANE OS (Infrastructure)                     │
│  • Runtime system and lifecycle management              │
│  • Network discovery and routing                        │
│  • Message passing and coordination                     │
└─────────────────────────────────────────────────────────┘
```

**Learn more:** [Architecture Documentation](./docs/architecture/overview.mdx)

---

## Comparison to Other Frameworks

| Feature | LangGraph | CrewAI | AutoGen | Olane OS |
|---------|-----------|--------|---------|----------|
| **Workflows** | Pre-defined graphs | Fixed crews | Message groups | Emergent patterns |
| **Discovery** | Manual | Manual config | Manual | Automatic (o-leader) |
| **Agents** | Python only | AI only | AI only | Human + AI |
| **Learning** | Per-workflow | Limited | Limited | Cross-execution |
| **Scaling** | Vertical | Vertical | Limited | Horizontal P2P |

**Learn more:** [Detailed Comparison](./docs/comparisons/frameworks.mdx)

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

## What Makes Olane Different?

**Traditional Approach:**
```typescript
// Pre-define every step
const workflow = new StateGraph({
  nodes: ['step1', 'step2', 'step3'],
  edges: [['step1', 'step2'], ['step2', 'step3']]
});
```

**Olane Approach:**
```typescript
// Send high-level intent, workflow emerges
await toolNode.use({
  method: 'intent',
  params: { intent: 'Accomplish complex goal' }
});
// Discovers optimal path, learns, adapts, serves human + AI agents
```

**Learn more:** [Why Olane?](./docs/why-olane.mdx)

---

**Ready to build?** Start with [Quick Start](#quick-start) | [Full Documentation](https://olane.com/docs) | [Examples](./examples/)

Copyright © 2025 Olane Inc.
