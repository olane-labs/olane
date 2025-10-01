# Agent Terminology Guide for Olane OS Documentation

> **Critical**: Agents in Olane OS can be either **human** or **AI-powered**. This distinction must be consistently represented throughout all documentation.

## Core Definition

**Olane OS is an agentic operating system where Agents (human or AI) are the users, tools are the applications, and Olane packages provide the runtime infrastructure.**

## Why This Matters

### The Real Value Proposition

Tools are **agent-agnostic**. They accept natural language intents from ANY agent:

```typescript
// The SAME tool node serves:
// ✓ Human via CLI: olane intent "Analyze Q4 sales"
// ✓ Human via web UI: User types in form field
// ✓ AI agent (GPT-4): Programmatic intent from autonomous workflow
// ✓ AI agent (Claude): Part of multi-agent coordination

await toolNode.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 sales and identify trends'
  }
});
```

### Implications

1. **Broader market**: Not just "AI agent orchestration" but "intent-driven applications"
2. **Future-proof**: Works today with humans, scales with AI adoption
3. **Unified interface**: One tool serves both human and AI users
4. **Real differentiation**: Unlike frameworks that only support AI agents

## Terminology Rules

### ✅ DO Use

| Term | Context | Example |
|------|---------|---------|
| **Agents (human or AI)** | When referring to Layer 1 users | "Agents express intents in natural language" |
| **Human agents** | When specifically discussing human users | "Human agents can use the CLI to send intents" |
| **AI agents** | When specifically discussing AI models | "AI agents can coordinate autonomously" |
| **Agent-agnostic** | When describing tools | "Tools are agent-agnostic - they serve both humans and AI" |
| **Users** or **Agents** | General reference to Layer 1 | "Users interact with tools via intents" |

### ❌ DON'T Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **AI agents** (exclusively) | Implies AI-only use cases | **Agents (human or AI)** |
| **AI users** | Excludes humans | **Agents** or **Users** |
| **LLMs as users** | Too narrow | **AI agents (LLMs like GPT-4, Claude)** |
| **Just "agents"** without context | Ambiguous in first mentions | **Agents (human or AI)** on first mention |

## Documentation Patterns

### Pattern 1: Introduction Sections

✅ **Correct:**
```markdown
## Layer 1: Users (Agents)

Agents are intelligent users that interact with your tools using natural language. 
They can be either **human** or **AI-powered**.

### Human Agents
- Interact via CLI, web UI, API
- Express goals in natural language
- Benefit from intent-driven execution

### AI Agents
- Large language models (GPT-4, Claude, etc.)
- Autonomous reasoning and coordination
- Learn from execution patterns
```

❌ **Incorrect:**
```markdown
## Layer 1: Users (AI Agents)

AI agents are intelligent users that interact with your tools.
```

### Pattern 2: Code Examples

✅ **Correct:**
```markdown
Both human and AI agents use the same interface:

<CodeGroup>

```bash Human Agent (CLI)
olane intent "Analyze Q4 sales"
```

```typescript AI Agent (Programmatic)
await toolNode.use({
  method: 'intent',
  params: { intent: 'Analyze Q4 sales' }
});
```

</CodeGroup>
```

### Pattern 3: Feature Descriptions

✅ **Correct:**
```markdown
Tools accept intents from agents (human or AI) and autonomously 
determine the execution path. Humans benefit from simplified interaction, 
while AI agents enable autonomous coordination.
```

❌ **Incorrect:**
```markdown
Tools accept intents from AI agents and autonomously determine 
the execution path using LLM reasoning.
```

## Section-by-Section Guidelines

### Get Started / Introduction

**First mention must clarify:**
```markdown
Agents (human or AI) are the users of Olane OS. You build tools 
that both humans and AI agents interact with using natural language.
```

### Architecture Diagrams

```markdown
┌─────────────────────────────────────────────────┐
│  Layer 1: USERS (Agents)                        │
│  ✓ Humans (via CLI, web, API)                   │
│  ✓ AI (GPT-4, Claude, Gemini)                   │
│  • Both use natural language intents             │
└─────────────────────────────────────────────────┘
```

### Quickstarts

Include BOTH interaction modes:

```markdown
## Testing Your Tool Node

### As a Human Agent
```bash
olane intent "Your test goal"
```

### As an AI Agent
```typescript
const result = await toolNode.use({
  method: 'intent',
  params: { intent: 'Your test goal' }
});
```
```

### Use Cases

Frame use cases to show BOTH:

```markdown
## Use Cases

### 1. Human-Initiated Workflows
Humans express business goals in natural language:
- "Generate monthly revenue report"
- "Onboard new customer from this email"

### 2. AI-Autonomous Workflows
AI agents coordinate complex multi-step processes:
- Multi-tool-node coordination
- Long-running monitoring tasks
- Emergent workflow discovery

### 3. Hybrid Workflows
Humans initiate, AI agents execute, results return to humans:
- Human: "Analyze our customer churn"
- AI: Coordinates across analytics, CRM, and reporting tools
- Human: Receives comprehensive insights
```

