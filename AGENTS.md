# Agents in Olane OS

Agents (human or AI) are the users of Olane OS. This guide helps you build agent-agnostic tool nodes that serve both through a unified natural language interface.

## Core concept

In Olane OS, **agents** are Layer 1 (users) - either **human** (via CLI/web) or **AI** (GPT-4, Claude, etc.). Tool nodes accept natural language intents from any agent type through the same interface.

```typescript
// Same tool node serves both agent types
const result = await toolNode.use({
  method: 'intent',
  params: { intent: 'Analyze Q4 sales trends' }
});

// Human: $ olane intent "Analyze Q4 sales trends"
// AI: Sends request programmatically
// Tool node: Processes identically regardless of source
```

## Building agent-agnostic tool nodes

### Key principles

- **Source-agnostic**: Tool nodes don't know or care if the request came from a human or AI
- **Natural language interface**: Accept intents in plain language, not rigid API parameters
- **Structured results**: Return JSON-serializable data that both humans and AI can consume
- **Progressive disclosure**: Support both simple direct calls and complex intent-driven workflows

### Quick start

1. Install packages:
   ```bash
   npm install @olane/os @olane/o-core @olane/o-lane @olane/o-tool @olane/o-node
   ```

2. Define method schemas in separate file (enables validation and AI discovery):
   ```typescript
   // methods/analytics.methods.ts
   import { oMethod } from '@olane/o-protocol';
   
   export const ANALYTICS_METHODS: { [key: string]: oMethod } = {
     get_customers: {
       name: 'get_customers',
       description: 'Retrieve customer data with optional filters',
       dependencies: [],
       parameters: [
         {
           name: 'filters',
           type: 'object',
           value: 'object',
           description: 'Optional filters for customer query',
           required: false
         }
       ]
     },
     calculate_ltv: {
       name: 'calculate_ltv',
       description: 'Calculate customer lifetime value',
       dependencies: [],
       parameters: [
         {
           name: 'customerId',
           type: 'string',
           value: 'string',
           description: 'Customer ID',
           required: true
         }
       ]
     }
   };
   ```

3. Create tool node (choose based on complexity):

   **Simple node (1-5 tools)** - Direct invocation:
   ```typescript
   import { oNodeTool } from '@olane/o-tool';
   import { oAddress, oRequest } from '@olane/o-core';
   
   class CurrencyConverter extends oNodeTool {
     constructor() {
       super({
         address: new oAddress('o://utilities/currency'),
         methods: CURRENCY_METHODS
       });
     }
     
     async _tool_convert(request: oRequest) {
       const { amount, from, to } = request.params;
       return { converted: amount * rate, rate };
     }
   }
   ```

   **Complex node (5-20+ tools)** - Intent-driven:
   ```typescript
   import { oLaneTool } from '@olane/o-lane';
   
   class CustomerAnalytics extends oLaneTool {
     constructor() {
       super({
         address: new oAddress('o://analytics/customers'),
         methods: ANALYTICS_METHODS,
         laneContext: {
           domain: 'Customer Analytics',
           expertise: ['Churn Analysis', 'LTV', 'Segmentation']
         }
       });
     }
     
     async _tool_get_customers(request: oRequest) {
       return { customers: await this.fetchCustomers(request.params.filters) };
     }
     
     async _tool_calculate_ltv(request: oRequest) {
       return { ltv: await this.calculateLTV(request.params.customerId) };
     }
     
     // Intent method automatically available via o-lane
     // Agents send: "Find high-value customers at risk of churning"
     // Node autonomously determines which tools to use
   }
   ```

4. Start the node:
   ```typescript
   const analytics = new CustomerAnalytics();
   await analytics.start();
   ```

