# CLAUDE.md - O-Network Node Development Guide

> Context-engineered guide for AI agents building O-Network nodes. Use Copass MCP queries to get up-to-date, detailed information for each section.

## ABSOLUTE RULE: All Communication Uses `node.use()`

**Every interaction with an address in the Olane OS ecosystem MUST go through an olane node's `use()` method.** There is no other way to communicate with an address. You cannot call addresses directly, import them as functions, or bypass the node. The `use()` method is the single, mandatory communication primitive.

```typescript
// THE way to communicate with ANY address:
const response = await node.use(targetAddress, {
  method: 'method_name',
  params: { key: 'value' },
});

// Response structure — ALWAYS access via result:
response.result.success; // boolean
response.result.data; // payload on success
response.result.error; // message on failure
```

This applies everywhere: node-to-node calls, parent-to-child routing, tests, external service integration. If you're talking to an address, you're calling `node.use()`. No exceptions.

## Critical Rules

- **NEVER** override `start()` — use `hookInitializeFinished()` and `hookStartFinished()`
- **NEVER** return `{ success: false, error: ... }` — throw errors instead
- **NEVER** wrap returns in `{ success: true, result: ... }` — return raw data
- **NEVER** create nested addresses in constructors — the system creates them at registration
- **ALWAYS** use `pnpm`, not `npm`
- **ALWAYS** communicate with addresses via `node.use()` — no exceptions

---

## Table of Contents

1. [Project Overview & Quick Start](#1-project-overview--quick-start)
2. [Architecture & Patterns](#2-architecture--patterns)
3. [Building Nodes](#3-building-nodes)
4. [Parent-Child System](#4-parent-child-system)
5. [Method Discovery](#5-method-discovery)
6. [Development & Publishing](#6-development--publishing)
7. [Testing](#7-testing)
8. [Integration & Networking](#8-integration--networking)
9. [Best Practices & Troubleshooting](#9-best-practices--troubleshooting)
10. [Configuration Reference](#10-configuration-reference)
11. [Complete Example](#11-complete-example)
12. [Quick Reference](#12-quick-reference)

---

## 1. Project Overview & Quick Start

**Copass Query:** `context_query` with query: _"What is the o-node-template and what is its purpose in the Olane OS ecosystem? What is the project structure, what are the essential commands, and what are the key package.json dependencies?"_

---

## 2. Architecture & Patterns

**Copass Query:** `context_query` with query: _"What are the three node types in Olane OS (oNodeTool, OlaneTool, McpTool)? When should each be used? What is the difference between the simple pattern and the parent-child pattern, and when should I choose each?"_

---

## 3. Building Nodes

**Copass Query:** `context_query` with query: _"How do I build an Olane node? Show me the tool class structure, the lifecycle flow (hookInitializeFinished, hookStartFinished, stop), validation patterns, and how to call other tools using node.use(). Remember: all communication to any address MUST go through node.use()."_

---

## 4. Parent-Child System

**Copass Query:** `context_query` with query: _"How does the parent-child (manager/worker) system work in Olane OS? Show me manager implementation, worker implementation, hook injection for child registration, and how parents route requests to children using node.use(). How are simple addresses resolved to nested addresses at runtime?"_

---

## 5. Method Discovery

**Copass Query:** `context_query` with query: _"How does method discovery work in Olane OS? What is the \_tool_ prefix convention? How do I define method definitions with oMethod, including parameter types (string, number, boolean, array, object, enum)? How do I wire methods into a tool constructor?"\_

---

## 6. Development & Publishing

**Copass Query:** `context_query` with query: _"What is the development workflow for Olane OS nodes? How do I set up, build, test, lint, and publish packages? How does the monorepo work with Lerna and pnpm? What does the CI/CD pipeline look like?"_

---

## 7. Testing

**Copass Query:** `context_query` with query: _"How do I test Olane OS nodes? What is the correct response assertion pattern for node.use() calls (response.result.success, response.result.data, response.result.error)? Show me unit test structure and parent-child testing patterns. What are the common mistakes when asserting on responses?"_

**Critical reminder for tests:** All test interactions with nodes go through `node.use()`. Access results via `response.result.success`, `response.result.data`, `response.result.error` — never directly on `response`.

---

## 8. Integration & Networking

**Copass Query:** `context_query` with query: _"What are the core @olane package dependencies and their purposes? How does Lane support (OlaneTool) work? How does MCP integration (McpTool) work? How does network discovery via libp2p work? How do nodes communicate across the network using node.use()?"_

---

## 9. Best Practices & Troubleshooting

**Copass Query:** `context_query` with query: _"What are the critical rules and best practices for building Olane OS nodes? What are the most common mistakes (method not discovered, start() overridden, child not registering, service not ready, module format mismatch) and their solutions? How do I troubleshoot build errors, type errors, and test timeouts?"_

---

## 10. Configuration Reference

**Copass Query:** `context_query` with query: _"What are the configuration options for Olane OS nodes? What does oNodeToolConfig look like? What environment variables are used? What are the lifecycle hooks (hookInitializeFinished, hookStartFinished, stop) and when does each fire?"_

---

## 11. Complete Example

**Copass Query:** `context_query` with query: _"Show me a complete working example of an Olane OS parent-child node (like a browser session manager). Demonstrate all key patterns: lifecycle hooks, parent-child with hook injection, resource limits, state isolation, request routing via node.use(), cascading cleanup, error handling (throw not return), and raw data returns."_

---

## 12. Quick Reference

**Copass Query:** `context_query` with query: _"Give me the Olane OS quick reference: decision flowcharts for choosing base class and simple vs parent-child, common task cookbook (create tool, initialize service, create child, call another tool via node.use()), and links to resources."_

---

## Summary

**The single most important thing:** All communication to any address goes through `node.use()`. Everything else flows from that.

**Core rules:**

- Use `pnpm`, not npm
- Never override `start()` — use hooks
- Throw errors, return raw data
- Access responses via `response.result.success`, `response.result.data`, `response.result.error`
- Inject hooks for child registration
- Isolate state between children
- Cascade cleanup from parent to children

**Start simple, scale to complex as needed.**

<!-- Copass:START -->
## Copass — Ontology knowledge graph

Copass context is automatically injected via hook on every message. Use it to scope your work.

- If you need deeper context, call `context_query` with `detail_level: "detailed"` or `search_entities`
- For planning/architecture, call `get_score` first to check readiness
- If Copass returns thin results, proceed with code exploration but note the gap

**After meaningful work:** call `ingest_text` or `ingest_code` to feed new knowledge back. Do this when you discover architecture decisions, new concepts, user-shared context, or corrections. Do NOT ingest trivial changes or ephemeral debugging context.
<!-- Copass:END -->
