# New Documentation Pages Checklist

**Status**: Pending Creation  
**Total New Pages**: 22  
**Related**: MINT_JSON_CHANGES.md

---

## Priority 1: Critical for Launch 🔴

**Deadline**: Before documentation site goes live  
**Estimated Time**: 2-3 days

### Agent-Agnostic Design Pages (NEW SECTION)

- [ ] **agents/overview.mdx**
  - Template: concept-page.md
  - Content: Explain human vs AI agents, unified interface
  - Key message: Tools serve both through natural language
  - Include: Diagram showing both agent types → tools

- [ ] **agents/human-interfaces.mdx**
  - Template: concept-page.md
  - Content: CLI usage, web UI patterns, API endpoints
  - Examples: Human invocation methods
  - Include: Terminal examples, UI mockups

- [ ] **agents/ai-integration.mdx**
  - Template: concept-page.md
  - Content: Programmatic usage, SDK integration
  - Examples: AI agent code patterns
  - Include: TypeScript/Python examples

- [ ] **agents/hybrid-workflows.mdx**
  - Template: use-case-overview.md
  - Content: Human-initiated, AI-executed patterns
  - Examples: Real-world hybrid scenarios
  - Include: Flow diagrams

- [ ] **agents/agent-agnostic-design.mdx**
  - Template: concept-page.md
  - Content: Design principles for serving both
  - Guidelines: Building tools that work for human + AI
  - Include: Best practices checklist

### Core Value Pages

- [ ] **why-olane.mdx**
  - Template: Custom (value proposition)
  - Content: Business value, ROI, competitive advantages
  - Metrics: Cost savings, time savings, reliability
  - Include: Comparison table vs alternatives
  - Reference: PACKAGE_ARCHITECTURE_CONTEXT.md (Core Value Propositions)

- [ ] **use-cases/cost-optimization.mdx**
  - Template: use-case-overview.md
  - Content: Generalist-specialist ROI, model sharing
  - Metrics: 70-90% cost reduction
  - Examples: Cost calculations, before/after
  - Reference: PACKAGE_ARCHITECTURE_CONTEXT.md

### Critical Concept Pages

- [ ] **concepts/tools-nodes-applications.mdx**
  - Template: concept-page.md
  - Content: Three levels of granularity
  - Examples: Tool (method) vs Node (process) vs Application (multi-node)
  - Include: Decision tree, analogies
  - Reference: TOOL_NODE_APPLICATION_DISTINCTION.md (complete guide)

---

## Priority 2: Important for Quality 🟡

**Deadline**: Within 2 weeks of launch  
**Estimated Time**: 3-4 days

### Split Tool Node Guides

- [ ] **concepts/tool-nodes/simple-nodes.mdx**
  - Template: concept-page.md
  - Content: 1-5 tools, direct invocation, stateless
  - Examples: Currency converter, email sender
  - When to use: Single domain, known operations
  - Package: o-node + o-tool

- [ ] **concepts/tool-nodes/complex-nodes.mdx**
  - Template: concept-page.md
  - Content: 5-20+ tools, intent-driven, stateful
  - Examples: Financial analyst, data pipeline
  - When to use: Complex domain, autonomous execution
  - Package: o-node + o-tool + o-lane

### Package Documentation

- [ ] **packages/package-combinations.mdx**
  - Template: concept-page.md
  - Content: Common usage patterns
  - Examples: 
    - Minimal (o-core only)
    - Basic (o-core + o-node)
    - Specialized (+ o-tool)
    - Intent-driven (+ o-lane)
    - Multi-node (+ o-leader)
  - Include: When to use each combination
  - Reference: PACKAGE_ARCHITECTURE_CONTEXT.md (Typical Usage Combinations)

- [ ] **packages/o-os.mdx**
  - Template: api-reference.md
  - Content: OlaneOS runtime documentation
  - API: OlaneOS class, methods, configuration
  - Examples: Creating/starting/stopping OS instances
  - Reference: OLANE_OS_ARCHITECTURE.md

### Development Guides