### API Documentation

Show both invocation methods:

```markdown
## `_tool_intent` Method

Accepts natural language intents from agents (human or AI).

**Human Invocation:**
```bash
olane intent "Your goal"
```

**AI Invocation:**
```typescript
await toolNode.use({
  method: 'intent',
  params: { intent: 'Your goal' }
});
```

**Tool Node Processing:**
The tool node processes the intent autonomously regardless of source.
```

## Visual Language

### Icons

- Layer 1 (Users): Use `icon="users"` not `icon="robot"`
- Human agents: `icon="user"`  
- AI agents: `icon="robot"` or `icon="brain"`

### Card Groups

```markdown
<CardGroup cols={2}>
  <Card title="Human Agents" icon="user">
    Interact via natural language interfaces
    - CLI, web UI, API
    - Express what they want
    - Get autonomous execution
  </Card>
  
  <Card title="AI Agents" icon="robot">
    Autonomous reasoning and coordination
    - GPT-4, Claude, Gemini
    - Multi-tool-node workflows
    - Emergent orchestration
  </Card>
</CardGroup>
```

## Key Messaging

### Value Propositions

1. **Build Once, Serve Both**
   - "Tools serve both human and AI agents through a unified intent interface"

2. **Future-Proof Architecture**
   - "Works today with humans, scales as AI adoption increases"

3. **Agent-Agnostic Design**
   - "Tools don't care if the intent comes from a human or AI - they just process it"

4. **Broader Than AI Frameworks**
   - "Unlike frameworks that only support AI orchestration, Olane OS enables intent-driven applications for everyone"

### Positioning Statements

✅ **Use these:**
- "Olane OS enables intent-driven applications that agents (human or AI) can use"
- "Build tools once, serve both human and AI agents"
- "Agent-agnostic architecture for the agentic future"

❌ **Avoid these:**
- "Olane OS is for AI agent orchestration" (too narrow)
- "Build AI-powered systems" (excludes humans)
- "Framework for LLM coordination" (misses the broader point)

## Common Pitfalls

### Pitfall 1: Defaulting to "AI Agents"

**Problem:** Documentation says "AI agents" throughout without mentioning humans

**Fix:** First mention in each major section should be "agents (human or AI)"

### Pitfall 2: AI-Only Examples

**Problem:** All code examples show AI agent programmatic invocation

**Fix:** Include human invocation methods (CLI, web UI) alongside AI examples

### Pitfall 3: Focusing on Autonomous Coordination

**Problem:** Emphasizing only autonomous AI coordination use cases

**Fix:** Show human-initiated workflows and hybrid human-AI patterns

### Pitfall 4: Ignoring the Human UX

**Problem:** No discussion of how humans interact with tools

**Fix:** Document CLI, web UI, and API interfaces for human agents

## Migration Strategy for Existing Docs

### Phase 1: Update Core Definitions (High Priority)

Files to update:
- [ ] `introduction.mdx` - First paragraph
- [ ] `understanding/what-is-olane.mdx` - Layer 1 description
- [ ] `understanding/three-layer-model.mdx` - ✅ UPDATED
- [ ] `concepts/architecture-overview.mdx` - Users section

### Phase 2: Update Examples (Medium Priority)

Add human invocation examples to:
- [ ] `quickstart.mdx`
- [ ] All package README files
- [ ] Use case documentation
- [ ] API reference examples

### Phase 3: Add Human-Specific Content (Low Priority)

New content needed:
- [ ] CLI usage guide for human agents
- [ ] Web UI patterns for tool node interaction
- [ ] Human-AI hybrid workflow patterns
- [ ] Human agent best practices

## Testing the Message

Use these questions to verify documentation is agent-inclusive:

1. ✅ Does Layer 1 explicitly mention "agents (human or AI)"?
2. ✅ Are there code examples showing human invocation?
3. ✅ Do diagrams show both human and AI as users?
4. ✅ Are use cases framed for both human and AI scenarios?
5. ✅ Does the value proposition mention serving both?

## Quick Reference Card

```markdown
# Olane OS Agent Terminology

**Definition:** Agents = Humans OR AI-powered models

**Layer 1:** Users (Agents)
- Human agents → CLI, web UI, API
- AI agents → GPT-4, Claude, autonomous

**Tools:** Agent-agnostic applications
- Same interface serves both
- Accept natural language intents
- Process autonomously

**Key Message:** Build once, serve both human and AI agents
```

## When in Doubt

**Default pattern for any documentation section:**

1. First mention: "agents (human or AI)"
2. Provide examples of BOTH when relevant
3. Explain unique benefits for each when applicable
4. Use "agent-agnostic" to describe tools
5. Frame value propositions inclusively

---

**Last Updated:** 2025-09-29  
**Applies To:** All Olane OS documentation  
**Status:** Active guideline for all new content
