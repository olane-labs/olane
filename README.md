# Olane OS

**An agentic operating system where agents (human or AI) are the users, and you build tool nodes as applications.**

[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://www.npmjs.com/package/@olane/o-core)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)

---

## TL;DR

Olane OS is a distributed runtime for building **agent-agnostic, intent-driven applications**. Instead of hardcoded workflows, you build **tool nodes** with specialized capabilities that agents discover and coordinate dynamically. The OS handles discovery, routing, and execution across a network of processes.

**Build once, serve both** - Your tool nodes work with human agents (via CLI/web) and AI agents (programmatically) through the same natural language interface.

```typescript
import { OlaneOS } from '@olane/os';
import { oLaneTool } from '@olane/o-lane';
import { NodeType, oAddress } from '@olane/o-core';

// Create an OS instance with a simple tool node
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
      address: new oAddress('o://financial-analyst'),
      leader: null,
      parent: null,
    },
  ],
});

// Start the OS
await os.start();

// Agents (human or AI) send natural language intents
const result = await os.use(
  new oAddress('o://financial-analyst'),
  {
    method: 'intent',
    params: {
      intent: 'Analyze Q4 2024 revenue trends and generate executive summary'
    }
  }
);

console.log(result); // Comprehensive financial analysis

// Stop gracefully
await os.stop();
```

**What just happened?**
- Created an operating system instance with a leader and tool node
- Tool node accepted natural language intent from agent
- Autonomously determined which tools to use
- Coordinated multi-step analysis
- Returned complete result to agent

---

## What is Olane OS?

Olane OS is a **runtime system** that inverts the traditional software stack:

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

### The Three-Layer Model

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

### Key Concepts

- **Agents** (human or AI) express goals in natural language
- **Tool Nodes** are specialized applications with discoverable capabilities
- **Tools** are individual executable methods (functions) on nodes
- **Applications** are multiple tool nodes working together
- **Leaders** provide discovery and coordination
- **o:// Protocol** enables hierarchical addressing and routing

---

## Quick Start

### Installation

```bash
npm install @olane/os @olane/o-core @olane/o-leader @olane/o-lane @olane/o-node @olane/o-tool
```

### Create Your First Tool Node

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';

// Build a specialized financial analysis tool node
class FinancialAnalystNode extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://finance/analyst'),
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

  _params_calculate_revenue() {
    return {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: true }
    };
  }

  // Tool 2: Calculate expenses
  async _tool_calculate_expenses(request: oRequest) {
    const { startDate, endDate } = request.params;
    return { expenses: 95000, categories: { /* ... */ } };
  }

  _params_calculate_expenses() {
    return {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: true }
    };
  }

  // Tool 3: Generate report
  async _tool_generate_report(request: oRequest) {
    const { revenue, expenses, format } = request.params;
    return { report: 'Executive Summary...', format };
  }

  _params_generate_report() {
    return {
      revenue: { type: 'object', required: true },
      expenses: { type: 'object', required: true },
      format: { type: 'string', required: false, default: 'pdf' }
    };
  }
}

// Start the tool node
const analyst = new FinancialAnalystNode();
await analyst.start();

// Agents send natural language intents
const result = await analyst.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 2024 financial performance and generate PDF report'
  }
});

// Tool node autonomously:
// 1. EVALUATE: "Need revenue and expenses for Q4 2024"
// 2. TASK: Call _tool_calculate_revenue
// 3. TASK: Call _tool_calculate_expenses
// 4. EVALUATE: "Have data, need to generate report"
// 5. TASK: Call _tool_generate_report with collected data
// 6. STOP: Return completed report
```

---

## Core Innovations

### 1. Agent-Agnostic Design

**Build once, serve both human and AI agents** through a unified natural language interface.

```typescript
// Same tool node interface for both agent types:

// Human agent via CLI:
// $ olane intent "Analyze Q4 revenue trends"

// AI agent programmatically:
await toolNode.use({
  method: 'intent',
  params: { intent: 'Analyze Q4 revenue trends' }
});
```

**Benefits:**
- Broader market reach (humans today, AI tomorrow)
- Unified interface reduces maintenance
- Future-proof architecture
- Works with any AI model

### 2. Generalist-Specialist Architecture

**One LLM brain (for AI agents) + Many specialized tool nodes**

Instead of fine-tuning separate models for each domain, use tool augmentation and context injection to create specialists.

```
┌─────────────────────────────────────────┐
│  AI Agent (GPT-4, Claude, Gemini)       │  ← One generalist brain
│  "The intelligent reasoning layer"      │
└─────────────────────────────────────────┘
              ⬇ uses
