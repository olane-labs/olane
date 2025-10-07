# Tools, Nodes, and Applications: Understanding the Distinction

> **Purpose**: This document clarifies the nuanced differences between tools (methods), nodes (single processes), and applications (multiple nodes) in Olane OS. Use this to guide architectural decisions and documentation clarity.

**Last Updated**: October 1, 2025  
**Related Docs**: PACKAGE_ARCHITECTURE_CONTEXT.md, AGENT_TERMINOLOGY_GUIDE.md

---

## Table of Contents

1. [Terminology Hierarchy](#terminology-hierarchy)
2. [The Three Levels](#the-three-levels)
3. [Architectural Patterns](#architectural-patterns)
4. [Real-World Analogies](#real-world-analogies)
5. [When to Build What](#when-to-build-what)
6. [Application Composition Patterns](#application-composition-patterns)
7. [Documentation Guidelines](#documentation-guidelines)

---

## Terminology Hierarchy

### The Three Levels of Granularity

```
┌──────────────────────────────────────────────────────────┐
│  LEVEL 1: Tool                                           │
│  • Individual executable method                          │
│  • Convention: _tool_ prefix                             │
│  • Example: _tool_analyze_revenue()                      │
│  • Atomic operation                                      │
└──────────────────────────────────────────────────────────┘
                        ⬇ combined into
┌──────────────────────────────────────────────────────────┐
│  LEVEL 2: Node                                           │
│  • Process running on Olane OS                           │
│  • Contains one or more tools                            │
│  • Has an o:// address                                   │
│  • Example: o://company/finance/analyst                  │
│  • Single-purpose capability unit                        │
└──────────────────────────────────────────────────────────┘
                        ⬇ coordinated into
┌──────────────────────────────────────────────────────────┐
│  LEVEL 3: Application                                    │
│  • Multiple nodes working together                       │
│  • Coordinated via agents and o-leader                   │
│  • Complete business capability                          │
│  • Example: Full CRM system (sales + support + analytics)│
│  • Multi-purpose platform                                │
└──────────────────────────────────────────────────────────┘
```

### Key Definitions

| Term | Definition | Scope | Packages |
|------|------------|-------|----------|
| **Tool** | Individual executable method with `_tool_` prefix | Single function | o-tool |
| **Node** | Process containing tools, addressable via o:// | Single process | o-core + o-node + o-tool |
| **Simple Node** | Node with 1-5 related tools, single domain | Single capability | o-node + o-tool |
| **Complex Node** | Node with many tools, accepts intents | Single process with autonomy | o-node + o-tool + o-lane |
| **Application** | Multiple coordinated nodes | Multi-process system | o-leader + multiple nodes |

---

## The Three Levels

### Level 1: Tool

**What it is**: An individual executable method on a node.

**Characteristics**:
- Prefixed with `_tool_`
- Performs one specific operation
- Has parameter schema defined via oMethod definition files
- Discoverable via tool system
- Called directly by agents

**Example**:
```typescript
// financial.methods.ts - Define method schemas
import { oMethod } from '@olane/o-protocol';

const FINANCIAL_METHODS: { [key: string]: oMethod } = {
  calculate_revenue: {
    name: 'calculate_revenue',
    description: 'Calculate revenue for a date range',
    dependencies: [],
    parameters: [
      {
        name: 'startDate',
        type: 'string',
        value: 'string',
        description: 'Start date',
        required: true,
      },
      {
        name: 'endDate',
        type: 'string',
        value: 'string',
        description: 'End date',
        required: true,
      },
    ],
  },
};

class FinancialNode extends oNodeTool {
  constructor() {
    super({
      address: new oAddress('o://financial'),
      methods: FINANCIAL_METHODS,
    });
  }

  // This is a TOOL
  async _tool_calculate_revenue(request: oRequest) {
    const { startDate, endDate } = request.params;
    // Calculate revenue for date range
    return { revenue: 150000, currency: 'USD' };
  }
}
```

**Real-World Analogy**: A single function in a library (like `Array.map()` in JavaScript)

**Agent Interaction**:
```typescript
// Agent calls tool directly
const result = await financialNode.use({
  method: 'calculate_revenue',
  params: {
    startDate: '2024-01-01',
    endDate: '2024-03-31'
  }
});
```

---

### Level 2: Node

A process running on Olane OS that contains one or more related tools.

#### 2A: Simple Node

**What it is**: A focused, single-purpose node with a handful of related tools.

**Characteristics**:
- 1-5 related tools
- Single domain focus
- Stateless or simple state management
- Direct tool invocation
- No intent processing (agents call tools directly)
- Quick responses (< 30 seconds typically)

**Example**:
```typescript
// SIMPLE NODE: Currency converter
class CurrencyConverterNode extends oNodeTool {
  constructor() {
    super({
      address: new oAddress('o://utilities/currency-converter')
    });
  }

  // Tool 1: Convert currency
  async _tool_convert(request: oRequest) {
    const { amount, from, to } = request.params;
    const rate = await this.getExchangeRate(from, to);
    return { result: amount * rate, from, to };
  }

  // Tool 2: Get exchange rate
  async _tool_get_rate(request: oRequest) {
    const { from, to } = request.params;
    return { rate: await this.getExchangeRate(from, to) };
  }

  // Tool 3: List supported currencies
  async _tool_list_currencies(request: oRequest) {
    return { currencies: ['USD', 'EUR', 'GBP', 'JPY'] };
  }
}
```

**Real-World Analogy**: A microservice (like Stripe's payment processing service)

**When to Use**:
- Single, well-defined domain
- Tools are related and cohesive
- Agents know exactly which tool to call
- No complex multi-step workflows needed

---

#### 2B: Complex Node

**What it is**: An autonomous node that accepts natural language intents and coordinates its own tools.

**Characteristics**:
- Many tools (5-20+)
- Accepts intents from agents
- Uses o-lane for autonomous execution
- Can perform multi-step workflows
- Stateful execution context
- May run for extended periods
- Makes decisions about which tools to use

**Example**:
```typescript
// COMPLEX NODE: Financial analyst
class FinancialAnalystNode extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst')
    });
  }

  // Tool 1: Calculate revenue
  async _tool_calculate_revenue(request: oRequest) { /* ... */ }

  // Tool 2: Calculate expenses
  async _tool_calculate_expenses(request: oRequest) { /* ... */ }

  // Tool 3: Calculate profit margin
  async _tool_calculate_margin(request: oRequest) { /* ... */ }

  // Tool 4: Identify trends
  async _tool_identify_trends(request: oRequest) { /* ... */ }

  // Tool 5: Generate report
  async _tool_generate_report(request: oRequest) { /* ... */ }

  // ... 10 more tools
}

// Agent sends INTENT (not direct tool call)
const result = await analystNode.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 2024 financial performance and generate executive summary'
  }
});

// Node AUTONOMOUSLY:
// 1. EVALUATE: "I need revenue, expenses, and trends"
// 2. TASK: Call _tool_calculate_revenue
// 3. TASK: Call _tool_calculate_expenses
// 4. TASK: Call _tool_identify_trends
// 5. EVALUATE: "I have data, need to calculate margins"
// 6. TASK: Call _tool_calculate_margin
// 7. EVALUATE: "Ready to generate report"
// 8. TASK: Call _tool_generate_report
// 9. STOP: Return report to agent
```

**Real-World Analogy**: A complete service with its own intelligence (like GitHub Copilot - takes high-level intent, figures out the steps)

**When to Use**:
- Complex domain with many operations
- Agents shouldn't need to know all tools
- Multi-step workflows common
- Decision-making needed between steps
- Long-running operations

---

### Level 3: Application

**What it is**: Multiple nodes working together to provide a complete business capability.

**Characteristics**:
- 3+ coordinated nodes
- Each node has distinct responsibility
- Requires o-leader for discovery
- Agents coordinate between nodes
- Or: "coordinator" node orchestrates others
- Spans multiple domains
- Enterprise-scale capability

**Example**:
```typescript
// APPLICATION: Complete CRM Platform
// Composed of multiple nodes:

// Node 1: Customer Data Service
class CustomerDataNode extends oNodeTool {
  // o://crm/customers
  async _tool_get_customer(request) { /* ... */ }
  async _tool_update_customer(request) { /* ... */ }
  async _tool_search_customers(request) { /* ... */ }
}

// Node 2: Sales Pipeline Service
class SalesPipelineNode extends oNodeTool {
  // o://crm/sales
  async _tool_create_deal(request) { /* ... */ }
  async _tool_update_deal_stage(request) { /* ... */ }
  async _tool_forecast_revenue(request) { /* ... */ }
}

// Node 3: Support Ticket Service
class SupportTicketNode extends oNodeTool {
  // o://crm/support
  async _tool_create_ticket(request) { /* ... */ }
  async _tool_assign_ticket(request) { /* ... */ }
  async _tool_resolve_ticket(request) { /* ... */ }
}

// Node 4: Analytics Service
class CRMAnalyticsNode extends oLaneTool {
  // o://crm/analytics
  async _tool_customer_lifetime_value(request) { /* ... */ }
  async _tool_churn_analysis(request) { /* ... */ }
  async _tool_sales_performance(request) { /* ... */ }
}

// Node 5: CRM Coordinator (Optional)
class CRMCoordinatorNode extends oLaneTool {
  // o://crm/coordinator
  
  // Agents send intents to coordinator
  // Coordinator discovers and calls other nodes
}
```

**Agent Interaction Pattern 1: Direct Coordination**
```typescript
// Agent discovers and coordinates nodes directly

// Step 1: Search for customer
const customer = await customerDataNode.use({
  method: 'get_customer',
  params: { id: 'cust_123' }
});

// Step 2: Create support ticket
const ticket = await supportTicketNode.use({
  method: 'create_ticket',
  params: {
    customerId: customer.id,
    issue: 'Billing inquiry'
  }
});

// Step 3: Analyze customer value
const analysis = await analyticsNode.use({
  method: 'intent',
  params: {
    intent: `Analyze lifetime value and support history for customer ${customer.id}`
  }
});
```

**Agent Interaction Pattern 2: Coordinator-Based**
```typescript
// Agent sends intent to coordinator node
// Coordinator handles inter-tool-node communication

const result = await crmCoordinator.use({
  method: 'intent',
  params: {
    intent: 'Customer cust_123 has billing issue. Create ticket and provide context on their value and history.'
  }
});

// Coordinator AUTONOMOUSLY:
// 1. Searches registry for nodes (o-leader)
// 2. Calls o://crm/customers to get data
// 3. Calls o://crm/analytics to analyze value
// 4. Calls o://crm/support to create ticket with context
// 5. Returns comprehensive result to agent
```

**Real-World Analogy**: A complete platform like Salesforce (multiple services working together)

**When to Use**:
- Complete business capability spanning multiple domains
- Different teams own different nodes
- Tool nodes need independent scaling
- Clear separation of concerns
- Enterprise-scale requirements

---

## Architectural Patterns

### Pattern 1: Monolithic Node

```
┌─────────────────────────────────────┐
│   Single Node                       │
│   o://finance                       │
│                                     │
│   Tools:                            │
│   • calculate_revenue               │
│   • calculate_expenses              │
│   • generate_report                 │
│   • forecast_budget                 │
│   • analyze_trends                  │
│                                     │
│   All logic in one process          │
└─────────────────────────────────────┘
```

**Pros**:
- Simplest to build and deploy
- No network coordination overhead
- Consistent state management
- Fast inter-tool communication

**Cons**:
- Scaling limitations (all tools scale together)
- Tight coupling
- Single point of failure
- Can't distribute across teams

**Best For**: Small domains, single team ownership, early prototypes

---

### Pattern 2: Decomposed Application

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Node            │    │  Node            │    │  Node            │
│  o://fin/revenue │    │  o://fin/expense │    │  o://fin/report  │
│                  │    │                  │    │                  │
│  Tools:          │    │  Tools:          │    │  Tools:          │
│  • calculate     │    │  • calculate     │    │  • generate      │
│  • forecast      │    │  • categorize    │    │  • format        │
│                  │    │  • analyze       │    │  • distribute    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                    ⬆ Agent coordinates ⬆
```

**Pros**:
- Independent scaling
- Team ownership boundaries
- Fault isolation
- Technology diversity (different languages/tools)

**Cons**:
- Network coordination complexity
- Service discovery overhead
- Potential latency
- More deployment complexity

**Best For**: Large domains, multiple teams, scale requirements

---

### Pattern 3: Coordinator + Specialists

```
                    ┌──────────────────────────┐
                    │  Coordinator Node        │
                    │  o://finance/coordinator │
                    │  (accepts intents)       │
                    └──────────────────────────┘
                              ⬇ discovers & calls
        ┌──────────────────┬──────────────────┬──────────────────┐
        ⬇                  ⬇                  ⬇                  ⬇
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Revenue Node  │  │ Expense Node  │  │ Forecast Node │  │ Report Node   │
│ o://fin/rev   │  │ o://fin/exp   │  │ o://fin/fcst  │  │ o://fin/rpt   │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
```

**Pros**:
- Best of both worlds
- Agent only talks to coordinator
- Specialists can be simple nodes
- Clear separation of concerns
- Coordinator provides unified interface

**Cons**:
- Coordinator becomes complex
- Additional hop for every operation
- Coordinator can be bottleneck
- More infrastructure to manage

**Best For**: Complex domains with clear coordinator role, external API exposure

---

## Real-World Analogies

### Simple Node Examples

| Olane Node | Real-World Equivalent | Complexity |
|------------|----------------------|------------|
| Currency Converter | Unix utility (like `bc` calculator) | 🟢 Simple |
| Email Sender | SMTP service | 🟢 Simple |
| Data Validator | JSON Schema validator | 🟢 Simple |
| Rate Limiter | Redis rate limit service | 🟢 Simple |

### Complex Node Examples

| Olane Node | Real-World Equivalent | Complexity |
|------------|----------------------|------------|
| Financial Analyst | Bloomberg Terminal (single interface, many capabilities) | 🟡 Complex |
| Data Pipeline Manager | Apache Airflow DAG runner | 🟡 Complex |
| Content Generator | Adobe Creative Suite (one app, many tools) | 🟡 Complex |
| Security Scanner | Burp Suite (integrated security tools) | 🟡 Complex |

### Application Examples

| Olane Application | Real-World Equivalent | Complexity |
|-------------------|----------------------|------------|
| CRM Platform | Salesforce (multiple services) | 🔴 Application |
| E-commerce System | Shopify (inventory + payment + shipping + analytics) | 🔴 Application |
| DevOps Platform | AWS (EC2 + S3 + Lambda + RDS...) | 🔴 Application |
| Analytics Suite | Google Analytics 360 (collection + processing + reporting + ML) | 🔴 Application |

---

## When to Build What

### Decision Tree

```
Start: What are you building?
│
├─ Do you have ONE clear domain?
│  │
│  ├─ Are there 1-5 related operations?
│  │  └─ ✅ Build SIMPLE NODE
│  │
│  ├─ Are there 5-20+ operations?
│  │  │
│  │  ├─ Do agents know which tool to call?
│  │  │  └─ ✅ Build SIMPLE NODE (with many tools)
│  │  │
│  │  └─ Should it handle intents autonomously?
│  │     └─ ✅ Build COMPLEX NODE (with o-lane)
│  │
│  └─ Is the domain massive (20+ operations)?
│     └─ 🤔 Consider splitting into APPLICATION
│
└─ Do you have MULTIPLE domains?
   │
   ├─ Are they loosely related?
   │  └─ ✅ Build separate SIMPLE NODES
   │
   └─ Do they need tight coordination?
      │
      ├─ Can one domain coordinate the others?
      │  └─ ✅ Build APPLICATION with COORDINATOR pattern
      │
      └─ Are they equal peers?
         └─ ✅ Build APPLICATION with direct agent coordination
```

### Quick Reference Table

| Scenario | Build What | Packages | Coordination |
|----------|-----------|----------|--------------|
| 1-5 related tools, simple operations | Simple Node | o-node + o-tool | Direct tool calls |
| 5-20+ tools, agents call directly | Simple Node | o-node + o-tool | Direct tool calls |
| 5-20+ tools, intent-driven | Complex Node | o-node + o-tool + o-lane | Agent sends intents |
| Multiple domains, loose coupling | Multiple Simple Nodes | o-node + o-tool + o-leader | Agent discovers each |
| Multiple domains, tight coordination | Application with Coordinator | o-node + o-tool + o-lane + o-leader | Coordinator orchestrates |
| Enterprise platform, many teams | Application (distributed) | All packages | Agent or coordinator orchestrates |

---

## Application Composition Patterns

### Pattern A: Flat Discovery

**Structure**: All nodes register with leader, agents discover them directly.

```
                  ┌─────────────────┐
                  │   o://leader    │
                  │   (Registry)    │
                  └─────────────────┘
                         ⬆
                    registers with
         ┌──────────────┼──────────────┐
         ⬇              ⬇              ⬇
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Node A  │    │ Node B  │    │ Node C  │
    └─────────┘    └─────────────┘ └─────────┘
         ⬆              ⬆              ⬆
         └──────── Agent calls ────────┘
```

**When to Use**:
- Nodes are independent
- No complex dependencies
- Agent intelligence can coordinate
- Loose coupling preferred

**Example**:
```typescript
// Agent discovers nodes dynamically
const dataNode = await leader.search({ capability: 'data_collection' });
const analysisNode = await leader.search({ capability: 'analysis' });
const reportNode = await leader.search({ capability: 'reporting' });

// Agent coordinates directly
const data = await dataNode.use({ method: 'collect', params: {...} });
const insights = await analysisNode.use({ method: 'analyze', params: { data } });
const report = await reportNode.use({ method: 'generate', params: { insights } });
```

---

### Pattern B: Hierarchical Organization

**Structure**: Nodes organized in hierarchy, inherit context and capabilities.

```
                  o://company
                      │
        ┌─────────────┼─────────────┐
        ⬇                            ⬇
    o://company/finance      o://company/engineering
        │                            │
    ┌───┴───┐                    ┌───┴───┐
    ⬇       ⬇                    ⬇       ⬇
 revenue  expenses            backend  frontend
```

**When to Use**:
- Natural organizational hierarchy
- Context inheritance valuable
- Domain boundaries clear
- Multiple teams/departments

**Example**:
```typescript
// Finance nodes inherit company + finance context
// Engineering nodes inherit company + engineering context

const revenue = await oAddress.resolve('o://company/finance/revenue');
// Gets: company policies + finance regulations + revenue tools
```

---

### Pattern C: Coordinator + Workers

**Structure**: One coordinator node manages multiple worker nodes.

```
        Agent sends intent
              ⬇
    ┌───────────────────┐
    │   Coordinator     │  (Complex Node with o-lane)
    │   o://coordinator │
    └───────────────────┘
              ⬇ discovers & calls
      ┌───────┼───────┬───────┐
      ⬇       ⬇       ⬇       ⬇
   Worker1 Worker2 Worker3 Worker4  (Simple Nodes)
```

**When to Use**:
- Complex inter-node workflows
- Workers are simple, coordinator is smart
- Need unified API for external agents
- Cross-cutting concerns (auth, logging)

**Example**:
```typescript
// Coordinator is Complex Node (o-lane)
class CoordinatorNode extends oLaneTool {
  async _tool_execute_workflow(request: oRequest) {
    // Discovers and calls worker nodes
  }
}

// Workers are Simple Nodes
class WorkerNode extends oNodeTool {
  async _tool_do_specific_thing(request: oRequest) {
    // Focused operation
  }
}

// Agent interaction
const result = await coordinator.use({
  method: 'intent',
  params: {
    intent: 'Complete complex workflow across multiple workers'
  }
});
```

---

### Pattern D: Peer-to-Peer Federation

**Structure**: Nodes call each other directly, no central coordinator.

```
┌─────────┐     ┌─────────┐
│ Node A  │────▶│ Node B  │
│         │◀────│         │
└─────────┘     └─────────┘
     │  ⬆           │  ⬆
     ⬇  │           ⬇  │
┌─────────┐     ┌─────────┐
│ Node C  │────▶│ Node D  │
│         │◀────│         │
└─────────┘     └─────────┘
```

**When to Use**:
- Nodes are equal peers
- No natural coordinator
- High autonomy needed
- Emergent coordination preferred

**Example**:
```typescript
// Nodes discover and call each other
class AutonomousNode extends oLaneTool {
  async someOperation() {
    // Discover peer nodes
    const peers = await this.leader.search({ type: 'peer' });
    
    // Call peer nodes directly
    const results = await Promise.all(
      peers.map(peer => peer.use({ method: 'collaborate', params: {...} }))
    );
  }
}
```

---

## Documentation Guidelines

### How to Document Each Level

#### Documenting a Tool

**Template**:
```markdown
### `_tool_method_name`

**Description**: One-line description of what this tool does.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | string | Yes | What it is |

**Returns**:
```typescript
{
  result: string,
  metadata: object
}
```

**Example**:
```typescript
await node.use({
  method: 'method_name',
  params: { param1: 'value' }
});
```
```

---

#### Documenting a Simple Node

**Template**:
```markdown
# [Node Name]

**Address**: `o://path/to/node`  
**Type**: Simple Node  
**Domain**: [Domain name]

## Overview

One paragraph describing what this node does and when to use it.

## Tools

### Available Operations

1. **[tool_name_1]** - Brief description
2. **[tool_name_2]** - Brief description
3. **[tool_name_3]** - Brief description

## Installation

```bash
npm install @your-org/tool-node
```

## Quick Start

```typescript
import { Node } from '@your-org/node';

const node = new Node({
  address: new oAddress('o://path/to/node')
});

await node.start();

// Call a tool
const result = await node.use({
  method: 'tool_name',
  params: { /* ... */ }
});
```

## API Reference

[Link to detailed tool documentation]

## Examples

### Example 1: Common Use Case
```typescript
// Code example
```

### Example 2: Another Use Case
```typescript
// Code example
```
```

---

#### Documenting a Complex Node

**Template**:
```markdown
# [Node Name]

**Address**: `o://path/to/node`  
**Type**: Complex Node (Intent-Driven)  
**Domain**: [Domain name]  
**Requires**: o-lane

## Overview

One paragraph describing what this node does and its autonomous capabilities.

## Capabilities

This node accepts natural language intents and autonomously coordinates its tools to fulfill them.

### Supported Intents

- "Intent example 1"
- "Intent example 2"
- "Intent example 3"

### Internal Tools

This node uses the following tools internally:

1. **[tool_1]** - Description
2. **[tool_2]** - Description
3. **[tool_3]** - Description

## Installation

```bash
npm install @your-org/complex-node
```

## Quick Start

```typescript
import { ComplexNode } from '@your-org/complex-node';

const node = new ComplexNode({
  address: new oAddress('o://path/to/node')
});

await node.start();

// Send intent
const result = await node.use({
  method: 'intent',
  params: {
    intent: 'Natural language goal',
    context: 'Optional context'
  }
});
```

## How It Works

Explain the capability loop and autonomous decision-making.

## Intent Examples

### Example 1: [Use Case]
```typescript
const result = await node.use({
  method: 'intent',
  params: {
    intent: 'Specific goal description'
  }
});

// The node autonomously:
// 1. Evaluates intent
// 2. Calls tool_a
// 3. Calls tool_b
// 4. Generates result
```

### Example 2: [Another Use Case]
```typescript
// Another intent example
```

## Advanced Usage

### Streaming Progress
### Custom Context
### Error Handling

## API Reference

[Link to detailed documentation]
```

---

#### Documenting an Application

**Template**:
```markdown
# [Application Name]

**Type**: Multi-Node Application  
**Architecture**: [Pattern name - e.g., "Coordinator + Workers"]  
**Domain**: [Business domain]

## Overview

One paragraph describing what this application provides and its business value.

## Architecture

### Node Components

This application consists of the following nodes:

| Node | Address | Type | Purpose |
|------|---------|------|---------|
| [Name 1] | o://path/1 | Simple | Description |
| [Name 2] | o://path/2 | Complex | Description |
| [Name 3] | o://path/3 | Simple | Description |
| [Coordinator] | o://path/coordinator | Complex | Description |

### Architecture Diagram

```
[Visual diagram showing node relationships]
```

### Coordination Pattern

Explain how nodes discover and communicate with each other.

## Installation

### Option 1: Individual Nodes

```bash
npm install @your-org/node-1
npm install @your-org/node-2
npm install @your-org/node-3
```

### Option 2: Complete Application

```bash
npm install @your-org/complete-application
```

## Quick Start

### Starting the Application

```typescript
// Start leader
const leader = new oLeaderNode({
  address: new oAddress('o://leader')
});
await leader.start();

// Start all nodes
const nodes = await startApplication({
  leader: leaderAddress
});
```

### Using the Application

#### Via Coordinator
```typescript
const result = await coordinator.use({
  method: 'intent',
  params: {
    intent: 'High-level business goal'
  }
});
```

#### Via Direct Node Access
```typescript
// Discover specific node
const node = await leader.search({ address: 'o://path/to/node' });

// Call directly
const result = await node.use({
  method: 'tool_name',
  params: { /* ... */ }
});
```

## Use Cases

### Use Case 1: [Business Scenario]
Explain workflow across multiple nodes

### Use Case 2: [Another Scenario]
Explain another workflow

## Node Reference

Link to individual node documentation

## Deployment

### Development
### Production
### Scaling Considerations

## Monitoring & Observability

How to monitor the complete application

## Troubleshooting

Common issues and resolutions
```

---

## Summary: The Key Distinctions

### Quick Reference

| Aspect | Tool | Simple Node | Complex Node | Application |
|--------|------|-------------|--------------|-------------|
| **Granularity** | Single function | Single process | Single process | Multiple processes |
| **Addressable** | No (method on node) | Yes (o:// address) | Yes (o:// address) | Yes (multiple o:// addresses) |
| **Tools Count** | N/A (is a tool) | 1-5 | 5-20+ | Varies (across nodes) |
| **Intelligence** | None (just executes) | None (direct calls) | Autonomous (o-lane) | Coordinated (agents + leader) |
| **Invocation** | Direct method call | Direct tool call | Intent or tool call | Intent to coordinator or discovery + calls |
| **Packages** | o-tool | o-node + o-tool | o-node + o-tool + o-lane | o-leader + multiple nodes |
| **Complexity** | 🟢 Simple | 🟢 Simple | 🟡 Medium | 🔴 Complex |
| **Examples** | `calculate()` | Currency converter | Financial analyst | Complete CRM |
| **Scope** | One operation | One capability | One domain | Multiple domains |
| **Coordination** | N/A | None | Internal (capability loop) | External (agents/coordinator) |

### Mental Model

Think of it like software architecture:

- **Tool** = A function
- **Simple Node** = A microservice with a few endpoints
- **Complex Node** = A microservice with its own intelligence/agent
- **Application** = A complete platform (multiple microservices)

### Documentation Tip

Always clarify which level you're documenting:

- ✅ "This node provides currency conversion capabilities" (Level 2)
- ✅ "The CRM application consists of four coordinated nodes" (Level 3)
- ❌ "This tool converts currencies" (Ambiguous - tool or node?)

---

**Last Updated**: October 1, 2025  
**Applies To**: All Olane OS documentation  
**Status**: Active guideline for architectural decisions and documentation