- [ ] **dev/development-workflow.mdx**
  - Template: concept-page.md
  - Content: End-to-end development cycle
  - Steps: Setup → Build → Test → Deploy
  - Tools: CLI, debugging, monitoring
  - Include: Development environment setup

- [ ] **dev/testing-simple-nodes.mdx**
  - Template: testing-page.md
  - Content: Testing strategies for simple nodes
  - Examples: Unit tests, integration tests
  - Patterns: Direct tool invocation testing
  - Tools: Jest, testing utilities

- [ ] **dev/testing-complex-nodes.mdx**
  - Template: testing-page.md
  - Content: Testing intent-driven nodes
  - Examples: Intent testing, capability loop mocking
  - Patterns: Streaming, multi-step workflows
  - Tools: Intent simulation, lane testing

- [ ] **dev/testing-multi-node-apps.mdx**
  - Template: testing-page.md
  - Content: Application-level testing
  - Examples: Network testing, discovery testing
  - Patterns: Leader + worker coordination
  - Tools: Test networks, mocking

- [ ] **dev/production-deployment.mdx**
  - Template: concept-page.md
  - Content: Production best practices
  - Topics: Docker, Kubernetes, monitoring, scaling
  - Examples: Deployment configurations
  - Checklist: Pre-deployment verification

---

## Priority 3: Nice to Have 🟢

**Deadline**: Next month  
**Estimated Time**: 2-3 days

### Advanced Architecture Guides

- [ ] **guides/multi-leader-federation.mdx**
  - Template: concept-page.md
  - Content: Scaling with multiple leaders
  - Patterns: Regional leaders, hierarchical leaders
  - Examples: Global deployment architecture
  - When to use: Geographic distribution, scale

- [ ] **guides/custom-capabilities.mdx**
  - Template: concept-page.md
  - Content: Extending o-lane capability system
  - Examples: Custom capability types
  - API: Creating capability classes
  - Use cases: Domain-specific operations

- [ ] **guides/security-best-practices.mdx**
  - Template: concept-page.md
  - Content: Security guidelines
  - Topics: Authentication, authorization, encryption
  - Examples: Secure node configuration
  - Checklist: Security audit points

- [ ] **guides/observability-monitoring.mdx**
  - Template: concept-page.md
  - Content: Production monitoring
  - Topics: Metrics, logging, tracing, alerting
  - Tools: Prometheus, Grafana, OpenTelemetry
  - Examples: Dashboard configurations

---

## Content Templates to Use

### For Concept Pages
Use: `docs/templates/concept-page.md`
- Start with clear definition
- Explain "why it matters"
- Provide concrete examples
- Show both simple and complex cases
- Link to related concepts

### For Use Case Pages
Use: `docs/templates/use-case-overview.md`
- Lead with business value
- Show before/after comparison
- Include quickstart example
- Provide real-world scenarios
- Link to related guides

### For API Reference
Use: `docs/templates/api-reference.md`
- Complete parameter documentation
- Show request/response examples
- Document error cases
- Include code examples in multiple languages
- Cross-reference related APIs

### For Testing Pages
Use: `docs/templates/testing-page.md`
- Show testing alongside implementation
- Include complete working tests
- Cover unit, integration, e2e patterns
- Provide debugging tips
- Link to related testing docs

---

## Writing Guidelines

### Agent-Agnostic Language

Always clarify that agents can be human OR AI:

✅ **Correct:**
- "Agents (human or AI) send intents to tool nodes"
- "Both human and AI agents use the same interface"
- "Human agents via CLI, AI agents programmatically"

❌ **Incorrect:**
- "AI agents send intents" (excludes humans)
- "LLMs interact with tools" (too narrow)
- "Agents" without clarifying human/AI on first mention

### Code Examples

Show BOTH invocation methods where relevant:

```markdown
## Example

### Human Agent (CLI)
\`\`\`bash
olane intent "Analyze Q4 sales"
\`\`\`

### AI Agent (Programmatic)
\`\`\`typescript
await toolNode.use({
  method: 'intent',
  params: { intent: 'Analyze Q4 sales' }
});
\`\`\`
```

### Progressive Disclosure

Structure: Overview → Simple → Complex → Advanced