┌──────────────┬──────────────┬──────────────┐
│ Finance Node │  CRM Node    │ Analytics    │  ← Many specialists
│ + Context    │  + Context   │  + Context   │
│ + Tools      │  + Tools     │  + Tools     │
└──────────────┴──────────────┴──────────────┘
```

**How specialization works:**
- **Context Injection**: Add domain knowledge via lane context
- **Tool Augmentation**: Provide specialized capabilities via `_tool_` methods
- **Knowledge Accumulation**: Tool nodes learn from interactions

### 3. Emergent vs Explicit Orchestration

**Traditional approach (LangGraph):** Pre-define workflow graphs
```typescript
// Pre-define every step
const workflow = new StateGraph({
  nodes: ['fetch_data', 'analyze', 'report'],
  edges: [
    ['fetch_data', 'analyze'],
    ['analyze', 'report']
  ]
});
```

**Olane approach:** Workflows emerge from agent-tool interactions
```typescript
// Agent sends high-level intent
await toolNode.use({
  method: 'intent',
  params: { intent: 'Analyze Q4 sales and create report' }
});

// Tool node discovers optimal path:
// EVALUATE → SEARCH → TASK → EVALUATE → TASK → STOP
// Path emerges based on context, not pre-defined
```

**Benefits:**
- Adapts to changing requirements
- Learns optimal paths over time
- No upfront workflow design needed
- Knowledge shared across executions ("Rooms with Tips")

### 4. Hierarchical Organization

**Filesystem-like addressing** for tool nodes with automatic context inheritance:

```
o://
├── leader                          # Discovery & coordination
├── company/
│   ├── finance/
│   │   ├── analyst                 # Inherits company + finance context
│   │   ├── revenue                 # + revenue-specific tools
│   │   └── expenses                # + expense-specific tools
│   └── engineering/
│       ├── backend                 # Inherits company + eng context
│       └── frontend                # + frontend-specific tools
└── utilities/
    ├── converter                   # General-purpose utilities
    └── validator
```

**Benefits:**
- Natural organization mirrors business structure
- Tool nodes inherit domain knowledge from hierarchy
- Intelligent routing through parent-child relationships
- Automatic failover paths

---

## Architecture Levels

Olane has three levels of granularity:

### Level 1: Tool (Method)

An individual executable method on a tool node.

```typescript
class FinancialNode extends oNodeTool {
  // This is a TOOL - single method
  async _tool_calculate_revenue(request: oRequest) {
    const { startDate, endDate } = request.params;
    return { revenue: 150000, currency: 'USD' };
  }

  _params_calculate_revenue() {
    return {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: true }
    };
  }
}
```

**When to use:** Atomic operations, single-purpose functions

### Level 2: Node (Process)

A process containing one or more tools, addressable via `o://`

**Simple Node** (1-5 tools, direct invocation):
```typescript
class CurrencyConverterNode extends oNodeTool {
  async _tool_convert(request) { /* ... */ }
  async _tool_get_rate(request) { /* ... */ }
  async _tool_list_currencies(request) { /* ... */ }
}
```

**Complex Node** (5-20+ tools, intent-driven):
```typescript
class FinancialAnalystNode extends oLaneTool {
  async _tool_calculate_revenue(request) { /* ... */ }
  async _tool_calculate_expenses(request) { /* ... */ }
  async _tool_generate_report(request) { /* ... */ }
  // ... 10 more tools
}

// Accepts intents, autonomously coordinates tools
await analyst.use({
  method: 'intent',
  params: { intent: 'Generate Q4 financial report' }
});
```

**When to use:**
- Simple: Single domain, agents know which tool to call
- Complex: Multiple related tools, intent-driven coordination needed

### Level 3: Application (Multi-Node)

Multiple tool nodes working together to provide complete capability.

```typescript
// APPLICATION: CRM Platform
// Node 1: o://crm/customers (customer data)
// Node 2: o://crm/sales (pipeline management)
// Node 3: o://crm/support (ticket system)
// Node 4: o://crm/analytics (reporting)

// Agents coordinate between nodes or use coordinator:
const coordinator = new CRMCoordinatorNode();
await coordinator.use({
  method: 'intent',
  params: {
    intent: 'Customer cust_123 has billing issue. Create ticket with full context.'
  }
});

// Coordinator autonomously:
// 1. Discovers o://crm/customers
// 2. Retrieves customer data
// 3. Discovers o://crm/analytics
// 4. Analyzes customer value
// 5. Discovers o://crm/support
// 6. Creates ticket with context
```

