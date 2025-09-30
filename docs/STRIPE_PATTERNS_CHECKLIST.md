# Stripe Documentation Patterns - Quick Reference

Use this checklist when creating or updating documentation pages.

---

## Page Structure Checklist

### Every Page Must Have:

- [ ] **Clear, keyword-rich title** (not generic)
- [ ] **Concise description** explaining value (1-2 sentences)
- [ ] **What you'll learn** section listing specific outcomes
- [ ] **Working code examples** (copy-paste ready)
- [ ] **Expected outputs** for validation
- [ ] **Next steps** with 3-6 related links
- [ ] **Related resources** linking to concepts, APIs, examples

### Business-First Pages (Use Cases)

- [ ] Lead with business outcome, not technical feature
- [ ] Show cost/time savings with specific numbers
- [ ] Include comparison table vs traditional approaches
- [ ] Real-world use case examples
- [ ] Quick start time estimate (< 30 min target)

### Quickstart Pages

- [ ] **Time estimate** in prerequisites (be realistic)
- [ ] **Prerequisites section** with clear checks
- [ ] **Step-by-step format** (Step 1, Step 2, etc.)
- [ ] **Validation** after each major step
- [ ] **Expected output** shown explicitly
- [ ] **Troubleshooting** for common issues
- [ ] Working code that can be copy-pasted
- [ ] Test instructions with expected results

### Concept Pages

- [ ] Start with "What" and "Why" before "How"
- [ ] Visual diagram or architecture overview
- [ ] Benefits listed as cards or callouts
- [ ] Comparison to alternatives (when relevant)
- [ ] Code examples showing concept in practice
- [ ] Link to use cases that apply concept

### API Reference Pages

- [ ] Clear class/function signatures
- [ ] Parameter tables with types and descriptions
- [ ] Return value documentation
- [ ] Multiple code examples (simple → complex)
- [ ] Error handling examples
- [ ] Link to guides that use this API
- [ ] Common use cases section

---

## Writing Style Checklist

### Do ✅

- [ ] Use action verbs ("Create", "Build", "Deploy")
- [ ] Write in present tense
- [ ] Use "you" to address the reader
- [ ] Keep sentences short (< 20 words)
- [ ] Show outcomes before implementation
- [ ] Include specific numbers (cost, time, performance)
- [ ] Explain "why" before "how"
- [ ] Use consistent terminology

### Don't ❌

- [ ] ❌ Use passive voice
- [ ] ❌ Start with "This document will..."
- [ ] ❌ Use "we" excessively
- [ ] ❌ Include placeholder code (`// TODO`, `...`, `/* ... */`)
- [ ] ❌ Leave out error handling
- [ ] ❌ Forget to show expected outputs
- [ ] ❌ Use jargon without explanation
- [ ] ❌ Create circular links (A→B→A only)

---

## Code Example Checklist

### Every Code Block Must:

- [ ] Be **complete and runnable** (no placeholders)
- [ ] Include **imports/requires** at the top
- [ ] Use **realistic data** (not foo/bar)
- [ ] Show **expected output** after code
- [ ] Include **error handling**
- [ ] Have **comments** for complex logic only
- [ ] Match **coding style** of the project

### Multi-Language Examples

```typescript
// ✅ Good: Complete example
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

class Agent extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://company/agent')
    });
  }
}

const agent = new Agent();
await agent.start();
```

```typescript
// ❌ Bad: Incomplete example
class Agent extends oLaneTool {
  // ... rest of implementation
}
```

### Show Validation

```typescript
// Run the agent
await agent.start();

// Test it
const result = await agent.use({
  method: 'hello_world'
});

console.log(result);
// Expected output:
// { message: "Hello from o://company/agent" }
```

---

## Progressive Disclosure Pattern

Every major feature should follow this structure:

### 1. Overview Page
```
Title: "Build [Feature]"
- What you can build (business outcome)
- Why use this (benefits with metrics)
- How it works (high-level)
- Common use cases
- Quick comparison
- Next steps → Quickstart
```

### 2. Quickstart Page
```
Title: "Build Your First [Feature]"
- What you'll learn (specific outcomes)
- Prerequisites + time estimate
- Step 1-5 with validation
- What you built (summary)
- Next steps → Implementation
```

### 3. Implementation Pages
```
Title: "[Specific Aspect]"
- When to use this approach
- Detailed implementation
- Advanced patterns
- Testing strategy
- Next steps → API Reference
```

### 4. API Reference
```
Title: "[API Name] Reference"
- Overview with link to guide
- Complete API documentation
- Multiple examples
- Error handling
- Related APIs
```

---

## Testing Integration Checklist

### Don't Create Separate Testing Docs

- [ ] ❌ Separate "Testing" guide divorced from features
- [ ] ✅ Testing section in **every** use case page
- [ ] ✅ Validation steps in **every** quickstart
- [ ] ✅ Test examples in **every** implementation guide

### Testing Content Pattern

```markdown
## Testing

Test [feature] at three levels:

### Unit Testing
[Test individual components]

```typescript
it('should [expected behavior]', async () => {
  const result = await component.method();
  expect(result).toBe(expected);
});
```

### Integration Testing
[Test feature in context]

### End-to-End Testing
[Test complete workflow]

**Run tests**:
```bash
npm test
```

**Expected output**:
```
✓ should [behavior] (23ms)
✓ should [other behavior] (45ms)
```
```

---

## Navigation Principles

### Information Architecture

1. **Business Value First**
   - Start with use cases (what you can build)
   - Then concepts (how it works)
   - Then API reference (technical details)

2. **Progressive Complexity**
   - Get Started → Use Cases → Concepts → API → Advanced