1. **TL;DR** - One sentence summary
2. **Quick Start** - Working example
3. **How It Works** - Explanation
4. **API Reference** - Complete details
5. **Advanced** - Edge cases, optimization

---

## Content Checklist for Each Page

Before marking a page as complete, verify:

- [ ] Clear TL;DR at the top
- [ ] Working code example within first 3 paragraphs
- [ ] Both human and AI agent examples (where relevant)
- [ ] Cross-links to related pages
- [ ] Diagrams or visual aids
- [ ] Troubleshooting section
- [ ] "Next steps" or "Related" section at bottom
- [ ] All code tested and copy-pasteable
- [ ] Follows agent-agnostic terminology
- [ ] Optimized for skimming (bold, headings, lists)

---

## Quality Standards

### Per Lee Robinson's Guidelines

- **Be concise**: Every word should add value
- **Avoid jargon**: Explain technical terms on first use
- **Working examples**: All code must be tested
- **Progressive disclosure**: Simple → Advanced
- **Code-first**: Show don't tell

### Per Agent Terminology Guide

- **Agent-inclusive**: Mention human + AI where relevant
- **Unified interface**: Emphasize same tool serves both
- **Future-proof**: Works today with humans, scales with AI
- **Broader positioning**: Not just "AI orchestration"

---

## Estimated Timeline

### Week 1 (Priority 1)
- Days 1-2: Agent-agnostic section (5 pages)
- Day 3: Core value pages (2 pages)
- Day 4: Critical concept page (1 page)
- Day 5: Review and polish

### Week 2 (Priority 2)
- Days 1-2: Tool node guides (2 pages)
- Day 3: Package documentation (2 pages)
- Days 4-5: Development guides (5 pages)

### Week 3-4 (Priority 3)
- Spread over 2 weeks: Advanced guides (4 pages)
- Buffer time for revisions and feedback

**Total Estimated Time**: 3-4 weeks for all pages

---

## Review Process

### Before Publishing Each Page

1. **Technical Review** - Verify code examples work
2. **Content Review** - Check against templates and guidelines
3. **Terminology Review** - Verify agent-agnostic language
4. **Link Check** - Ensure all cross-references work
5. **Preview** - Test rendering in Mintlify
6. **Accessibility** - Check alt text, headings, contrast

### Reviewers Needed

- Technical accuracy: Engineering lead
- Content quality: Documentation lead  
- Terminology consistency: Product lead
- User perspective: Beta users

---

## Success Metrics

### Qualitative
- [ ] Evaluators understand value within 5 minutes
- [ ] Developers can build first tool node in 30 minutes
- [ ] Architects can design multi-node systems confidently
- [ ] Agent-agnostic design is clear and compelling

### Quantitative
- Time to first working example: < 10 minutes
- Documentation satisfaction score: > 4.0/5.0
- Support ticket reduction: 30%+
- Completion rate of quickstart: > 60%

---

## Notes for Writers

### Reference Documents

Keep these open while writing:

1. **AGENT_TERMINOLOGY_GUIDE.md** - For consistent agent language
2. **TOOL_NODE_APPLICATION_DISTINCTION.md** - For architectural clarity
3. **PACKAGE_ARCHITECTURE_CONTEXT.md** - For package relationships
4. **OLANE_OS_ARCHITECTURE.md** - For OS-level concepts
5. **Relevant template** - For structure

### Common Pitfalls to Avoid

1. ❌ Using "AI agents" exclusively (include humans!)
2. ❌ Showing only programmatic examples (show CLI too!)
3. ❌ Jumping to advanced concepts too quickly
4. ❌ Missing the "why this matters" upfront
5. ❌ Code examples that don't actually run
6. ❌ Assuming prior knowledge of concepts

### Writing Tips

- **Start with value**: Why should reader care?
- **Show then explain**: Code first, details after
- **Use analogies**: Link to familiar concepts
- **Break up walls of text**: Headings, lists, diagrams
- **End with action**: Clear next step

---

**Status**: Ready to Begin  
**Next Action**: Start with Priority 1 pages  
**Owner**: Documentation team

---

**Last Updated**: October 1, 2025  
**Related**: MINT_JSON_CHANGES.md, templates/