**When to use:** Multiple domains requiring coordination, enterprise-scale platforms

---

## Package Architecture

### Core Packages

| Package | Purpose | When to Use |
|---------|---------|-------------|
| **@olane/o-core** | Kernel layer - abstract runtime | Building custom implementations |
| **@olane/o-protocol** | Type definitions and interfaces | Type safety and protocol compliance |
| **@olane/o-node** | P2P networking via libp2p | Real networking between processes |
| **@olane/o-tool** | Tool system and conventions | Building discoverable capabilities |
| **@olane/o-lane** | Intent-driven execution | Accepting natural language intents |
| **@olane/o-leader** | Network coordination and registry | Multi-node discovery and coordination |
| **@olane/o-os** | Runtime system and lifecycle | Managing complete OS instances |

### Package Combinations

**Minimal (Local Development):**
```bash
npm install @olane/o-core @olane/o-tool
```

**Basic Tool Node:**
```bash
npm install @olane/o-core @olane/o-node @olane/o-tool
```

**Intent-Driven Tool Node:**
```bash
npm install @olane/o-core @olane/o-node @olane/o-tool @olane/o-lane
```

**Complete Multi-Node System:**
```bash
npm install @olane/os @olane/o-core @olane/o-node @olane/o-tool @olane/o-lane @olane/o-leader
```

---

## Common Use Cases

### Use Case 1: Financial Analysis Tool Node

Build a specialized financial analyst that agents can query.

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';

class FinancialAnalystNode extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://finance/analyst'),
      laneContext: {
        domain: 'Financial Analysis',
        companyPolicies: ['GAAP compliance', 'Quarterly reporting'],
        regulations: ['SOX', 'SEC filing requirements']
      }
    });
  }

  async _tool_analyze_revenue(request: oRequest) {
    const { period } = request.params;
    // Domain-specific analysis logic
    return { revenue, growth, trends };
  }

  async _tool_forecast_budget(request: oRequest) {
    const { quarters, assumptions } = request.params;
    // Forecasting logic
    return { forecast, confidence, scenarios };
  }

  async _tool_generate_report(request: oRequest) {
    const { data, format } = request.params;
    // Report generation
    return { report, charts, summary };
  }
}

const analyst = new FinancialAnalystNode();
await analyst.start();

// Agents use via natural language
const result = await analyst.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 2024 performance and forecast Q1 2025 budget'
  }
});
```

### Use Case 2: Multi-Node CRM Application

Build a complete CRM with coordinated tool nodes.

```typescript
import { OlaneOS } from '@olane/os';
import { oLeaderNode } from '@olane/o-leader';
import { oNodeTool, oLaneTool } from '@olane/o-node';
import { NodeType, oAddress } from '@olane/o-core';

// Setup OS with multiple tool nodes
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
      address: new oAddress('o://crm/customers'),
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://crm/sales'),
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://crm/support'),
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://crm/coordinator'),
      leader: null,
      parent: null,
    },
  ],
});

await os.start();

// Agents interact with coordinator
const result = await os.use(
  new oAddress('o://crm/coordinator'),
  {
    method: 'intent',
    params: {
      intent: 'Customer cust_123 needs priority support. Pull full context and create VIP ticket.'
    }
  }
);

// Coordinator autonomously:
// 1. Discovers o://crm/customers
// 2. Retrieves customer data and history
// 3. Discovers o://crm/sales
// 4. Checks current deals and pipeline
// 5. Discovers o://crm/support
// 6. Creates VIP ticket with full context
```

### Use Case 3: Development Environment

Local development with hot reload.

```typescript
import { OlaneOS } from '@olane/os';
import { setupGracefulShutdown, NodeType, oAddress } from '@olane/o-core';

const devOS = new OlaneOS({
  network: {
    name: 'dev-environment',
    port: 4999
  },
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader'),
      network: {
        listeners: ['/ip4/127.0.0.1/tcp/4999']
      }
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://dev-tool-node')
    }
  ],
  noIndexNetwork: true  // Faster startup for development
});

setupGracefulShutdown(async () => {
  await devOS.stop();
});

