# Olane OS Documentation Context Guide

> **Purpose**: This document captures the patterns, principles, and style guidelines that inform all Olane OS documentation efforts. Use this as the source of truth for creating consistent, high-quality documentation across all packages.

**Last Updated**: September 29, 2025  
**Based On**: Analysis of o-core, o-tool, o-lane, o-node, and o-leader READMEs

---

## Table of Contents

1. [Core Messaging & Positioning](#core-messaging--positioning)
2. [Documentation Structure](#documentation-structure)
3. [Writing Style & Voice](#writing-style--voice)
4. [Code Example Standards](#code-example-standards)
5. [Progressive Disclosure Pattern](#progressive-disclosure-pattern)
6. [Terminology & Concepts](#terminology--concepts)
7. [Visual Patterns](#visual-patterns)
8. [Cross-Package Consistency](#cross-package-consistency)
9. [Documentation Checklist](#documentation-checklist)

---

## Core Messaging & Positioning

### Primary Narrative: Olane OS is an Agentic Operating System

**Key Principle**: Frame everything through the OS metaphor, NOT as a network/API/framework.

```
✅ DO SAY:
- "Agentic operating system"
- "Process manager for AI agents"
- "Inter-agent communication (IPC)"
- "Agent runtime"
- "Resource addressing"

❌ DON'T SAY:
- "Network framework"
- "API library"
- "REST service"
- "Microservices framework"
- "Message queue"
```

### What It IS vs What It's NOT

Every README should include a clear "What X is NOT" section:

```markdown
## What o-[package] is NOT

- ❌ **Not a network framework** - It's an operating system for agents
- ❌ **Not an orchestration tool** - It enables emergent coordination
- ❌ **Not a REST API** - It's a runtime for inter-agent communication
- ❌ **Not a complete solution** - It's a foundation you build upon
```

### Core Innovation: Emergent vs Explicit Orchestration

**Always contrast with traditional frameworks** (LangGraph, CrewAI, AutoGen):

| Traditional Frameworks | Olane OS Innovation |
|----------------------|-------------------|
| Pre-defined workflow graphs | Agents discover workflows |
| Explicit state machines | Emergent behavior patterns |
| Manual step orchestration | Capability-based autonomy |
| Fixed execution paths | Dynamic path discovery |

### Generalist-Specialist Architecture

When applicable, explain the cost/intelligence benefits:

- **Generalist Model**: Single LLM serves as reasoning brain
- **Specialist Agents**: Context injection + tool augmentation
- **Cost Benefits**: 70-90% reduction vs fine-tuned models
- **Intelligence Reuse**: Knowledge flows across agent types

---

## Documentation Structure

### Standard README Template

Every package README follows this structure:

```markdown
# @olane/[package-name]

> One-line tagline that captures the essence

Brief paragraph (2-3 sentences) explaining what it does and why it matters.

[![npm version](...)]]
[![License: ISC](...)]

## Features

- 🎯 **Feature 1** - Brief description
- 🔧 **Feature 2** - Brief description
- 📊 **Feature 3** - Brief description
[4-7 features total, use relevant emojis]

## Installation

```bash
npm install @olane/[package]
```

## Quick Start

### [Specific Use Case - 5 minutes]

[Complete, runnable example]

### Expected Output

[What users should see when it works]

### Next Steps

- [Link to concept 1]
- [Link to concept 2]
- [Link to advanced usage]

## What is o-[package]?

### [Conceptual explanation with OS metaphor]

[Comparison table if applicable]

### How It Works

[ASCII diagram or step-by-step flow]

### This is NOT [Common Misconception]

[Clear explanation of what it's not]

## Core Concepts

### [Concept 1]

[Explanation with code example]

### [Concept 2]

[Explanation with code example]

[3-6 core concepts]

## Examples

### [Example 1: Basic Usage]

[Complete code with explanation]

### [Example 2: Advanced Pattern]

[Complete code with explanation]

[3-5 examples showing progression]

## API Reference

### [Class 1]

#### Constructor
#### Properties
#### Methods

[Complete API documentation]

## Advanced Usage

### [Advanced Topic 1]
### [Advanced Topic 2]

[3-5 advanced topics]

## Best Practices

### [Category 1]

✅ **DO:**
- Practice 1
- Practice 2

❌ **DON'T:**
- Anti-pattern 1
- Anti-pattern 2

[3-4 categories]

## Use Cases

[3-5 real-world scenarios]

## Troubleshooting

### [Common Issue 1]

**Symptom**: [Description]
**Causes**: [List]
**Solutions**: [Code examples]

[3-5 common issues]

## Related Packages

- **[@olane/o-core](../o-core)** - Description
- **[@olane/o-node](../o-node)** - Description
[All related packages with context]

## Contributing

[Link to contributing guide]

## License

ISC © oLane Inc.

## Resources

- [Full Documentation](...)
- [Examples](...)
- [GitHub Repository](...)

---

**Part of the Olane OS ecosystem** - [Tagline that positions this package]
```

---

## Writing Style & Voice

### Voice Characteristics

**Conversational but Authoritative**
- Write like you're explaining to a skilled developer
- Assume competence but don't assume knowledge of Olane OS
- Use "you" and "your" to address the reader
- Use active voice: "The agent executes" not "Execution is performed"

**Examples:**

```markdown
✅ Good:
"Think of `o-lane` as the process manager for AI agents. Just as an OS 
manages processes, o-lane manages agentic workflows."

❌ Too formal:
"The o-lane package provides functionality for the management of agentic 
processes within the Olane OS ecosystem."

❌ Too casual:
"So basically o-lane is like, super cool for running agents and stuff!"
```

### Sentence Structure

**Lead with imperative verbs in instructions:**

```markdown
✅ Good:
- Create an agent with your custom configuration
- Start the agent to join the network
- Call the tool method with parameters

❌ Unclear:
- An agent can be created with configuration
- The network is joined when starting
- Parameters are passed to methods
```

### Explanation Pattern: Why Before How

```markdown
✅ Good:
**Purpose**: Analyze the intent and determine the next capability to use.

**When Used**: 
- Start of every lane
- After completing any other capability

**How**:
```typescript
[code example]
```

❌ Code-first:
```typescript
[code example with no context]
```
```

### Terminology Consistency

Always use these exact terms:

| Use This | Not This |
|----------|----------|
| Agent (AI agent) | Bot, service, worker |
| Intent | Goal, objective, task |
| Capability | Action, operation, function |
| Lane | Process, workflow, execution |
| o:// protocol | Olane protocol, O protocol |
| Inter-agent communication (IPC) | P2P, messaging, RPC |
| Hierarchical addressing | Path-based, URL-like |
| Emergent orchestration | Self-organizing, autonomous |
| Tool augmentation | Plugin system, extensions |

---

## Code Example Standards

### Every Example Must Be:

1. **Complete** - Copy-paste runnable without modifications
2. **Realistic** - Use real data, not "foo/bar/baz"
3. **Validated** - Actually test the code before documenting
4. **Contextual** - Explain why, not just what

### Example Template

```typescript
// 1. Context comment explaining the scenario
// Create a specialized financial analysis agent

// 2. Import statements (always show)
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// 3. Complete, working code
class FinancialAnalyst extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      description: 'Analyzes financial data and generates reports'
    });
  }

  async _tool_analyze_revenue(request: oRequest): Promise<any> {
    const { quarter } = request.params;
    // Realistic implementation
    return {
      quarter,
      revenue: 1200000,
      growth: 0.15
    };
  }
}

// 4. Usage demonstration
const analyst = new FinancialAnalyst();
await analyst.start();

// 5. Show the call
const result = await analyst.useSelf({
  method: 'analyze_revenue',
  params: { quarter: 'Q4' }
});

// 6. Show expected output with comments
console.log(result);
// {
//   quarter: 'Q4',
//   revenue: 1200000,
//   growth: 0.15
// }

// 7. Cleanup
await analyst.stop();
```

### Code Comments Style

```typescript
✅ Good - Explain WHY and business context:
// Register with parent to inherit domain knowledge
await this.use(parentAddress, { method: 'child_register' });

// Stream progress for long-running analysis tasks
const response = await agent.useSelf({
  streamTo: progressTrackerAddress
});

❌ Bad - State the obvious:
// Call the method
await this.use(address, { method: 'test' });

// Create a variable
const x = 5;
```

### Expected Output

Always show what users should see:

```typescript
console.log(response.result);
// {
//   result: "Analysis complete. Created summary report with key insights...",
//   cycles: 5,
//   sequence: [
//     { type: 'EVALUATE', reasoning: '...' },
//     { type: 'TASK', result: '...' }
//   ]
// }
```

---

## Progressive Disclosure Pattern

### Three Learning Paths

Every major concept should accommodate three audience types:

#### 1. **Get Started Fast (5 minutes)**

Minimum viable example to prove it works:

```typescript
// Simplest possible working code
const agent = new oLaneTool(config);
await agent.start();
const result = await agent.useSelf({ method: 'intent', params: { intent: 'test' }});
```

#### 2. **Understand Deeply (Core Concepts)**

Conceptual explanation with diagrams:

```
User Intent → Lane Creation → Capability Loop → Result Storage
                                    ↓
                    [Evaluate → Plan → Execute] × N cycles
```

#### 3. **Master Advanced Patterns (Advanced Usage)**

Production-ready patterns with error handling:

```typescript
class ProductionAgent extends oLaneTool {
  private healthCheckInterval?: NodeJS.Timeout;
  
  async start(): Promise<void> {
    await super.start();
    this.startHealthMonitoring();
  }
  // ... complete implementation
}
```

### Complexity Progression in Examples

```markdown
## Examples

### Example 1: Basic Intent Resolution
[Minimal working example]

### Example 2: Custom Capability
[Add one new concept]

### Example 3: Streaming Results
[Add another concept]

### Example 4: Lane with Context
[Combine previous concepts]

### Example 5: Multi-Cycle Execution with Analysis
[Full production pattern]
```

---

## Terminology & Concepts

### Core OS Metaphors

| Olane OS Concept | OS Metaphor | Explanation |
|------------------|-------------|-------------|
| o-core | Kernel | Foundation runtime |
| o-node | Linux Distribution | Concrete implementation |
| o-tool | System Call | How to invoke capabilities |
| o-lane | Process | Execution context |
| oAddress | File Path | Hierarchical addressing |
| oIntent | Command | What to execute |
| oCapability | System Function | Atomic operation |
| Leader Node | Init Process | Root coordinator |
| Registry | /etc/hosts | Service directory |

### The o:// Protocol

Always explain hierarchically:

```typescript
// Root domain
o://company

// Department subdomain
o://company/finance

// Specific agent
o://company/finance/analyst

// Think: Unix filesystem paths
// Not: URLs or REST endpoints
```

### Capability Loop

Always visualize the loop:

```
1. EVALUATE → Agent analyzes intent and current state
             ↓
2. DECIDE   → Agent determines next capability
             ↓
3. EXECUTE  → Capability performs its action
             ↓
4. RECORD   → Result added to sequence
             ↓
5. CHECK    → Complete? If no, return to EVALUATE
```

### Intent Design Principles

Always provide DO/DON'T examples:

```typescript
✅ Good intents (outcome-focused):
"Analyze customer satisfaction scores from Q4 and identify improvement areas"
"Find all pending orders and send reminder emails to customers"

❌ Poor intents (prescriptive or vague):
"Do some analysis" // Too vague
"Query database, filter results, format JSON" // Too prescriptive
```

---

## Visual Patterns

### Tables for Comparisons

Use tables to show contrasts:

```markdown
| Traditional Approach | Olane OS Approach |
|---------------------|-------------------|
| Pre-defined workflows | Emergent coordination |
| Centralized control | Distributed intelligence |
| Manual scaling | Self-organizing |
```

### State/Lifecycle Diagrams

Show states clearly:

```markdown
Lane Lifecycle:
PENDING → PREFLIGHT → RUNNING → POSTFLIGHT → COMPLETED
                        ↓
                     FAILED
                        ↓
                    CANCELLED
```

### Architecture Diagrams

Use ASCII art for clarity:

```markdown
┌─────────────────────────────────────┐
│      o-node (This Package)          │
│   Production libp2p Implementation  │
└─────────────────────────────────────┘
              ⬇ implements
┌─────────────────────────────────────┐
│          @olane/o-core              │
│      Abstract Agent Runtime         │
└─────────────────────────────────────┘
```

### Feature Lists

Always use relevant emojis:

```markdown
- 🔄 **Intent-Driven Execution** - Transform natural language goals
- 🧠 **Capability-Based Loop** - Evaluate-plan-execute cycle
- 📊 **Execution Tracking** - Complete sequence history
- 🌊 **Streaming Support** - Real-time progress updates
```

### Best Practices Format

Use checkmarks and X marks:

```markdown
✅ **DO:**
- Keep capabilities atomic and focused
- Return clear next-capability signals
- Handle errors gracefully

❌ **DON'T:**
- Create monolithic capabilities
- Assume state from previous cycles
- Silently fail
```

---

## Cross-Package Consistency

### Package Relationships

Always explain how packages relate:

```markdown
## Related Packages

- **[@olane/o-core](../o-core)** - Core OS functionality and base classes
- **[@olane/o-node](../o-node)** - Network-connected tools with P2P capabilities
- **[@olane/o-tool](../o-tool)** - Tool augmentation system
- **[@olane/o-lane](../o-lane)** - Agentic process management
- **[@olane/o-leader](../o-leader)** - Network coordination
```

### Dependency Hierarchy

Always show the stack:

```
Application Layer:
└── Your Custom Agents

Framework Layer:
├── @olane/o-lane (Process Management)
├── @olane/o-tool (Tool System)
└── @olane/o-leader (Coordination)

Transport Layer:
└── @olane/o-node (libp2p Implementation)

Kernel Layer:
└── @olane/o-core (Abstract Runtime)

Protocol Layer:
└── @olane/o-protocol (Types & Definitions)
```

### Cross-References

Link to related documentation:

```markdown
**📖 For complete details on address resolution and routing algorithms, 
see the [Router System documentation](./src/router/README.md).**

**📚 [View detailed Connection System documentation →](./src/connection/README.md)**
```

---

## Documentation Checklist

### Before Publishing Any Documentation

- [ ] **Positioning**: Clear "What is X?" section with OS metaphor
- [ ] **What It's NOT**: Explicit anti-patterns and misconceptions addressed
- [ ] **Quick Start**: 5-minute example that actually runs
- [ ] **Expected Output**: Show users what success looks like
- [ ] **Code Quality**: All examples tested and runnable
- [ ] **Progressive Disclosure**: Simple → Complex → Advanced pattern
- [ ] **Comparisons**: Table showing vs traditional approaches (if applicable)
- [ ] **Terminology**: Consistent use of Olane OS vocabulary
- [ ] **Cross-References**: Links to related packages and docs
- [ ] **Best Practices**: DO/DON'T sections for key concepts
- [ ] **Troubleshooting**: Common issues with solutions
- [ ] **API Reference**: Complete method signatures and descriptions
- [ ] **Use Cases**: 3-5 real-world scenarios
- [ ] **Visual Aids**: Diagrams, tables, or ASCII art for complex concepts
- [ ] **Voice**: Conversational but authoritative throughout
- [ ] **Closing**: "Part of Olane OS ecosystem" tagline at end

### Example Quality Standards

For each code example:

- [ ] Complete imports shown
- [ ] Can be copy-pasted and run
- [ ] Uses realistic data (not foo/bar)
- [ ] Includes expected output
- [ ] Has contextual comments explaining WHY
- [ ] Shows cleanup (stop(), etc.)
- [ ] Demonstrates one clear concept
- [ ] Builds on previous examples

### Writing Quality Standards

- [ ] Active voice ("The agent executes" not "Execution is performed")
- [ ] Imperative verbs in instructions ("Create" not "You can create")
- [ ] Explain WHY before HOW
- [ ] Define acronyms on first use
- [ ] Consistent terminology throughout
- [ ] No jargon without explanation
- [ ] Short sentences (prefer 2 sentences over 1 complex sentence)
- [ ] Paragraphs focus on single idea

---

## Stripe-Inspired Principles

Based on the cursor rules about Stripe documentation:

### 1. Business-First Hierarchy

Organize by business outcomes, not technical features:

```markdown
✅ Good Structure:
- Accept Payments → Quickstart → API Reference
- Manage Subscriptions → Quickstart → API Reference

❌ Technical Structure:
- API Methods → POST /payments → GET /payments
- Database Schema → Tables → Columns
```

### 2. Multiple User Paths

Support three paths simultaneously:

1. **No-code path**: For non-developers (leader nodes, CLI tools)
2. **Quick path**: Pre-built solutions (oServerNode, oLaneTool)
3. **Custom path**: Full API control (extend oCore, custom capabilities)

### 3. Integration of Testing

Don't treat testing as an afterthought:

```markdown
## Examples

### Basic Usage
[Working example with real data]

### Testing This Example
[How to verify it works]
```

### 4. Error Handling Throughout

Every example includes error handling context:

```typescript
try {
  const result = await agent.execute();
  return result;
} catch (error) {
  if (error instanceof oError) {
    console.error(`Error ${error.code}: ${error.message}`);
    // Explain what this error means and how to fix it
  }
}
```

### 5. Conversion-Focused Design

Every page moves developers from evaluation → implementation:

```markdown
## Quick Start (5 minutes)
[Get it working]

## Core Concepts
[Understand it deeply]

## Advanced Usage
[Use it in production]
```

---

## Common Patterns to Follow

### Package Header Pattern

```markdown
# @olane/[package-name]

> [One-line tagline capturing essence]

[2-3 sentence paragraph explaining what/why, emphasizing business value]

[![npm version](https://img.shields.io/npm/v/@olane/[package].svg)](...)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](...)
```

### Feature List Pattern

4-7 features, each with:
- Emoji (choose meaningful ones)
- Bold title (2-4 words)
- Brief explanation (5-10 words)

### Comparison Table Pattern

Always show traditional vs Olane OS approach:

```markdown
| Traditional [Framework] | o-[package] |
|------------------------|-------------|
| [Old way description]  | [New way]   |
| [Problem it causes]    | [Solution]  |
```

### Example Header Pattern

```markdown
### [Example Title: Specific Use Case]

[Context paragraph explaining when/why to use this]

```typescript
[Complete, runnable code]
```

[Explanation of key parts or expected output]
```

### Troubleshooting Pattern

```markdown
### [Issue Name]

**Symptom**: [What user sees]

**Causes**:
- [Reason 1]
- [Reason 2]

**Solutions**:
```typescript
// 1. [Solution description]
[code example]

// 2. [Alternative solution]
[code example]
```
```

---

## Version History

This document should be updated whenever significant documentation patterns change.

**v1.0** (Sept 2025): Initial version based on o-core, o-tool, o-lane, o-node, o-leader analysis  
**Future versions**: Document pattern changes here

---

## Using This Guide

### For New Packages

1. Copy the [Standard README Template](#standard-readme-template)
2. Review [Core Messaging](#core-messaging--positioning) for positioning
3. Follow [Code Example Standards](#code-example-standards) for all code
4. Use [Documentation Checklist](#documentation-checklist) before publishing

### For Updating Existing Packages

1. Compare against [Cross-Package Consistency](#cross-package-consistency)
2. Verify [Terminology Consistency](#terminology-consistency)
3. Update to match [Visual Patterns](#visual-patterns)
4. Run through [Documentation Checklist](#documentation-checklist)

### For Code Comments

1. Explain WHY, not WHAT
2. Provide business context
3. Reference this guide's [Code Comments Style](#code-comments-style)

### For Architecture Decisions

When making changes that affect documentation:
1. Update this guide first
2. Document the rationale
3. Update affected package READMEs
4. Add to version history

---

**This is a living document.** As Olane OS evolves, this guide should be updated to reflect new patterns, better practices, and lessons learned from user feedback.
