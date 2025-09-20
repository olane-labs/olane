TLDR; we created a forked MCP version that is faster, better, and cheaper. [Link to get started]

## What is MCP Missing?

### **Today / Problem Description**

MCP servers are built to enable LLM / AI systems to synthesize workflows from complex tasks. This means MCPs will work great if…

1. You have built your MCP well (example: *as an intention-based tool, not as an API wrapper)*
    1. *You actively maintain* documentation to support *how* to use your services
    2. LLM / AI understands how to synthesize plans around small workflows using the tools provided
2. You pay for intelligent models that can reason / do chain of thought processing.

Every LLM / AI system will need to rerun this, every time. Today it has no working memory on the workflows/plans it runs.

We asked ourselves…”why are these plans and workflows being thrown out?”

### **Olane + MCP = oMCP**

We have forked the MCP client & server to capture and re-use these workflows, reducing intelligence requirements and improving MCP completion by X%. [Link to the repo]

## How did we do this?

We centered our focus on these problems:

1. How can we enable smaller models to succeed just like bigger ones?
2. How can we reduce waste / reduce token usage?
3. How can we make AI - MCP usage more deterministic?
4. How can we improve the speed of MCP usage?

Like teaching a small child, we learned that by simply following the KISS model (KISS → “keep it simple stupid”), we achieved all of this and more. 

> Smaller AI models need less noise and more clear instruction to succeed. In other words, “spell it out for them”
> 

<aside>
💡

*Engaging / thoughtful hook? Brendon scratchpad*

How do you get the *right* context from an MCP server to complete your task?

- Do you just throw everything at it? → No, this is wasteful
- Do you try to condense the knowledge to cost optimize? → Maybe…but how without data loss
- Do you try to organize MCP usage and learn from similar use-cases? Let’s try it and see what happens…
</aside>

![normal-mcp.png](./docs/assets/normal-mcp.png)

![o-mcp-flow.png](./docs/assets/o-mcp-flow.png)

### Breaking it down further…

We combine large model successes + failures + a little search to help give small models a helping hand in achieving their dreams.

<aside>
💡

We learn from past successes & failures to create few shot RL guidelines on how to best utilize the MCP server. 

</aside>

**Example**: 

```
“Get my latest pull requests”
Results in the following steps:

1. Client connects to MCP server with an “intent” + “model”
2. The MCP server searches for past success, failure and relevant tool methods
3. Client receives the package and creates new "workflow" tool uses
4. Execute!
```

### So how does this meet our goals?

1. Smaller model support → more relevant / clear context is now achieved
2. Reduce token usage → avoid sending irrelevant context when possible / refine tool offerings & also reduce model size requirements
3. More deterministic → by learning from past failures & successes, we know how to stay within the bounds of success with clear guardrails
4. Speed improvement → less tokens to process = more speed

### Examples

1. Github example → what models can we test / prove to how it works?
2. Figma example → same as above ^^
3. Slack / more complex examples → same as above ^