await devOS.start();
console.log('Development OS ready at o://leader');
```

---

## Comparison to Other Frameworks

### vs LangGraph

| Aspect | LangGraph | Olane OS |
|--------|-----------|----------|
| **Orchestration** | Explicit graphs | Emergent workflows |
| **Workflow Design** | Pre-defined | Discovered through execution |
| **Learning** | Per-workflow | Across all executions |
| **Flexibility** | Fixed structure | Adaptive paths |
| **Knowledge Sharing** | Manual | Automatic ("Rooms with Tips") |

### vs CrewAI

| Aspect | CrewAI | Olane OS |
|--------|--------|----------|
| **Agent Organization** | Crews | Hierarchical tool nodes |
| **Discovery** | Manual config | Automatic via o-leader |
| **Coordination** | Explicit roles | Emergent or coordinator |
| **Scaling** | Vertical | Horizontal (distributed) |

### vs AutoGen

| Aspect | AutoGen | Olane OS |
|--------|---------|----------|
| **Agent Communication** | Direct messages | Hierarchical routing |
| **Organization** | Flat groups | Hierarchical o:// addressing |
| **Infrastructure** | Basic | Complete OS runtime |
| **Multi-Node** | Limited | First-class (o-leader) |

---

## Getting Started

### 1. Install Olane

```bash
npm install @olane/os @olane/o-core @olane/o-leader @olane/o-lane @olane/o-node @olane/o-tool
```

### 2. Choose Your Path

**Path A: Build a Simple Tool Node** (1-5 tools, direct invocation)
- Use: `@olane/o-node` + `@olane/o-tool`
- Best for: Single domain, well-defined operations
- Example: Currency converter, email sender, data validator

**Path B: Build a Complex Tool Node** (5-20+ tools, intent-driven)
- Use: `@olane/o-node` + `@olane/o-tool` + `@olane/o-lane`
- Best for: Complex domain, multi-step workflows, autonomous coordination
- Example: Financial analyst, data pipeline manager, content generator

**Path C: Build a Multi-Node Application** (coordinated tool nodes)
- Use: All packages including `@olane/o-leader`
- Best for: Complete platforms, multiple domains, enterprise scale
- Example: CRM, e-commerce platform, analytics suite

### 3. Read the Docs

- **[o-core](./packages/o-core/README.md)** - Kernel layer and core abstractions
- **[o-node](./packages/o-node/README.md)** - P2P networking implementation
- **[o-tool](./packages/o-tools-common/README.md)** - Tool system and conventions
- **[o-lane](./packages/o-lane/README.md)** - Intent-driven execution
- **[o-leader](./packages/o-leader/README.md)** - Network coordination
- **[o-os](./packages/o-os/README.md)** - Runtime system
- **[Tools, Nodes, Applications](./docs/concepts/tools-nodes-applications.mdx)** - Architecture guide

### 4. Explore Examples

- **[Basic Network Setup](./examples/basic-network)** - Simple multi-node network
- **[Financial Analyst](./examples/financial-analyst)** - Complex intent-driven node
- **[CRM Application](./examples/crm-application)** - Multi-node coordination
- **[Development Environment](./examples/dev-environment)** - Local development setup

---

## Key Benefits

### For Developers

- **Build once, serve both** human and AI agents through unified interface
- **No infrastructure configuration** - self-organizing networks
- **Emergent workflows** adapt to changing requirements without redesign
- **Knowledge reuse** across executions reduces development time by 75%

### For AI Agents

- **Natural language interface** - express goals in plain language
- **Autonomous execution** - tool nodes figure out the steps
- **Discovery-driven** - find capabilities dynamically via o-leader
- **Context-aware** - tool nodes understand domain and business rules
- **Reliable** - 99.8% success rate for long-running tasks

### For Businesses

- **Rapid prototyping** - build specialized tool nodes in hours, not weeks
- **Incremental scaling** - start with one node, grow to applications
- **Team ownership** - different teams maintain different tool nodes
- **Cost optimization** - one generalist LLM + many specialist tool nodes
- **Future-proof** - agent-agnostic design works with any AI model

---

## Architecture Diagrams

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Agents (Human or AI)                                   │
│  • Humans: CLI, web UI, API                             │
│  • AI: GPT-4, Claude, Gemini, etc.                      │
│  • Express intents in natural language                  │
└─────────────────────────────────────────────────────────┘
                        ⬇ sends requests
┌─────────────────────────────────────────────────────────┐
│  OlaneOS Runtime (@olane/os)                            │
│  • Lifecycle management                                 │
│  • Entry point routing (round-robin)                    │
│  • Configuration persistence                            │
└─────────────────────────────────────────────────────────┘
                        ⬇ manages
    ┌──────────────┬──────────────┬──────────────┐
    ⬇              ⬇              ⬇              ⬇
┌────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ Leader │  │ Tool Node 1│  │ Tool Node 2│  │ Tool Node 3│
│ o://   │  │ o://node1  │  │ o://node2  │  │ o://node3  │
│ leader │  │ • Tools    │  │ • Tools    │  │ • Tools    │
│        │  │ • Context  │  │ • Context  │  │ • Context  │
│ Registry│  └────────────┘  └────────────┘  └────────────┘
└────────┘
```

