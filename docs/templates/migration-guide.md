# Migration Guide Template

**Purpose**: Help users migrate from other frameworks  
**Location**: `migration/from-{framework}.mdx`

---

## Template

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
import { oMethod } from '@olane/o-protocol';

// Define method schemas
const ANALYSIS_METHODS: { [key: string]: oMethod } = {
  execute_analysis: {
    name: 'execute_analysis',
    description: 'Execute analysis on data source',
    dependencies: [],
    parameters: [
      {
        name: 'dataSource',
        type: 'string',
        value: 'string',
        description: 'Data source to analyze',
        required: true,
      },
      {
        name: 'period',
        type: 'string',
        value: 'string',
        description: 'Time period for analysis',
        required: true,
      },
    ],
  },
};

class AnalysisAgent extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://company/analyst'),
      methods: ANALYSIS_METHODS,
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

## Section Breakdown

### Overview
- **1-2 sentences** explaining migration path
- State both frameworks clearly
- Set expectations

### Key differences
- **Table format** comparing approaches
- 5-7 key differentiators
- Focus on conceptual differences

### Migration strategy
- **4 high-level steps** using `<Steps>`
- Each step is actionable
- Progressive from audit to deploy

### Example migration
- **Complete before/after code**
- Show equivalent functionality
- Use realistic example
- Explain what changed and why

### Migration patterns
- **3-5 common patterns**
- Use `<Tabs>` for side-by-side comparison
- Show both frameworks solving same problem
- Include explanatory comments

### State management
- Show how state works in each framework
- Explain Olane's automatic state handling
- Provide code examples

### Common issues
- **3-5 accordions** with problems and solutions
- Address migration pain points
- Include code examples for fixes

### Migration checklist
- **Step-by-step verification**
- Use `<Check>` components
- Cover full migration lifecycle

### Benefits
- **4 cards** showing post-migration advantages
- Focus on practical improvements
- Be specific about gains

---

## Best Practices

### Be Honest About Differences
Don't oversimplify. Show real tradeoffs:
```markdown
### When to stay with [Framework]
- Specific reason 1
- Specific reason 2
```

### Side-by-Side Comparisons
Use tabs for direct comparison:
```mdx
<Tabs>
  <Tab title="Framework A">
    // Code
  </Tab>
  <Tab title="Olane">
    // Equivalent code
  </Tab>
</Tabs>
```

### Address Pain Points
Include troubleshooting:
```markdown
<Accordion title="Common issue">
  **Problem**: Description
  **Solution**: Code example
</Accordion>
```

### Complete Examples
Show full working code, not snippets:
```typescript
// Complete before
[Full original code]

// Complete after
[Full migrated code]
```

### Realistic Migration Path
Break into phases:
```markdown
1. Audit (week 1)
2. Design (week 2)
3. Implement (weeks 3-4)
4. Test (week 5)
5. Deploy (week 6)
```

