# Documentation Page Templates

> Following Stripe's best practices for developer documentation

## Template Categories

1. [Use Case Overview Pages](#use-case-overview-template)
2. [Use Case Quickstart Pages](#use-case-quickstart-template)
3. [Testing Pages](#testing-page-template)
4. [Concept Pages](#concept-page-template)
5. [API Reference Pages](#api-reference-template)
6. [Migration Guide Pages](#migration-guide-template)

---

## Use Case Overview Template

**Purpose**: Business-first landing page that explains WHAT you can build and WHY
**Location**: `use-cases/{category}/overview.mdx`
**Example**: `use-cases/specialist-agents/overview.mdx`

```mdx
---
title: "Build Specialist Agents"
description: "Create domain-expert AI agents without fine-tuning, reducing costs by 70-90%"
---

## What you'll build

Create AI agents specialized for specific domains (finance, customer service, data analysis) by augmenting a generalist LLM with domain-specific tools and context, without expensive fine-tuning.

## Why use specialist agents

<CardGroup cols={2}>
  <Card title="70-90% Cost Reduction" icon="dollar-sign">
    One generalist model serves all agents instead of fine-tuning separate models
  </Card>
  <Card title="Faster Development" icon="rocket">
    Deploy new specialists in hours, not weeks
  </Card>
  <Card title="Easy Updates" icon="refresh">
    Update tools and context without retraining models
  </Card>
  <Card title="Better Results" icon="chart-line">
    Combine latest LLM reasoning with domain expertise
  </Card>
</CardGroup>

## Common use cases

- **Financial Analysis**: Market research, revenue forecasting, risk assessment
- **Customer Service**: Ticket routing, response generation, escalation handling
- **Data Processing**: ETL pipelines, data validation, anomaly detection
- **Content Generation**: Technical writing, report creation, documentation

## How it works

<Steps>
  <Step title="Start with generalist LLM">
    Use GPT-4, Claude, or any powerful reasoning model as the "brain"
  </Step>
  <Step title="Add domain tools">
    Create methods prefixed with `_tool_` that provide domain-specific capabilities
  </Step>
  <Step title="Inject context">
    Provide domain knowledge through context injection in the capability loop
  </Step>
  <Step title="Deploy specialist">
    Agent automatically combines reasoning + tools + context for expert behavior
  </Step>
</Steps>

## Architecture overview

```typescript
// Generalist Model (GPT-4, Claude, etc.)
//           ↓ serves all agents
// ┌──────────────────────────────────────┐
// │  Specialist Agent                    │
// │  - Domain tools (capabilities)       │
// │  - Domain context (knowledge)        │
// │  - Hierarchical position (inherited) │
// └──────────────────────────────────────┘
```

## Quick comparison

| Traditional Approach | Specialist Agents |
|---------------------|-------------------|
| Fine-tune model for each domain | One model + domain tools |
| Weeks of training | Hours to deploy |
| $10K-$100K per model | $100-$1K per agent |
| Hard to update | Update tools instantly |
| Static knowledge | Dynamic learning |

## Next steps

<CardGroup cols={2}>
  <Card title="30-Minute Quickstart" icon="bolt" href="/use-cases/specialist-agents/quickstart">
    Build your first specialist agent
  </Card>
  <Card title="Tool Augmentation" icon="wrench" href="/use-cases/specialist-agents/tool-augmentation">
    Learn the tool system
  </Card>
  <Card title="Context Injection" icon="brain" href="/use-cases/specialist-agents/context-injection">
    Add domain knowledge
  </Card>
  <Card title="Production Guide" icon="server" href="/use-cases/specialist-agents/production">
    Deploy to production
  </Card>
</CardGroup>

## Related resources

- **Concept**: [Generalist vs Specialist Architecture](/concepts/generalist-vs-specialist)
- **API**: [oTool Reference](/api/tools)
- **Example**: [Financial Analyst Agent](/examples/specialist-agents/financial)
- **Guide**: [Cost Optimization](/guides/cost-optimization)
```

---

## Use Case Quickstart Template

**Purpose**: Working example users can complete in < 30 minutes
**Location**: `use-cases/{category}/quickstart.mdx`
**Example**: `use-cases/specialist-agents/quickstart.mdx`

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

## Testing Page Template

**Purpose**: Show how to test specific functionality with integrated examples
**Location**: `use-cases/{category}/testing.mdx` or `dev/testing-{area}.mdx`

```mdx
---
title: "Testing Specialist Agents"
description: "Validate agent behavior, tools, and context injection"
---

## Testing strategy

Specialist agents should be tested at three levels:

<CardGroup cols={3}>
  <Card title="Unit Tests" icon="flask">
    Individual tool methods
  </Card>
  <Card title="Integration Tests" icon="puzzle-piece">
    Agent + intent execution
  </Card>
  <Card title="End-to-End Tests" icon="route">
    Full workflows
  </Card>
</CardGroup>

## Unit testing tools

Test individual tool methods in isolation:

<CodeGroup>
```typescript test/tools.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import { FinancialAgent } from '../src/financial-agent';
import { oRequest } from '@olane/o-protocol';

describe('FinancialAgent Tools', () => {
  let agent: FinancialAgent;

  beforeAll(async () => {
    agent = new FinancialAgent();
    await agent.start();
  });

  it('should analyze revenue correctly', async () => {
    const request = new oRequest({
      method: 'analyze_revenue',
      params: {
        quarter: 4,
        year: 2024,
        data: {
          transactions: [{ amount: 100000 }, { amount: 250000 }],
          current: 350000,
          previous: 280000
        }
      }
    });

    const result = await agent._tool_analyze_revenue(request);

    expect(result.revenue).toBe(350000);
    expect(result.growth).toBeCloseTo(25, 1);
    expect(result.forecast).toBeGreaterThan(350000);
  });

  it('should validate parameters', async () => {
    const schema = agent._params_analyze_revenue();
    
    expect(schema.quarter.required).toBe(true);
    expect(schema.year.required).toBe(true);
    expect(schema.data.required).toBe(true);
  });

  it('should handle missing data gracefully', async () => {
    const request = new oRequest({
      method: 'analyze_revenue',
      params: {
        quarter: 4,
        year: 2024
        // Missing data parameter
      }
    });

    await expect(
      agent._tool_analyze_revenue(request)
    ).rejects.toThrow('Missing required parameter: data');
  });
});
```

```javascript test/tools.test.js
const { describe, it, expect, beforeAll } = require('@jest/globals');
const { FinancialAgent } = require('../src/financial-agent');
const { oRequest } = require('@olane/o-protocol');

describe('FinancialAgent Tools', () => {
  let agent;

  beforeAll(async () => {
    agent = new FinancialAgent();
    await agent.start();
  });

  it('should analyze revenue correctly', async () => {
    const request = new oRequest({
      method: 'analyze_revenue',
      params: {
        quarter: 4,
        year: 2024,
        data: {
          transactions: [{ amount: 100000 }, { amount: 250000 }],
          current: 350000,
          previous: 280000
        }
      }
    });

    const result = await agent._tool_analyze_revenue(request);

    expect(result.revenue).toBe(350000);
    expect(result.growth).toBeCloseTo(25, 1);
  });
});
```
</CodeGroup>

**Run tests**:
```bash
npm test
```

**Expected output**:
```
✓ should analyze revenue correctly (45ms)
✓ should validate parameters (12ms)
✓ should handle missing data gracefully (23ms)
```

## Integration testing with intents

Test intent-driven execution:

```typescript test/intents.test.ts
import { describe, it, expect } from '@jest/globals';
import { FinancialAgent } from '../src/financial-agent';

describe('Intent Execution', () => {
  let agent: FinancialAgent;

  beforeAll(async () => {
    agent = new FinancialAgent();
    await agent.start();
  });

  it('should resolve simple revenue analysis intent', async () => {
    const result = await agent.use({
      method: 'intent',
      params: {
        intent: 'Analyze Q4 2024 revenue',
        context: 'Use test data: revenue $350K, previous $280K'
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toContain('$350');
    expect(result.data).toContain('25%'); // Growth rate
  });

  it('should use domain context in responses', async () => {
    const result = await agent.use({
      method: 'intent',
      params: {
        intent: 'Forecast next quarter revenue'
      }
    });

    // Should follow guidelines from laneContext
    expect(result.data).toContain('confidence'); // Guideline: provide confidence intervals
    expect(result.data).toMatch(/\d+%.*\d+%/); // Should have range
  });

  it('should handle multi-step intents', async () => {
    const result = await agent.use({
      method: 'intent',
      params: {
        intent: 'Compare Q3 and Q4 revenue, then forecast Q1 2025'
      }
    });

    expect(result.success).toBe(true);
    // Check that multiple capabilities were executed
    expect(result.sequence.length).toBeGreaterThan(2);
  });
});
```

## Testing with mock data

Create reusable test fixtures:

```typescript test/fixtures.ts
export const mockRevenueData = {
  q3_2024: {
    quarter: 3,
    year: 2024,
    data: {
      transactions: [
        { amount: 80000, date: '2024-07-15' },
        { amount: 120000, date: '2024-08-20' },
        { amount: 80000, date: '2024-09-10' }
      ],
      current: 280000,
      previous: 240000
    }
  },
  q4_2024: {
    quarter: 4,
    year: 2024,
    data: {
      transactions: [
        { amount: 100000, date: '2024-10-15' },
        { amount: 150000, date: '2024-11-20' },
        { amount: 100000, date: '2024-12-10' }
      ],
      current: 350000,
      previous: 280000
    }
  }
};

export const expectedResults = {
  q4_growth: 25, // (350-280)/280 * 100
  q1_forecast: 402500, // 350000 * 1.15
};
```

Use in tests:

```typescript test/tools.test.ts
import { mockRevenueData, expectedResults } from './fixtures';

it('should match expected growth rate', async () => {
  const result = await agent._tool_analyze_revenue(
    new oRequest({
      method: 'analyze_revenue',
      params: mockRevenueData.q4_2024
    })
  );

  expect(result.growth).toBeCloseTo(expectedResults.q4_growth, 1);
});
```

## End-to-end testing

Test complete workflows:

```typescript test/e2e.test.ts
describe('End-to-End: Annual Analysis', () => {
  it('should perform full year analysis', async () => {
    const agent = new FinancialAgent();
    await agent.start();

    // Step 1: Analyze each quarter
    const quarters = [];
    for (let q = 1; q <= 4; q++) {
      const result = await agent.use({
        method: 'analyze_revenue',
        params: mockRevenueData[`q${q}_2024`]
      });
      quarters.push(result);
    }

    // Step 2: Generate annual summary
    const summary = await agent.use({
      method: 'intent',
      params: {
        intent: 'Summarize 2024 performance and forecast 2025',
        context: JSON.stringify(quarters)
      }
    });

    // Validate complete workflow
    expect(summary.success).toBe(true);
    expect(summary.data).toContain('2024');
    expect(summary.data).toContain('2025');
    expect(quarters).toHaveLength(4);
  });
});
```

## Performance testing

Monitor agent response times:

```typescript test/performance.test.ts
describe('Performance', () => {
  it('should respond to tool calls within 2 seconds', async () => {
    const start = Date.now();
    
    await agent.use({
      method: 'analyze_revenue',
      params: mockRevenueData.q4_2024
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map((_, i) =>
      agent.use({
        method: 'analyze_revenue',
        params: mockRevenueData.q4_2024
      })
    );

    const results = await Promise.all(requests);
    
    expect(results).toHaveLength(10);
    results.forEach(r => expect(r.success).toBe(true));
  });
});
```

## Testing best practices

<AccordionGroup>
  <Accordion title="Use realistic test data">
    ```typescript
    // ✅ Good: Realistic data
    const testData = {
      revenue: 350000,
      transactions: [/* real transaction structure */]
    };

    // ❌ Bad: Unrealistic data
    const testData = {
      revenue: 1,
      transactions: []
    };
    ```
  </Accordion>

  <Accordion title="Test error conditions">
    ```typescript
    it('should handle invalid quarter', async () => {
      await expect(
        agent._tool_analyze_revenue(new oRequest({
          method: 'analyze_revenue',
          params: { quarter: 5 } // Invalid
        }))
      ).rejects.toThrow('Quarter must be 1-4');
    });
    ```
  </Accordion>

  <Accordion title="Test context application">
    ```typescript
    it('should apply domain guidelines', async () => {
      const result = await agent.use({
        method: 'intent',
        params: { intent: 'Analyze revenue' }
      });

      // Check that guidelines from laneContext are followed
      expect(result.data).toContain('confidence interval');
      expect(result.data).toMatch(/\d+%.*to.*\d+%/);
    });
    ```
  </Accordion>
</AccordionGroup>

## Continuous testing

Add to your CI/CD pipeline:

```yaml .github/workflows/test.yml
name: Test Agents

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Next steps

<CardGroup cols={2}>
  <Card title="Debugging" icon="bug" href="/dev/debugging">
    Debug agent issues
  </Card>
  <Card title="Error Handling" icon="triangle-exclamation" href="/dev/error-handling">
    Handle errors gracefully
  </Card>
  <Card title="Production Testing" icon="server" href="/use-cases/specialist-agents/production">
    Test in production
  </Card>
  <Card title="Performance Profiling" icon="gauge" href="/dev/performance-profiling">
    Optimize performance
  </Card>
</CardGroup>

## Related resources

- **Guide**: [Testing Strategies Overview](/dev/testing-overview)
- **Guide**: [Testing Workflows](/dev/testing-workflows)
- **API**: [Error Codes](/api/error-codes)
```

---

## Concept Page Template

**Purpose**: Explain fundamental concepts and how they work
**Location**: `concepts/{area}/{topic}.mdx`

```mdx
---
title: "Generalist vs Specialist Architecture"
description: "How one LLM serves many specialized agents"
---

## Overview

The generalist-specialist architecture uses a single powerful reasoning model (GPT-4, Claude, etc.) to serve multiple domain-specialized agents, eliminating the need for expensive fine-tuning.

## The problem with traditional approaches

Traditional AI agent systems require separate fine-tuned models for each domain:

<CardGroup cols={2}>
  <Card title="High Cost" icon="dollar-sign" color="#ef4444">
    $10K-$100K per fine-tuned model
  </Card>
  <Card title="Slow Updates" icon="clock" color="#ef4444">
    Weeks to retrain for changes
  </Card>
  <Card title="Static Knowledge" icon="lock" color="#ef4444">
    Locked-in at training time
  </Card>
  <Card title="Hard to Maintain" icon="wrench" color="#ef4444">
    N models = N maintenance burdens
  </Card>
</CardGroup>

## How Olane solves this

```
┌─────────────────────────────────────────┐
│  Generalist Model (GPT-4, Claude, etc.) │
│  "The reasoning brain"                   │
│  - Complex reasoning                     │
│  - Natural language understanding        │
│  - General problem solving               │
└─────────────────────────────────────────┘
              ↓ serves all agents
┌─────────────────────────────────────────┐
│  Specialist Agents                      │
│  ├─ Financial Agent                     │
│  │  └─ Tools + Context                  │
│  ├─ Customer Service Agent              │
│  │  └─ Tools + Context                  │
│  └─ Data Analysis Agent                 │
│     └─ Tools + Context                  │
└─────────────────────────────────────────┘
```

## Three pillars of specialization

### 1. Tool Augmentation

Add domain-specific capabilities through tools:

```typescript
class FinancialAgent extends oLaneTool {
  // Financial analysis tools
  async _tool_analyze_revenue(req) { /* ... */ }
  async _tool_forecast_growth(req) { /* ... */ }
  async _tool_assess_risk(req) { /* ... */ }
}
```

### 2. Context Injection

Provide domain knowledge:

```typescript
{
  laneContext: {
    domain: 'Financial Analysis',
    expertise: [
      'Revenue analysis',
      'Growth forecasting',
      'Risk assessment'
    ],
    guidelines: [
      'Always provide confidence intervals',
      'Consider seasonal factors',
      'Flag anomalies'
    ]
  }
}
```

### 3. Hierarchical Positioning

Inherit organizational context:

```
o://company/finance/analyst
         ↑       ↑       ↑
      company finance analyst
      context context context
```

## Cost comparison

| Metric | Fine-Tuned Models | Generalist-Specialist |
|--------|-------------------|----------------------|
| Initial setup | $10K-$100K per model | $100-$1K per agent |
| Time to deploy | 2-4 weeks | 1-2 days |
| Update cost | Retrain ($10K+) | Update tools ($0) |
| Scaling cost | Linear per domain | Marginal per agent |
| **Total (10 agents)** | **$100K-$1M** | **$1K-$10K** |

<Check>70-90% cost reduction</Check>

## When to use each approach

### Use Fine-Tuning When:
- Ultra-low latency required (< 100ms)
- Very specific domain language/jargon
- Complete air-gapping needed
- You have massive training budgets

### Use Generalist-Specialist When:
- Cost is a concern (most cases)
- Need rapid iteration and updates
- Want to reuse reasoning across domains
- Building multiple specialist agents

## Real-world example

**Scenario**: Financial services company needs 5 specialist agents

### Traditional Approach (Fine-Tuned)
```
Financial Analysis Model: $50K + 3 weeks
Risk Assessment Model:    $50K + 3 weeks
Customer Service Model:   $50K + 3 weeks
Fraud Detection Model:    $50K + 3 weeks
Reporting Model:          $50K + 3 weeks
─────────────────────────────────────────
Total: $250K + 15 weeks
```

### Generalist-Specialist Approach
```
1 Generalist Model (GPT-4): $0 (API-based)
5 Specialist Agents:        $500 each
─────────────────────────────────────────
Total: $2.5K + 1 week
```

<Check>**Savings: $247.5K and 14 weeks**</Check>

## Architecture benefits

<AccordionGroup>
  <Accordion title="Shared Reasoning">
    All agents benefit from the generalist model's reasoning capabilities without duplication
  </Accordion>
  
  <Accordion title="Instant Updates">
    Update tools and context without retraining models
  </Accordion>
  
  <Accordion title="Knowledge Reuse">
    Agents can share knowledge artifacts through the network
  </Accordion>
  
  <Accordion title="Easy Scaling">
    Add new specialists by adding tools + context, no training required
  </Accordion>
</AccordionGroup>

## Implementation example

Complete specialist agent:

<CodeGroup>
```typescript Specialist Agent
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

class FinancialSpecialist extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      
      // Context specialization
      laneContext: {
        domain: 'Financial Analysis',
        expertise: ['Revenue analysis', 'Forecasting'],
        guidelines: ['Provide confidence intervals']
      }
    });
  }

  // Tool specialization
  async _tool_analyze_revenue(req) {
    // Domain-specific logic
    return { revenue, growth, forecast };
  }
  
  _params_analyze_revenue() {
    return {
      quarter: { type: 'number', required: true },
      year: { type: 'number', required: true }
    };
  }
}

// Use generalist model for reasoning
const agent = new FinancialSpecialist();
await agent.start();

// Natural language intent → specialized behavior
await agent.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 revenue and forecast Q1'
  }
});
```
</CodeGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Build Specialist Agent" icon="rocket" href="/use-cases/specialist-agents/quickstart">
    30-minute quickstart
  </Card>
  <Card title="Tool Augmentation" icon="wrench" href="/concepts/tools/overview">
    Learn the tool system
  </Card>
  <Card title="Context Injection" icon="brain" href="/concepts/lanes/context-injection">
    Add domain knowledge
  </Card>
  <Card title="Cost Optimization" icon="dollar-sign" href="/guides/cost-optimization">
    Optimize costs further
  </Card>
</CardGroup>

## Related resources

- **Use Case**: [Build Specialist Agents](/use-cases/specialist-agents/overview)
- **Concept**: [Emergent vs Explicit Orchestration](/concepts/emergent-vs-explicit)
- **Guide**: [Cost Optimization](/guides/cost-optimization)
- **API**: [oLaneTool Reference](/api/lanes)
```

---

## API Reference Template

**Purpose**: Complete technical reference with examples
**Location**: `api/{area}.mdx`

```mdx
---
title: "Tools API Reference"
description: "Complete reference for the oTool system"
---

## Overview

The `oTool` system provides convention-based tool registration, parameter validation, and discovery for specialist agents.

<Info>
  For a practical guide, see [Build Specialist Agents](/use-cases/specialist-agents/overview)
</Info>

## Classes

### oToolBase

Base class for creating tool-enabled agents.

```typescript
import { oToolBase } from '@olane/o-tool';

class MyTool extends oToolBase {
  async _tool_myMethod(request: oRequest): Promise<any> {
    // Tool implementation
  }
}
```

**Inheritance hierarchy**:
```
oCore (from @olane/o-core)
  ↓
oToolBase
  ↓
Your Tool Class
```

### oTool(BaseClass)

Mixin function to add tool capabilities to any class.

```typescript
import { oTool } from '@olane/o-tool';
import { oNode } from '@olane/o-node';

class MyAgent extends oTool(oNode) {
  // Now has both oNode networking + oTool capabilities
}
```

**Parameters**:

<ParamField path="BaseClass" type="class" required>
  Base class to augment with tool capabilities
</ParamField>

**Returns**: Extended class with tool system

### oNodeTool

Pre-built combination of `oNode` + `oTool`.

```typescript
import { oNodeTool } from '@olane/o-tool';

class MyAgent extends oNodeTool {
  // Has networking + tools
}
```

Equivalent to: `class MyAgent extends oTool(oNode) { }`

### oLaneTool

Pre-built combination of `oNode` + `oTool` + `oLane`.

```typescript
import { oLaneTool } from '@olane/o-lane';

class MyAgent extends oLaneTool {
  // Has networking + tools + intent execution
}
```

**Use when**: You need intent-driven execution with context injection

## Tool Convention

### Naming Convention

Tools use a prefix-based naming convention:

| Prefix | Purpose | Required |
|--------|---------|----------|
| `_tool_` | Executable tool method | Yes |
| `_params_` | Parameter schema | Recommended |
| `_description_` | Tool description | Optional |

### Tool Method

Define executable tool methods:

```typescript
async _tool_methodName(request: oRequest): Promise<any> {
  const { param1, param2 } = request.params;
  
  // Your logic here
  
  return {
    success: true,
    data: result
  };
}
```

**Parameters**:

<ParamField path="request" type="oRequest" required>
  Request object containing:
  - `method`: Tool method name (without `_tool_` prefix)
  - `params`: Method parameters
  - `id`: Request ID
  - `address`: Caller address
</ParamField>

**Returns**: Any JSON-serializable object

<CodeGroup>
```typescript Example: Basic Tool
async _tool_calculate(request: oRequest) {
  const { a, b, operation } = request.params;
  
  switch (operation) {
    case 'add': return { result: a + b };
    case 'multiply': return { result: a * b };
    default: throw new Error(`Unknown operation: ${operation}`);
  }
}
```

```typescript Example: Async Tool
async _tool_fetchData(request: oRequest) {
  const { url } = request.params;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    status: response.status,
    data
  };
}
```

```typescript Example: Tool with Validation
async _tool_processUser(request: oRequest) {
  const { userId, action } = request.params;
  
  // Manual validation
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }
  
  // Process
  const result = await this.performAction(userId, action);
  
  return { success: true, result };
}
```
</CodeGroup>

### Parameter Schema

Define parameter schemas for automatic validation:

```typescript
_params_methodName() {
  return {
    paramName: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array',
      required: boolean,
      description: string,
      default: any
    }
  };
}
```

<ParamField path="type" type="string" required>
  Parameter type: `string`, `number`, `boolean`, `object`, or `array`
</ParamField>

<ParamField path="required" type="boolean" default={false}>
  Whether parameter is required
</ParamField>

<ParamField path="description" type="string">
  Human-readable parameter description
</ParamField>

<ParamField path="default" type="any">
  Default value if not provided
</ParamField>

**Example**:

```typescript
_params_calculate() {
  return {
    a: {
      type: 'number',
      required: true,
      description: 'First operand'
    },
    b: {
      type: 'number',
      required: true,
      description: 'Second operand'
    },
    operation: {
      type: 'string',
      required: true,
      description: 'Operation to perform (add, multiply, etc.)'
    }
  };
}
```

### Tool Description

Provide tool descriptions for LLM context:

```typescript
_description_methodName() {
  return 'Human-readable description of what this tool does';
}
```

**Example**:

```typescript
_description_calculate() {
  return 'Performs mathematical calculations on two numbers. Supports add, subtract, multiply, and divide operations.';
}
```

## Built-in Tools

All tool-enabled agents include these built-in tools:

<AccordionGroup>
  <Accordion title="handshake">
    Negotiate capabilities between agents
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://other-agent',
      method: 'handshake'
    });
    ```
    
    **Returns**: Agent capabilities, available methods, and metadata
  </Accordion>

  <Accordion title="route">
    Route request to appropriate destination
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://target',
      method: 'route',
      params: {
        destination: 'o://final-destination',
        request: { /* forwarded request */ }
      }
    });
    ```
  </Accordion>

  <Accordion title="hello_world">
    Test connectivity
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://test-agent',
      method: 'hello_world'
    });
    ```
    
    **Returns**: `{ message: 'Hello from {address}' }`
  </Accordion>

  <Accordion title="stop">
    Gracefully shutdown agent
    
    **Usage**:
    ```typescript
    await agent.use({
      address: 'o://agent-to-stop',
      method: 'stop'
    });
    ```
  </Accordion>
</AccordionGroup>

## Tool Discovery

### Listing Tools

Get all available tools on an agent:

```typescript
const tools = await agent.listTools();

// Returns array of tool metadata
[
  {
    name: 'calculate',
    description: 'Performs mathematical calculations',
    parameters: {
      a: { type: 'number', required: true },
      b: { type: 'number', required: true }
    }
  },
  // ... more tools
]
```

### Tool Indexing

Index tools in vector store for semantic search:

```typescript
await agent.use({
  method: 'index_network',
  params: {
    vectorStore: yourVectorStore,
    includeTools: true
  }
});
```

### Searching Tools

Find tools by semantic meaning:

```typescript
const results = await vectorStore.search(
  'financial analysis tools'
);

// Returns relevant tools:
// - analyze_revenue
// - forecast_growth
// - assess_risk
```

## Error Handling

Tool methods should throw errors for invalid inputs:

```typescript
async _tool_divide(request: oRequest) {
  const { a, b } = request.params;
  
  if (b === 0) {
    throw new Error('Division by zero not allowed');
  }
  
  return { result: a / b };
}
```

Error response format:

<ResponseExample>
```json Error Response
{
  "jsonrpc": "2.0",
  "id": "req_123",
  "error": {
    "code": -32000,
    "message": "Division by zero not allowed",
    "data": {
      "method": "divide",
      "params": { "a": 10, "b": 0 }
    }
  }
}
```
</ResponseExample>

## Complete Example

Full implementation of a tool-enabled agent:

<CodeGroup>
```typescript Complete Example
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

export class CalculatorAgent extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://tools/calculator'),
      name: 'Calculator',
      description: 'Mathematical calculation agent'
    });
  }

  // Addition tool
  async _tool_add(request: oRequest) {
    const { a, b } = request.params;
    return { result: a + b, operation: 'addition' };
  }

  _params_add() {
    return {
      a: { type: 'number', required: true, description: 'First number' },
      b: { type: 'number', required: true, description: 'Second number' }
    };
  }

  _description_add() {
    return 'Adds two numbers together';
  }

  // Division tool
  async _tool_divide(request: oRequest) {
    const { a, b } = request.params;
    
    if (b === 0) {
      throw new Error('Division by zero not allowed');
    }
    
    return { 
      result: a / b, 
      operation: 'division',
      precision: 2 
    };
  }

  _params_divide() {
    return {
      a: { type: 'number', required: true },
      b: { type: 'number', required: true }
    };
  }

  _description_divide() {
    return 'Divides first number by second number. Throws error if divisor is zero.';
  }
}

// Usage
const calculator = new CalculatorAgent();
await calculator.start();

// Direct tool call
const sum = await calculator.use({
  method: 'add',
  params: { a: 5, b: 3 }
});
console.log(sum); // { result: 8, operation: 'addition' }

// Intent-driven
const result = await calculator.use({
  method: 'intent',
  params: {
    intent: 'Calculate 10 divided by 2'
  }
});
// Agent resolves intent → calls divide tool
```
</CodeGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Build Specialist Agent" icon="rocket" href="/use-cases/specialist-agents/quickstart">
    Create your first tool
  </Card>
  <Card title="Tool Concepts" icon="book" href="/concepts/tools/overview">
    Learn tool system
  </Card>
  <Card title="Parameter Validation" icon="check" href="/concepts/tools/parameter-validation">
    Advanced validation
  </Card>
  <Card title="Examples" icon="code" href="/examples">
    See more examples
  </Card>
</CardGroup>

## Related APIs

- [Agents API](/api/agents)
- [Lanes API](/api/lanes)
- [Communication API](/api/communication)
```

---

## Migration Guide Template

**Purpose**: Help users migrate from other frameworks
**Location**: `migration/from-{framework}.mdx`

```mdx
---
title: "Migrate from LangGraph"
description: "Transition from explicit workflows to emergent coordination"
---

## Overview

This guide helps you migrate from LangGraph's explicit state graphs to Olane's emergent, intent-driven coordination.

## Key differences

| LangGraph | Olane |
|-----------|-------|
| Pre-defined state graphs | Emergent workflows |
| Explicit edges and nodes | Capability loop |
| Procedural flow | Intent-driven |
| Single workflow execution | Persistent agent processes |
| State management required | Automatic state handling |

## Migration strategy

<Steps>
  <Step title="Identify workflows">
    List your LangGraph workflows and their purposes
  </Step>
  <Step title="Convert to intents">
    Transform workflow goals into natural language intents
  </Step>
  <Step title="Create specialist agents">
    Build agents with tools for each workflow domain
  </Step>
  <Step title="Test and refine">
    Validate emergent behavior matches expected outcomes
  </Step>
</Steps>

## Example migration

### Before: LangGraph

```python
from langgraph.graph import StateGraph

# Define state
class AgentState(TypedDict):
    input: str
    plan: List[str]
    results: List[Any]

# Define nodes
def create_plan(state):
    plan = planner.generate_plan(state["input"])
    return {"plan": plan}

def execute_step(state):
    step = state["plan"][0]
    result = executor.run(step)
    return {"results": state["results"] + [result]}

def check_completion(state):
    return len(state["plan"]) == len(state["results"])

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("plan", create_plan)
workflow.add_node("execute", execute_step)
workflow.add_edge("plan", "execute")
workflow.add_conditional_edges(
    "execute",
    check_completion,
    {
        True: END,
        False: "execute"
    }
)

# Run
result = workflow.invoke({"input": "Analyze Q4 revenue"})
```

### After: Olane

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

class AnalysisAgent extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://company/analyst'),
      laneContext: {
        domain: 'Analysis',
        expertise: ['Planning', 'Execution', 'Reporting']
      }
    });
  }

  async _tool_execute_analysis(request) {
    const { dataSource, period } = request.params;
    // Analysis logic
    return { results };
  }

  _params_execute_analysis() {
    return {
      dataSource: { type: 'string', required: true },
      period: { type: 'string', required: true }
    };
  }
}

// Use
const agent = new AnalysisAgent();
await agent.start();

const result = await agent.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 revenue'
  }
});

// Agent autonomously:
// 1. EVALUATE → Understand intent
// 2. TASK → Execute analysis tool
// 3. EVALUATE → Check if complete
// 4. STOP → Return results
```

## Migration patterns

### Pattern 1: Sequential Workflows

<Tabs>
  <Tab title="LangGraph">
    ```python
    workflow.add_edge("step1", "step2")
    workflow.add_edge("step2", "step3")
    ```
  </Tab>
  <Tab title="Olane">
    ```typescript
    // Emergent sequence through intent
    await agent.use({
      method: 'intent',
      params: {
        intent: 'Complete multi-step analysis'
      }
    });
    
    // Agent discovers optimal sequence
    ```
  </Tab>
</Tabs>

### Pattern 2: Conditional Logic

<Tabs>
  <Tab title="LangGraph">
    ```python
    workflow.add_conditional_edges(
      "check",
      condition_function,
      {True: "success", False: "retry"}
    )
    ```
  </Tab>
  <Tab title="Olane">
    ```typescript
    // Capability loop handles conditions
    async _tool_process_data(request) {
      const result = await this.process();
      
      if (!this.isValid(result)) {
        // Agent will retry through capability loop
        throw new Error('Validation failed, retry needed');
      }
      
      return result;
    }
    ```
  </Tab>
</Tabs>

### Pattern 3: Multi-Agent Coordination

<Tabs>
  <Tab title="LangGraph">
    ```python
    def router(state):
      if state["task_type"] == "analysis":
        return "analyst"
      elif state["task_type"] == "report":
        return "reporter"
    
    workflow.add_conditional_edges("router", router)
    ```
  </Tab>
  <Tab title="Olane">
    ```typescript
    // Automatic discovery and routing
    await coordinator.use({
      method: 'intent',
      params: {
        intent: 'Analyze data and create report'
      }
    });
    
    // Capability loop:
    // 1. SEARCH → Finds analyst agent
    // 2. TASK → Calls analyst
    // 3. SEARCH → Finds reporter agent
    // 4. TASK → Calls reporter
    ```
  </Tab>
</Tabs>

## State management

### LangGraph State

```python
class State(TypedDict):
    messages: List[Message]
    context: Dict
    step: int
```

### Olane State

State is automatically managed through:

1. **Lane sequences**: Execution history
2. **Context injection**: Domain knowledge
3. **Capability results**: Step outputs

```typescript
// Access execution history
const lane = await agent.getLane(laneId);
console.log(lane.sequence); // All execution steps

// State persists across capability cycles
```

## Testing comparison

<Tabs>
  <Tab title="LangGraph Testing">
    ```python
    def test_workflow():
      state = {"input": "test"}
      result = workflow.invoke(state)
      assert result["results"] == expected
    ```
  </Tab>
  <Tab title="Olane Testing">
    ```typescript
    it('should complete analysis', async () => {
      const result = await agent.use({
        method: 'intent',
        params: { intent: 'Analyze test data' }
      });
      
      expect(result.success).toBe(true);
      expect(result.sequence.length).toBeGreaterThan(0);
    });
    ```
  </Tab>
</Tabs>

## Common migration issues

<AccordionGroup>
  <Accordion title="Missing explicit control flow">
    **Issue**: LangGraph has explicit edges, Olane doesn't
    
    **Solution**: Trust the capability loop to discover optimal flow. Add constraints through context if needed:
    
    ```typescript
    laneContext: {
      guidelines: [
        'Always validate data before processing',
        'Create backup before modifications'
      ]
    }
    ```
  </Accordion>

  <Accordion title="State not preserved between steps">
    **Solution**: Use lane context or tool instance variables:
    
    ```typescript
    class MyAgent extends oLaneTool {
      private cache = new Map();
      
      async _tool_step1(req) {
        const result = await this.process();
        this.cache.set('step1', result);
        return result;
      }
      
      async _tool_step2(req) {
        const previousResult = this.cache.get('step1');
        // Use previous result
      }
    }
    ```
  </Accordion>

  <Accordion title="Need to enforce specific sequence">
    **Solution**: Create a single tool that orchestrates internally:
    
    ```typescript
    async _tool_complete_workflow(req) {
      const step1 = await this.doStep1();
      const step2 = await this.doStep2(step1);
      const step3 = await this.doStep3(step2);
      return { step1, step2, step3 };
    }
    ```
  </Accordion>
</AccordionGroup>

## Migration checklist

<Steps>
  <Step title="Audit existing workflows">
    <Check>List all LangGraph workflows</Check>
    <Check>Identify workflow purposes and goals</Check>
    <Check>Document current state management</Check>
  </Step>
  
  <Step title="Design Olane structure">
    <Check>Create specialist agents for each domain</Check>
    <Check>Define tools for each workflow step</Check>
    <Check>Plan context injection strategy</Check>
  </Step>
  
  <Step title="Implement and test">
    <Check>Build agents with tools</Check>
    <Check>Test with intents</Check>
    <Check>Validate emergent behavior</Check>
  </Step>
  
  <Step title="Deploy and monitor">
    <Check>Deploy specialist agents</Check>
    <Check>Monitor execution sequences</Check>
    <Check>Refine based on observed patterns</Check>
  </Step>
</Steps>

## Benefits after migration

<CardGroup cols={2}>
  <Card title="Adaptable Workflows" icon="shuffle">
    Workflows improve and adapt without code changes
  </Card>
  <Card title="Reduced Maintenance" icon="wrench">
    No explicit state graphs to maintain
  </Card>
  <Card title="Faster Development" icon="rocket">
    Describe intent instead of programming flow
  </Card>
  <Card title="Knowledge Reuse" icon="lightbulb">
    Agents learn from each other's executions
  </Card>
</CardGroup>

## Next steps

<CardGroup cols={2}>
  <Card title="Quickstart" icon="bolt" href="/quickstart">
    Build your first Olane agent
  </Card>
  <Card title="Specialist Agents" icon="user-gear" href="/use-cases/specialist-agents/overview">
    Create domain specialists
  </Card>
  <Card title="Emergent Workflows" icon="diagram-project" href="/concepts/emergent-vs-explicit">
    Understand emergent coordination
  </Card>
  <Card title="Examples" icon="code" href="/examples">
    See complete examples
  </Card>
</CardGroup>

## Need help?

<Card title="Migration Support" icon="headset" href="/support/community">
  Join our community for migration assistance
</Card>
```

---

## Usage Guidelines

### When to Use Each Template

1. **Use Case Overview**: First page of each use case section
2. **Use Case Quickstart**: Second page, complete working example
3. **Testing Page**: Show integrated testing for each use case
4. **Concept Page**: Explain fundamental ideas and architecture
5. **API Reference**: Complete technical documentation
6. **Migration Guide**: Help users transition from other tools

### Content Principles

<CardGroup cols={2}>
  <Card title="Business Value First" icon="chart-line">
    Lead with outcomes, not features
  </Card>
  <Card title="Progressive Disclosure" icon="layer-group">
    Overview → Quickstart → Deep Dive → Reference
  </Card>
  <Card title="Integrated Testing" icon="flask">
    Show testing with implementation, not separately
  </Card>
  <Card title="Working Examples" icon="code">
    All code must be copy-paste ready
  </Card>
</CardGroup>

### Cross-Linking Pattern

Every page should link to:
- Related use cases
- Relevant concepts
- API reference
- Examples
- Next steps

```mdx
## Related resources

- **Use Case**: [Build Specialist Agents](/use-cases/specialist-agents/overview)
- **Concept**: [Tool System](/concepts/tools/overview)
- **API**: [oTool Reference](/api/tools)
- **Example**: [Financial Analyst](/examples/specialist-agents/financial)
- **Guide**: [Testing](/dev/testing-overview)
```