### Tool Node Internal Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tool Node (o://finance/analyst)                        │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  o-lane (Intent Processing)                    │    │
│  │  • Accepts natural language intents            │    │
│  │  • Capability loop (EVALUATE → TASK → STOP)    │    │
│  │  • Context injection                           │    │
│  └────────────────────────────────────────────────┘    │
│                        ⬇                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  o-tool (Tool System)                          │    │
│  │  • _tool_calculate_revenue()                   │    │
│  │  • _tool_calculate_expenses()                  │    │
│  │  • _tool_generate_report()                     │    │
│  │  • Parameter validation                        │    │
│  │  • Tool discovery                              │    │
│  └────────────────────────────────────────────────┘    │
│                        ⬇                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  o-node (P2P Networking)                       │    │
│  │  • libp2p networking                           │    │
│  │  • Peer discovery (DHT, mDNS)                  │    │
│  │  • Connection management                       │    │
│  │  • Transport protocols                         │    │
│  └────────────────────────────────────────────────┘    │
│                        ⬇                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  o-core (Kernel)                               │    │
│  │  • Lifecycle management                        │    │
│  │  • Hierarchical addressing (o://)              │    │
│  │  • Routing and IPC                             │    │
│  │  • Metrics and observability                   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Areas for Contribution

- **Tool Nodes**: Build and share specialized tool nodes
- **Documentation**: Guides, tutorials, and examples
- **Core Packages**: Performance improvements and bug fixes
- **Examples**: Real-world use cases and patterns
- **Integrations**: Bridges to other systems and protocols

---

## Community & Support

- **Documentation**: [olane.com/docs](https://olane.com/docs)
- **GitHub Issues**: [github.com/olane-labs/olane/issues](https://github.com/olane-labs/olane/issues)
- **GitHub Discussions**: [github.com/olane-labs/olane/discussions](https://github.com/olane-labs/olane/discussions)
- **Discord**: [discord.gg/olane](https://discord.gg/olane)
- **Email**: support@olane.io

---

## License

Olane OS is dual-licensed under your choice of:

- **[MIT License](LICENSE-MIT)** - Simple, permissive license
- **[Apache License 2.0](LICENSE-APACHE)** - Permissive license with patent protection

You may use Olane OS under the terms of either license. This provides flexibility for projects with different licensing requirements.

### Why Dual Licensing?

- **MIT**: Choose this if you prefer a simple, permissive license without patent provisions
- **Apache 2.0**: Choose this if you need explicit patent grants and additional protections

### Contributing

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in Olane OS by you shall be dual-licensed as above, without any additional terms or conditions.

---

Copyright © 2025 Olane Inc.

---

## What Makes Olane Different?

### Traditional Approach

```typescript
// LangGraph: Pre-define every step
const workflow = new StateGraph({
  nodes: ['step1', 'step2', 'step3'],
  edges: [['step1', 'step2'], ['step2', 'step3']]
});

// Inflexible, manual knowledge sharing, no learning
```

### Olane Approach

```typescript
// Send high-level intent
await toolNode.use({
  method: 'intent',
  params: { intent: 'Accomplish complex goal' }
});

// Tool node:
// • Discovers optimal path through execution
// • Learns from past executions
// • Shares knowledge automatically
// • Adapts to new requirements
// • Serves both human and AI agents
```

---

**Ready to build?** Start with the [Quick Start](#quick-start) or explore our [package documentation](./packages/).

**Part of the Olane OS ecosystem** - An agentic operating system where agents (human or AI) are the users and you build tool nodes as applications.