5. *Optional*: Extend with MCP integration to add external tools (see [Extending with MCP integration](#extending-with-mcp-integration))

### Usage patterns

**Human agents:**
```bash
# Direct tool call
$ olane call o://analytics/customers get_customers --filters '{"status": "active"}'

# Intent-driven (complex workflows)
$ olane intent "Find high-value customers at risk of churning"
```

**AI agents:**
```typescript
// Direct tool call
const customers = await analytics.use({
  method: 'get_customers',
  params: { filters: { status: 'active' } }
});

// Intent-driven (complex workflows)
const result = await analytics.use({
  method: 'intent',
  params: {
    intent: 'Find high-value customers at risk of churning',
    context: 'Focus on accounts > $50k LTV'
  }
});

// AI uses results for further coordination
for (const customer of result.atRiskCustomers) {
  await crmTool.use({
    method: 'create_retention_task',
    params: { customerId: customer.id }
  });
}
```

## Design patterns

### ❌ Anti-pattern: Source-aware processing

```typescript
// DON'T: Different logic based on agent type
class BadToolNode extends oLaneTool {
  async _tool_intent(request: oRequest) {
    if (request.source === 'human') {
      return this.processForHuman(request);
    } else {
      return this.processForAI(request);
    }
  }
}
```

### ✅ Pattern: Source-agnostic processing

```typescript
// DO: Same logic for all agents
class GoodToolNode extends oLaneTool {
  async _tool_intent(request: oRequest) {
    return await this.processIntent(request.params.intent);
  }
}
```

### ✅ Pattern: Structured, actionable results

```typescript
async _tool_analyze_churn(request: oRequest) {
  return {
    // Summary metrics
    summary: {
      totalCustomers: 1000,
      atRisk: 150,
      riskRate: 0.15
    },
    // Detailed data with recommendations
    customers: [
      {
        id: 'cust_123',
        riskScore: 0.85,
        recommendedAction: {
          type: 'immediate_outreach',
          priority: 'high'
        }
      }
    ],
    // Metadata
    analysis: {
      timestamp: Date.now(),
      confidence: 0.92
    }
  };
}
```

### ✅ Pattern: Graceful error handling

```typescript
async _tool_process_payment(request: oRequest) {
  try {
    return {
      success: true,
      transactionId: 'txn_123'
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PAYMENT_FAILED',
        message: 'Unable to process payment',
        retryable: true,
        suggestedAction: 'Retry with same card'
      }
    };
  }
}
```

## Real-world examples

### Customer support system

Tool node serves both human support reps and AI triage agents.

```typescript
class CustomerSupport extends oLaneTool {
  async _tool_get_customer(request: oRequest) {
    const { customerId } = request.params;
    return {
      customer: await this.fetchCustomer(customerId),
      recentTickets: await this.fetchTickets(customerId)
    };
  }

  async _tool_create_ticket(request: oRequest) {
    const { customerId, issue, priority } = request.params;
    return {
      ticketId: await this.createTicket(customerId, issue, priority)
    };
  }
}

// Human support rep (manual):
// $ olane call o://support get_customer --customerId "cust_123"

// AI triage agent (automated):
// Monitors emails, analyzes sentiment, creates tickets automatically
```

### Financial reporting

Tool node serves both human analysts and AI monitoring agents.

```typescript
class FinancialReporting extends oLaneTool {
  async _tool_get_revenue(request: oRequest) {
    return { revenue: await this.calculateRevenue() };
  }

  async _tool_generate_report(request: oRequest) {
    return { report: await this.generateReport() };
  }
}

// Human analyst (on-demand):
// Dashboard: "Generate Q4 financial report with YoY comparison"

// AI monitoring agent (automated daily):
// Runs daily analysis, flags anomalies, alerts humans when needed
```

### Data pipeline orchestration

Tool node serves both data engineers and AI coordinators.

```typescript
class DataPipeline extends oLaneTool {
  async _tool_extract(request: oRequest) { /* ... */ }
  async _tool_transform(request: oRequest) { /* ... */ }
  async _tool_validate(request: oRequest) { /* ... */ }
  async _tool_load(request: oRequest) { /* ... */ }
}

// Data engineer (manual testing):
// $ olane intent "Run customer data ETL for 2024-10-01 with validation"

// AI orchestrator (automated daily):
// Discovers pipelines, executes in dependency order, handles failures
```

## Common adoption patterns

### Progressive human → AI adoption

```typescript
// Phase 1: Build for humans
class SalesAnalytics extends oNodeTool {
  async _tool_get_revenue(request: oRequest) { 
    return { revenue: await this.calculateRevenue() };
  }
}
// Humans use via web UI

// Phase 2: Add intent support
class SalesAnalytics extends oLaneTool { // Just upgrade to oLaneTool
  async _tool_get_revenue(request: oRequest) { 
    return { revenue: await this.calculateRevenue() };
  }
  // Intent method automatically available
}

// Phase 3: AI agents discover and use
// NO CODE CHANGES NEEDED - AI agents can now discover and use
```

### Human-in-the-loop AI coordination

```typescript
// AI analyzes, human approves critical decisions
class SmartOrderProcessor {
  async processOrder(order: Order) {
    const analysis = await orderTool.use({
      method: 'analyze_order',
      params: { orderId: order.id }
    });
    
    if (analysis.needsApproval) {
      const decision = await this.requestHumanReview(analysis);
      if (decision.approved) {
        await orderTool.use({
          method: 'approve_order',
          params: { orderId: order.id }
        });
      }
    } else {
      await this.processAutomatically(order);
    }
  }
}
```

### Hybrid expertise (human strategy + AI execution)

```typescript
// Human provides constraints, AI executes within them
const humanStrategy = {
  budgetLimit: 50000,
  requiredVendors: ['VendorA', 'VendorB'],
  priorities: ['cost', 'quality']
};

const result = await procurementTool.use({
  method: 'intent',
  params: {
    intent: 'Optimize procurement across vendors',
    context: JSON.stringify(humanStrategy)
  }
});
// AI proposes solution, human makes final decision
```

## Extending with MCP integration

Bridge external [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers into your Olane network as agent-agnostic tool nodes using `@olane/o-mcp`.

### What is MCP integration?

MCP servers become discoverable tool nodes that agents (human or AI) can use through the same `o://` addressing. No code changes needed - just add the MCP server and it becomes available.

```typescript
import { McpBridgeTool } from '@olane/o-mcp';
import { oAddress } from '@olane/o-core';

// Create MCP bridge
const bridge = new McpBridgeTool({
  address: new oAddress('o://mcp')
});

await bridge.start();

// Add GitHub MCP server
await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://github-mcp.example.com',
    name: 'github',
    description: 'GitHub repository management',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`
    }
  }
});

