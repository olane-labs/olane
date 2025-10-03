# Use Case Overview Template

**Purpose**: Business-first landing page that explains WHAT you can build and WHY  
**Location**: `use-cases/{category}/overview.mdx`  
**Example**: `use-cases/specialist-agents/overview.mdx`

---

## Template

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

## Section Breakdown

### Title & Description (Front Matter)
- **Title**: Action-oriented, clear benefit
- **Description**: One-line value proposition with concrete metric

### What you'll build
- **1-2 sentences** explaining the outcome
- Focus on WHAT they create, not HOW
- Use concrete domain examples

### Why use [this approach]
- **4 cards** highlighting key benefits
- Use icons and metrics
- Focus on business value (cost, time, quality)

### Common use cases
- **3-5 bullet points** with real-world examples
- Use bold for category, plain text for specifics
- Cover diverse domains

### How it works
- **4 high-level steps** using `<Steps>` component
- Each step is conceptual, not code
- Progressive from foundation to deployment

### Architecture overview
- Simple ASCII diagram or TypeScript comment diagram
- Show relationships, not implementation details
- Keep visual and easy to understand

### Quick comparison
- **Table format** comparing old vs new approach
- 3-5 key differentiators
- Focus on practical differences (time, cost, difficulty)

### Next steps
- **4 cards** with clear paths forward
- Mix of tutorial, guides, and reference
- Use descriptive titles and appropriate icons

### Related resources
- **Bulleted list** with category prefixes
- Link to concept, API, example, and guide pages
- Keep to 4-5 most relevant links

---

## Best Practices

### Lead with value
✅ "Reduce costs by 70-90%"  
❌ "Uses the oTool system"

### Be specific
✅ "Deploy in hours, not weeks"  
❌ "Much faster"

### Use metrics
✅ "$100-$1K per agent"  
❌ "More affordable"

### Show, don't tell
✅ ASCII diagram of architecture  
❌ Long paragraph explaining structure

### Action-oriented CTAs
✅ "Build your first specialist agent"  
❌ "Learn more about specialist agents"