3. **Clear User Paths**
   - Evaluator: Introduction → Use case overviews
   - Builder: Quickstart → Use case quickstarts → Development
   - Architect: Architecture → Advanced guides → API reference

### Page Grouping Rules

- [ ] Max 7 pages per group (Miller's Law)
- [ ] Max 3 levels of nesting
- [ ] Related pages grouped together
- [ ] Consistent naming within groups

### Cross-Linking Strategy

Every page should link to:
- [ ] **1-2 related use cases** (business context)
- [ ] **1-2 related concepts** (understanding)
- [ ] **1 API reference** (technical details)
- [ ] **1-2 examples** (working code)
- [ ] **2-4 next steps** (progression)

---

## Component Usage Guide

### When to Use Each Component

#### Cards
```mdx
<CardGroup cols={2}>
  <Card title="Feature Name" icon="icon-name">
    Brief description of benefit
  </Card>
</CardGroup>
```
Use for: Benefits, features, next steps

#### Steps
```mdx
<Steps>
  <Step title="Action to take">
    Details and code
  </Step>
</Steps>
```
Use for: Sequential processes, workflows

#### Tabs
```mdx
<Tabs>
  <Tab title="TypeScript">
    [Code example]
  </Tab>
  <Tab title="JavaScript">
    [Code example]
  </Tab>
</Tabs>
```
Use for: Multi-language examples, alternative approaches

#### Accordions
```mdx
<AccordionGroup>
  <Accordion title="Question or topic">
    Detailed answer
  </Accordion>
</AccordionGroup>
```
Use for: Troubleshooting, FAQs, optional details

#### Callouts
```mdx
<Info>Important context</Info>
<Warning>Caution about edge case</Warning>
<Tip>Helpful suggestion</Tip>
<Check>Success validation</Check>
```
Use for: Highlighting key information inline

---

## Quality Checklist

Before publishing any page:

### Content Quality
- [ ] All code examples tested and working
- [ ] All internal links verified
- [ ] All images have alt text
- [ ] Spelling and grammar checked
- [ ] Technical accuracy verified
- [ ] Consistent terminology throughout

### User Experience
- [ ] Clear path to next step
- [ ] Time estimates accurate
- [ ] Prerequisites listed
- [ ] Expected outputs shown
- [ ] Common issues addressed
- [ ] Multiple learning styles supported (text, code, diagrams)

### SEO & Discoverability
- [ ] Title contains relevant keywords
- [ ] Description is compelling and clear
- [ ] Headers use proper hierarchy (H2 → H3 → H4)
- [ ] Code blocks have language specified
- [ ] Page has unique, valuable content

---

## Anti-Patterns to Avoid

### ❌ Bad Practices

1. **Technical jargon first**
   ```markdown
   ❌ "The oLane IPC subsystem utilizes JSON-RPC 2.0..."
   ✅ "Agents communicate by sending messages to each other..."
   ```

2. **Incomplete code examples**
   ```typescript
   ❌ const agent = new Agent(/* ... */);
   ✅ const agent = new Agent({
        address: new oAddress('o://company/agent')
      });
   ```

3. **Missing validation**
   ```markdown
   ❌ Run `npm start`
   ✅ Run `npm start`
      Expected output: "Agent started at o://..."
   ```

4. **No clear next steps**
   ```markdown
   ❌ [End of page]
   ✅ ## Next Steps
      - [Try this related feature]
      - [Learn this concept]
   ```

5. **Assuming knowledge**
   ```markdown
   ❌ "Use the capability loop"
   ✅ "Use the capability loop (a system that evaluates → decides → executes)"
   ```

---

## Page Templates Quick Reference

| Page Type | Template Location | Key Features |
|-----------|------------------|--------------|
| Use Case Overview | TEMPLATE_GUIDE.md #1 | Business value, comparison, use cases |
| Use Case Quickstart | TEMPLATE_GUIDE.md #2 | < 30 min, step-by-step, validation |
| Testing | TEMPLATE_GUIDE.md #3 | Unit/integration/e2e, fixtures |
| Concept | TEMPLATE_GUIDE.md #4 | What/why/how, diagrams, examples |
| API Reference | TEMPLATE_GUIDE.md #5 | Signatures, params, examples |
| Migration | TEMPLATE_GUIDE.md #6 | Before/after, patterns, checklist |

---

## Metrics That Matter

Track these to validate documentation quality:

1. **Time to First Success**
   - Can users complete quickstart in stated time?
   - Target: < 30 minutes

2. **Code Copy Rate**
   - Are users copying code examples?
   - High rate = examples are useful

3. **Page Flow**
   - Do users follow intended paths?
   - Track: Overview → Quickstart → Implementation

4. **Search Queries**
   - What are users searching for?
   - Indicates navigation gaps

5. **Bounce Rate**
   - Where do users leave?
   - High bounce = unclear value or broken content

---

## Quick Wins

Easy improvements with high impact:

1. **Add "What you'll learn"** to every quickstart
2. **Show expected output** for every code example
3. **Add time estimates** to all tutorials
4. **Include troubleshooting** for common issues
5. **Link to related pages** at bottom
6. **Use specific numbers** in benefits (70% cost reduction)
7. **Add validation steps** to quickstarts
8. **Create comparison tables** for features
9. **Show real-world examples** not toy examples
10. **Test all code** before publishing

---

## Remember

> "Documentation should enable users to be successful, not just informed."
> - Stripe Documentation Philosophy

Every page should answer:
1. **What** can I build with this?
2. **Why** would I use this approach?
3. **How** do I implement it?
4. **Did it work?** (validation)
5. **What's next?** (progression)

If any of these questions are unanswered, the page needs improvement.