// Now both human and AI agents can use GitHub tools
// Human: $ olane call o://github list_repositories --org "olane-labs"
// AI: await bridge.use(new oAddress('o://github'), { method: 'list_repositories', params: { org: 'olane-labs' } })
```

### Why MCP integration matters

- **Instant ecosystem access**: Use thousands of existing MCP servers without modification
- **Agent-agnostic**: MCP tools work identically for human and AI agents
- **Intent preservation**: Execution context flows through MCP boundaries
- **Network discovery**: MCP tools indexed and searchable like native Olane tools

### Quick MCP examples

**Add local filesystem MCP:**
```typescript
await bridge.use({
  method: 'add_local_server',
  params: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/documents'],
    name: 'documents'
  }
});

// Both agents can now access filesystem
// Human: $ olane call o://documents read_file --path "/documents/notes.txt"
// AI: Autonomously reads files when needed for tasks
```

**Intent-driven MCP discovery:**
```typescript
// Agent sends high-level intent
await bridge.use({
  method: 'intent',
  params: {
    intent: 'I need GitHub integration. Find and add the GitHub MCP server.'
  }
});

// Bridge autonomously:
// 1. Searches for GitHub MCP
// 2. Validates the URL
// 3. Adds server to network
// 4. Returns confirmation
```

**Multi-MCP coordination:**
```typescript
// Add multiple MCPs for research workflow
await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://arxiv-mcp.example.com',
    name: 'arxiv',
    description: 'Academic paper search'
  }
});

await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://wikipedia-mcp.example.com',
    name: 'wikipedia',
    description: 'Wikipedia summaries'
  }
});

// Agent coordinates across multiple MCPs
// "Research quantum computing papers from 2024, get Wikipedia context, and summarize findings"
// Bridge autonomously uses arxiv, wikipedia, and filesystem MCPs
```

### MCP best practices

1. **Name consistently**: Use lowercase snake_case for MCP server names (e.g., `github`, `slack`, `filesystem`)
2. **Validate before adding**: Use `validate_url` to check MCP servers before connecting
3. **Secure credentials**: Pass authentication headers in `add_remote_server` params
4. **Test with both agents**: Verify MCP tools work for human CLI and AI programmatic usage

### Learn more

- [`@olane/o-mcp` Package](./packages/o-mcp/README.md) - Full MCP bridge documentation
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) - Available MCP servers

## Testing

Test with both agent types to ensure true agent-agnostic behavior:

```typescript
import { describe, it, expect } from 'vitest';

