# Use Case Quickstart Template

**Purpose**: Working example users can complete in < 30 minutes  
**Location**: `use-cases/{category}/quickstart.mdx`  
**Example**: `use-cases/specialist-agents/quickstart.mdx`

---

## Template

```mdx
---
title: "Build Your First Specialist Agent"
description: "Create a financial analyst agent in 30 minutes"
---

## What you'll learn

By the end of this guide, you'll have:
- A working specialist agent with domain-specific tools
- Understanding of tool augmentation and context injection
- Ability to test and validate agent behavior
- Foundation to build production agents

## Prerequisites

<Check>Node.js 18+ installed</Check>
<Check>Basic TypeScript knowledge</Check>
<Check>OpenAI API key (or similar LLM provider)</Check>

**Time estimate**: 30 minutes

## Step 1: Install packages

Install the required Olane packages:

```bash
npm install @olane/o-node @olane/o-tool @olane/o-lane
```

<AccordionGroup>
  <Accordion title="What do these packages do?">
    - **o-node**: Provides networking and agent runtime
    - **o-tool**: Convention-based tool system
    - **o-lane**: Intent-driven execution and context injection
  </Accordion>
</AccordionGroup>

## Step 2: Create base agent class

Create a new file `financial-agent.ts`:

<CodeGroup>
```typescript financial-agent.ts
import { oNodeTool } from '@olane/o-tool';
import { oAddress } from '@olane/o-core';

export class FinancialAgent extends oNodeTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      name: 'Financial Analyst',
      description: 'Specialist agent for financial analysis'
    });
  }
}
```

```javascript financial-agent.js
const { oNodeTool } = require('@olane/o-tool');
const { oAddress } = require('@olane/o-core');

class FinancialAgent extends oNodeTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      name: 'Financial Analyst',
      description: 'Specialist agent for financial analysis'
    });
  }
}

module.exports = { FinancialAgent };
```
</CodeGroup>

### Validate Step 2

The class extends `oNodeTool` which combines:
- `oNode`: Network connectivity
- `oTool`: Tool system capabilities

<Check>Agent has hierarchical address (`o://company/finance/analyst`)</Check>
<Check>Agent inherits from `oNodeTool`</Check>

## Step 3: Add domain-specific tools

Add methods to perform financial analysis:

```typescript financial-agent.ts
export class FinancialAgent extends oNodeTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      name: 'Financial Analyst',
      description: 'Specialist agent for financial analysis'
    });
  }

  // Tool method - prefix with _tool_
  async _tool_analyze_revenue(request: oRequest): Promise<any> {
    const { quarter, year, data } = request.params;
    
    // Domain logic
    const revenue = this.calculateRevenue(data);
    const growth = this.calculateGrowth(data);
    const forecast = this.forecastNextQuarter(data);
    
    return {
      quarter,
      year,
      revenue,
      growth,
      forecast,
      analysis: `Revenue for Q${quarter} ${year}: $${revenue}M (${growth}% growth)`
    };
  }

  // Parameter validation - prefix with _params_
  _params_analyze_revenue() {
    return {
      quarter: { 
        type: 'number', 
        required: true,
        description: 'Quarter number (1-4)'
      },
      year: { 
        type: 'number', 
        required: true,
        description: 'Year (e.g., 2024)'
      },
      data: {
        type: 'object',
        required: true,
        description: 'Revenue data object'
      }
    };
  }

  // Helper methods (private - no prefix)
  private calculateRevenue(data: any): number {
    // Your domain logic here
    return data.transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  private calculateGrowth(data: any): number {
    // Growth calculation logic
    return ((data.current - data.previous) / data.previous) * 100;
  }

  private forecastNextQuarter(data: any): number {
    // Forecasting logic
    return data.current * 1.15; // Simple 15% growth assumption
  }
}
```

### Validate Step 3

<Check>Tool method has `_tool_` prefix</Check>
<Check>Parameter schema has `_params_` prefix with same name</Check>
<Check>Method returns structured data</Check>

**Test it**:

```typescript test.ts
const agent = new FinancialAgent();
await agent.start();

// Direct tool call
const result = await agent.use({
  method: 'analyze_revenue',
  params: {
    quarter: 4,
    year: 2024,
    data: {
      transactions: [
        { amount: 100000 },
        { amount: 250000 }
      ],
      current: 350000,
      previous: 280000
    }
  }
});

console.log(result);
// Expected: { quarter: 4, year: 2024, revenue: 350000, growth: 25, ... }
```

## Step 4: Add context injection

Enable intent-driven execution with domain context:

```typescript financial-agent.ts
import { oLaneTool } from '@olane/o-lane';

export class FinancialAgent extends oLaneTool {  // Changed from oNodeTool
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      name: 'Financial Analyst',
      description: 'Specialist agent for financial analysis',
      
      // Domain context injection
      laneContext: {
        domain: 'Financial Analysis',
        expertise: [
          'Revenue analysis and forecasting',
          'Growth rate calculations',
          'Quarter-over-quarter comparisons',
          'Financial trend identification'
        ],
        guidelines: [
          'Always provide confidence intervals',
          'Flag anomalies in growth patterns',
          'Compare against industry benchmarks',
          'Include seasonal adjustments'
        ]
      }
    });
  }

  // ... rest of the code
}
```

### Validate Step 4

Now use the agent with natural language intents:

```typescript
const agent = new FinancialAgent();
await agent.start();

// Intent-driven execution
const result = await agent.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 2024 revenue and provide forecast for Q1 2025',
    context: 'Previous quarters showed 15-20% growth. Consider holiday season impact.'
  }
});

// Agent autonomously:
// 1. Evaluates the intent
// 2. Determines it needs revenue data
// 3. Calls analyze_revenue tool
// 4. Applies domain context and guidelines
// 5. Generates comprehensive analysis with forecast
```

<Check>Agent uses domain context in responses</Check>
<Check>Agent follows specified guidelines</Check>
<Check>Intent resolves to tool calls</Check>

## Step 5: Deploy and test

Start the agent and test with various scenarios:

```typescript index.ts
import { FinancialAgent } from './financial-agent';

async function main() {
  const agent = new FinancialAgent();
  
  // Start agent
  await agent.start();
  console.log(`Agent running at ${agent.address.toString()}`);

  // Test Case 1: Direct tool call
  console.log('\n=== Test 1: Direct Tool Call ===');
  const directResult = await agent.use({
    method: 'analyze_revenue',
    params: {
      quarter: 4,
      year: 2024,
      data: { /* ... */ }
    }
  });
  console.log(directResult);

  // Test Case 2: Intent-driven execution
  console.log('\n=== Test 2: Intent-Driven ===');
  const intentResult = await agent.use({
    method: 'intent',
    params: {
      intent: 'Compare Q3 and Q4 revenue and explain differences'
    }
  });
  console.log(intentResult);

  // Test Case 3: Complex multi-step intent
  console.log('\n=== Test 3: Complex Analysis ===');
  const complexResult = await agent.use({
    method: 'intent',
    params: {
      intent: 'Analyze full year 2024 revenue trends and forecast 2025 Q1-Q2'
    }
  });
  console.log(complexResult);
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node index.ts
```

**Expected output**:
```
Agent running at o://company/finance/analyst
=== Test 1: Direct Tool Call ===
{ quarter: 4, year: 2024, revenue: 350000, growth: 25, ... }

=== Test 2: Intent-Driven ===
Based on the analysis, Q4 revenue increased by 25% compared to Q3...

=== Test 3: Complex Analysis ===
Full year analysis shows consistent growth trajectory...
```

## What you built

<CardGroup cols={2}>
  <Card title="Specialist Agent" icon="robot">
    Domain-expert agent without fine-tuning
  </Card>
  <Card title="Domain Tools" icon="wrench">
    Convention-based methods for financial analysis
  </Card>
  <Card title="Context Injection" icon="brain">
    Domain knowledge automatically applied
  </Card>
  <Card title="Intent Execution" icon="wand-magic-sparkles">
    Natural language → autonomous actions
  </Card>
