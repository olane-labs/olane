# Documentation Templates

> Following Stripe's best practices for developer documentation

This directory contains templates for creating high-quality documentation pages for Olane. Each template is designed for a specific documentation purpose and includes complete examples.

## Available Templates

### 1. [Use Case Overview](./use-case-overview.md)
**Purpose**: Business-first landing page that explains WHAT you can build and WHY  
**Location**: `use-cases/{category}/overview.mdx`  
**Use when**: Creating the first page of a new use case section

### 2. [Use Case Quickstart](./use-case-quickstart.md)
**Purpose**: Working example users can complete in < 30 minutes  
**Location**: `use-cases/{category}/quickstart.mdx`  
**Use when**: Providing hands-on tutorials for a use case

### 3. [Testing Page](./testing-page.md)
**Purpose**: Show how to test specific functionality with integrated examples  
**Location**: `use-cases/{category}/testing.mdx` or `dev/testing-{area}.mdx`  
**Use when**: Documenting testing strategies and practices

### 4. [Concept Page](./concept-page.md)
**Purpose**: Explain fundamental concepts and how they work  
**Location**: `concepts/{area}/{topic}.mdx`  
**Use when**: Teaching core architectural ideas or principles

### 5. [API Reference](./api-reference.md)
**Purpose**: Complete technical reference with examples  
**Location**: `api/{area}.mdx`  
**Use when**: Documenting APIs, classes, or technical interfaces

### 6. [Migration Guide](./migration-guide.md)
**Purpose**: Help users migrate from other frameworks  
**Location**: `migration/from-{framework}.mdx`  
**Use when**: Creating guides for users transitioning from other tools

---

## When to Use Each Template

| Template | Stage | Audience | Focus |
|----------|-------|----------|-------|
| Use Case Overview | Discovery | Business/Technical | Value & outcomes |
| Use Case Quickstart | Getting started | Developers | Hands-on learning |
| Testing Page | Implementation | Developers | Validation & quality |
| Concept Page | Understanding | Developers/Architects | How things work |
| API Reference | Reference | Developers | Technical details |
| Migration Guide | Transition | Existing users | Framework comparison |

## Content Principles

### 1. Business Value First
Lead with outcomes, not features. Answer "Why should I care?" before "How does it work?"

✅ **Good**: "Create AI agents specialized for specific domains, reducing costs by X-Y%"  
❌ **Bad**: "The oLaneTool class extends oNodeTool and adds capability loop functionality"

### 2. Progressive Disclosure
Structure information from high-level to detailed:
- **Overview** → What and why
- **Quickstart** → Basic implementation
- **Deep Dive** → Advanced patterns
- **Reference** → Complete technical details

### 3. Integrated Testing
Show testing alongside implementation, not as an afterthought:

```typescript
// Step 3: Add domain tools
async _tool_analyze_revenue(request) {
  // Implementation
}

// Validate Step 3
const result = await agent.use({
  method: 'analyze_revenue',
  params: { /* test data */ }
});
```

### 4. Working Examples
All code must be:
- ✅ Copy-paste ready
- ✅ Self-contained
- ✅ Tested
- ✅ Realistic

❌ Avoid: Pseudocode, incomplete snippets, or "TODO" placeholders

### 5. Multiple Language Support
Provide examples in TypeScript and JavaScript when applicable:

```typescript
<CodeGroup>
  ```typescript example.ts
  // TypeScript version
  ```
  
  ```javascript example.js
  // JavaScript version
  ```
</CodeGroup>
```

---

## Cross-Linking Pattern

Every documentation page should include links to related resources:

```mdx
## Related resources

- **Use Case**: [Relevant use case](/use-cases/...)
- **Concept**: [Related concept](/concepts/...)
- **API**: [API reference](/api/...)
- **Example**: [Code example](/examples/...)
- **Guide**: [Related guide](/guides/...)
```

### Navigation Flow

```
Use Case Overview
      ↓
Use Case Quickstart
      ↓
   Testing Page
      ↓
  Concept Pages ←→ API Reference ←→ Examples
      ↓
Migration Guides
```

---

## Formatting Standards

### Headers
- Use sentence case: "Build specialist agents" (not "Build Specialist Agents")
- Keep concise: < 60 characters
- Make descriptive: "What you'll build" (not "Overview")

### Code Blocks
Always specify language and filename:

```typescript financial-agent.ts
export class FinancialAgent extends oLaneTool {
  // ...
}
```

### Callouts
Use MDX components for emphasis:

- `<Info>` - Additional information
- `<Warning>` - Important caveats
- `<Check>` - Validation checkpoints
- `<Tip>` - Pro tips

### Structure
1. **Title & Description** (front matter)
2. **What you'll learn/build** (outcome-focused intro)
3. **Prerequisites** (if applicable)
4. **Main content** (progressive steps or sections)
5. **Next steps** (card group with links)
6. **Related resources** (bulleted links)

---

## Writing Style

### Voice
- **Active, direct**: "Create an agent" (not "An agent can be created")
- **Conversational**: "You'll build" (not "One will build")
- **Present tense**: "The agent evaluates" (not "The agent will evaluate")

### Technical Terms
- Define on first use
- Link to concept pages
- Use consistent terminology

### Examples
- Use realistic scenarios
- Show complete context
- Include expected outputs
- Provide error examples

---

## Quality Checklist

Before publishing documentation, verify:

- [ ] Title and description are clear and concise
- [ ] Business value is stated upfront (for use cases)
- [ ] All code examples are tested and work
- [ ] Both TypeScript and JavaScript examples provided (when applicable)
- [ ] Validation steps included (for tutorials)
- [ ] Cross-links to related pages included
- [ ] "Next steps" section with clear paths forward
- [ ] Troubleshooting or FAQs for common issues
- [ ] Consistent formatting throughout
- [ ] No spelling or grammar errors

---

## Getting Help

Questions about these templates? 

- Review existing documentation for examples
- Check [Stripe's documentation best practices](https://stripe.com/docs) for inspiration
- Reach out to the documentation team

---

## Contributing

When updating templates:

1. Maintain consistency with other templates
2. Include complete, working examples
3. Test all code snippets
4. Update this README if adding new templates
5. Consider backward compatibility with existing docs