describe('CustomerAnalytics - Agent-Agnostic', () => {
  let toolNode: CustomerAnalytics;

  beforeEach(async () => {
    toolNode = new CustomerAnalytics();
    await toolNode.start();
  });

  it('should handle direct tool calls from any agent', async () => {
    const result = await toolNode.use({
      method: 'get_customers',
      params: { filters: { status: 'active' } }
    });
    expect(result.customers).toBeDefined();
  });

  it('should handle intents from any agent', async () => {
    const result = await toolNode.use({
      method: 'intent',
      params: { intent: 'Find high-value customers at risk of churning' }
    });
    expect(result.atRiskCustomers).toBeDefined();
  });

  it('should return JSON-serializable results', async () => {
    const result = await toolNode.use({
      method: 'get_customers',
      params: {}
    });
    const serialized = JSON.stringify(result);
    expect(JSON.parse(serialized)).toEqual(result);
  });

  it('should validate parameters consistently', async () => {
    await expect(
      toolNode.use({
        method: 'calculate_ltv',
        params: {} // Missing required customerId
      })
    ).rejects.toThrow();
  });

  it('should return structured errors', async () => {
    const result = await toolNode.use({
      method: 'get_customers',
      params: { filters: { invalidField: 'test' } }
    });
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.code).toBeDefined();
    }
  });
});
```

## Troubleshooting

### "Intent not understood"
- **Cause**: Ambiguous intent or missing capability
- **Fix**: Add more context or implement missing tools
  ```typescript
  // ❌ Too vague
  { intent: 'Analyze data' }
  
  // ✅ Clear with context
  { 
    intent: 'Analyze customer churn data for Q4 2024',
    context: 'Focus on high-value accounts > $50k'
  }
  ```

### "Method not found"
- **Cause**: Calling non-existent tool
- **Fix**: Check available methods
  ```bash
  $ olane describe o://analytics/customers
  # Or programmatically:
  const methods = await toolNode.getMethods();
  ```

### Results not rendering in UI
- **Cause**: Non-serializable results (circular refs, functions)
- **Fix**: Return plain data objects
  ```typescript
  // ❌ BAD
  return { data: this, process: () => {} };
  
  // ✅ GOOD
  return { data: { id: 1 }, timestamp: Date.now() };
  ```

## Why agent-agnostic design matters

| Traditional Approach | Olane OS Approach |
|---------------------|-------------------|
| Separate interfaces for humans and AI | Unified natural language interface |
| 2x maintenance (human + AI code) | 1x maintenance (same code) |
| Feature parity requires coordination | Guaranteed (same implementation) |
| AI adoption requires refactoring | Add AI without changes |
| Interfaces often diverge | Always consistent |

## Migration checklist

- [ ] Identify code that handles human vs AI differently
- [ ] Design unified intent-based interface for both
- [ ] Upgrade to `oLaneTool` for complex nodes (5+ tools)
- [ ] Ensure all results are JSON-serializable
- [ ] Define oMethod schemas in separate definition files
- [ ] Test with both human CLI and AI programmatic usage
- [ ] Document examples for both agent types

## Benefits

- **Build once**: One interface serves both human and AI agents
- **Future-proof**: Works today with humans, scales with AI adoption
- **Consistent**: Guaranteed feature parity between interfaces
- **Maintainable**: Update once, improvements benefit all agents
- **Scalable**: Add AI capabilities without refactoring human workflows
- **Testable**: Test once for both usage patterns

## Related documentation

- [Getting Started Guide](./docs/getting-started/installation.mdx) - Setup tutorial
- [Agent-Agnostic Design](./docs/agents/agent-agnostic-design.mdx) - Deep dive
- [Building Tool Nodes](./docs/guides/building-tool-nodes.mdx) - Step-by-step guide
- [Core Concepts](./docs/concepts/overview.mdx) - Architecture overview
- [o-lane Package](./packages/o-lane/README.md) - Intent-driven execution
- [o-mcp Package](./packages/o-mcp/README.md) - MCP integration for external tools
- [Examples](./examples/) - Real-world implementations

---

*This file follows the [AGENTS.md specification](https://github.com/openai/agents.md) - a simple, open format for guiding coding agents.*



<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors


<!-- nx configuration end-->