</CardGroup>

## Next steps

<CardGroup cols={3}>
  <Card title="Tool Augmentation" icon="wrench" href="/use-cases/specialist-agents/tool-augmentation">
    Advanced tool patterns
  </Card>
  <Card title="Testing" icon="flask" href="/use-cases/specialist-agents/testing">
    Test your agents
  </Card>
  <Card title="Production" icon="server" href="/use-cases/specialist-agents/production">
    Deploy to production
  </Card>
  <Card title="Multi-Agent" icon="users" href="/use-cases/multi-agent/overview">
    Coordinate multiple agents
  </Card>
  <Card title="Examples" icon="code" href="/examples">
    More examples
  </Card>
  <Card title="API Docs" icon="book" href="/api/tools">
    Full API reference
  </Card>
</CardGroup>

## Troubleshooting

<AccordionGroup>
  <Accordion title="Agent not responding to intents">
    **Solution**: Ensure you're using `oLaneTool` (not `oNodeTool`) and have configured `laneContext`.
    
    ```typescript
    // ✅ Correct
    class Agent extends oLaneTool { ... }
    
    // ❌ Won't support intents
    class Agent extends oNodeTool { ... }
    ```
  </Accordion>

  <Accordion title="Tools not being discovered">
    **Solution**: Check your method naming:
    - Tool methods must start with `_tool_`
    - Parameter schemas must start with `_params_` and match tool name
    
    ```typescript
    // ✅ Correct
    async _tool_analyze(req) { }
    _params_analyze() { }
    
    // ❌ Won't be discovered
    async analyze(req) { }
    ```
  </Accordion>

  <Accordion title="Parameter validation failing">
    **Solution**: Ensure parameter schemas match actual parameters:
    
    ```typescript
    _params_analyze() {
      return {
        quarter: { type: 'number', required: true },
        // ... match all expected params
      };
    }
    ```
  </Accordion>
</AccordionGroup>

## Related resources

- **Guide**: [Tool Augmentation Deep Dive](/use-cases/specialist-agents/tool-augmentation)
- **Guide**: [Context Injection Strategies](/use-cases/specialist-agents/context-injection)
- **Concept**: [Tool System](/concepts/tools/overview)
- **API**: [oTool Reference](/api/tools)
- **Example**: [Complete Financial Agent](/examples/specialist-agents/financial)
```

---

## Section Breakdown

### What you'll learn
- **3-5 bullet points** of concrete outcomes
- Focus on skills and deliverables
- Set clear expectations

### Prerequisites
- Use `<Check>` components
- List required software, knowledge, and credentials
- Include time estimate

### Steps (5-7 typical)
Each step should:
- Have a clear action title
- Include complete, working code
- Provide both TypeScript and JavaScript examples
- End with validation checkpoints

### Validation Points
- Use `<Check>` components after each major step
- Provide test code to verify the step worked
- Show expected outputs

### What you built
- **4 cards** summarizing accomplishments
- Match the "What you'll learn" promises
- Celebrate the achievement

### Next steps
- **6 cards** with clear progression paths
- Mix immediate next steps and advanced topics
- Use descriptive titles and icons

### Troubleshooting
- **3-5 accordions** with common issues
- Each includes problem description and solution
- Show code examples for fixes

---

## Best Practices

### Time-Boxed
- Keep to < 30 minutes for typical user
- Break longer tutorials into multiple quickstarts
- State time estimate upfront

### Progressive Complexity
1. Install/setup
2. Basic implementation
3. Add features
4. Test/validate
5. Deploy

### Validation at Every Step
```typescript
// After implementing
const result = await agent.use(...);
console.log(result);
// Expected: { ... }
```

### Show Expected Output
Always include what users should see:
```
Expected output:
Agent running at o://company/finance/analyst
{ quarter: 4, revenue: 350000, ... }
```

### Both Languages
Provide TypeScript and JavaScript:
```typescript
<CodeGroup>
  ```typescript file.ts
  // TS version
  ```
  
  ```javascript file.js
  // JS version
  ```
</CodeGroup>
```

