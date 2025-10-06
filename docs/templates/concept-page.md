# Concept Page Template

**Purpose**: Explain fundamental concepts and how they work  
**Location**: `concepts/{area}/{topic}.mdx`

---

## Template

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

## Section Breakdown

### Overview
- **1-2 sentences** explaining the concept at high level
- Focus on WHAT it is, not implementation details
- Use plain language

### The problem
- **4 cards** showing pain points of alternative approaches
- Use red/warning colors for problems
- Include concrete impacts (time, cost, complexity)

### How Olane solves this
- **Visual diagram** (ASCII art or code comments)
- Show architecture clearly
- Label key components

### Core components
- **2-4 subsections** breaking down the concept
- Each with code example
- Progressive from simple to complex

### Comparison
- **Table format** showing tradeoffs
- Include metrics and numbers
- Be objective about when NOT to use this approach

### Real-world example
- **Concrete scenario** with actual numbers
- Show before/after comparison
- Calculate savings/benefits

### Implementation
- **Complete code example** showing the concept in action
- Use `<CodeGroup>` for language variants
- Keep focused on the concept, not boilerplate

---

## Best Practices

### Explain the "Why"
Start with the problem being solved:
```markdown
## The problem with X
[Pain points]

## How Y solves this
[Solution]
```

### Use Visuals
- ASCII diagrams for architecture
- Tables for comparisons
- Cards for multiple related points

### Be Concrete
✅ "$10K-$100K per model"  
❌ "Expensive"

✅ "2-4 weeks to deploy"  
❌ "Slow"

### Show Tradeoffs
Don't oversell. Include when NOT to use:
```markdown
### Use Fine-Tuning When:
- Ultra-low latency required
- Specific domain jargon
```

### Real Examples
Include actual scenarios with calculations:
```markdown
Traditional: $250K + 15 weeks
Olane: $2.5K + 1 week
Savings: $247.5K and 14 weeks
```

