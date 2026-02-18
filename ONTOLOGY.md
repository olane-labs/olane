# Olane Ontology

> A formal description of the entities, relations, and principles composing the Olane distributed operating system.

---

## I. Primitive Categories

Olane's universe is constructed from five primitive categories. Every entity in the system is an instance of, or derives from, one of these.

### Address

An **Address** (`oAddress`) is the irreducible identity of a thing in Olane. It takes the form `o://<name>` and is the only means by which one entity can refer to another. Addresses are not locations — they are names. A node's address does not describe where it lives on a network; it describes *what it is called* within the system's namespace.

Addresses are **flat at birth** and **hierarchical at registration**. A node is constructed with a simple name (`o://session-42`), but when it is adopted by a parent, the system rewrites its address into a nested path (`o://browser/session-42`). This means identity is partly determined by lineage — a node's full name encodes its parentage.

*Defined in:* `o-protocol`

### Request

A **Request** (`oRequest`) is an intention expressed by one entity toward another. It names a method and carries parameters. Requests are the sole causal mechanism in Olane — nothing happens unless a request is made. They follow JSON-RPC 2.0 structure: an `id` for correlation, a `method` for intent, and `params` for context.

*Defined in:* `o-core`

### Response

A **Response** (`oResponse`) is the consequence of a request. It carries a `result` envelope containing three fields: `success` (whether the intention was fulfilled), `data` (the substance of fulfillment), and `error` (the reason for failure). Every interaction in Olane terminates in a response. There are no fire-and-forget messages.

*Defined in:* `o-core`

### Method

A **Method** (`oMethod`) is a declared capability — a named action that a tool can perform, along with a description of what it does, what it requires (parameters), and what it yields. Methods exist independently of the code that implements them; they are specifications that enable discovery. An AI agent or human can read a method definition and understand what a tool offers without inspecting its implementation.

*Defined in:* `o-protocol`

### Parameter

A **Parameter** (`oParameter`) is the atomic unit of a method's contract. It declares a name, a type, whether it is required, a default value, and example values. Parameters make methods machine-readable — they are what allow an AI agent to construct valid requests without human guidance.

*Defined in:* `o-protocol`

---

## II. Entity Hierarchy

The system's entities form a strict inheritance hierarchy. Each level adds a new essential property to the one below it.

```
Thing
 └── Node                    — has an Address, can send and receive
      └── Tool               — has Methods, can be invoked
           └── LaneTool      — has Intent resolution, can reason about which Methods to call
           └── McpTool       — has a Bridge, can proxy external MCP servers as native Methods
```

### Thing (implicit)

The most general category. Anything that exists in Olane is a Thing. Things have no inherent behavior — they are the substrate from which all else is composed.

### Node (`o-node`)

A **Node** is a Thing that has been given an Address and the ability to communicate. Nodes participate in a peer-to-peer network via libp2p. They can `use()` other nodes (send requests), `connect()` to peers, and maintain a lifecycle (`start` → `initialize` → `register` → `running` → `stop`).

Nodes are the atoms of the Olane network. Every participant — whether a simple utility, a complex AI orchestrator, or the operating system itself — is a Node.

**Essential properties:**
- `address` — its identity in the namespace
- `leader` — the root node it reports to
- `parent` — the node that spawned it (if any)
- `status` — its lifecycle state

### Tool (`o-tool`)

A **Tool** is a Node that has declared its capabilities through Methods. While a bare Node can communicate, a Tool can be *invoked* — other entities can call its methods by name. Tools are the workhorses of the system.

All exposed methods on a Tool must be prefixed with `_tool_` to distinguish them from internal behavior. This naming convention is the boundary between public interface and private implementation.

**Essential properties (added):**
- `methods` — a map of method names to `oMethod` definitions
- `description` — a natural-language statement of purpose, readable by AI agents

### LaneTool (`o-lane`)

A **LaneTool** is a Tool that has been given the power of intent resolution. Rather than requiring a caller to name a specific method, a LaneTool can receive a natural-language intent and determine — through AI reasoning — which of its methods (or combination thereof) best fulfills that intent.

LaneTools advertise **capabilities** (Evaluate, Search, MultipleStep) that describe the *kinds* of reasoning they can perform, not just the specific methods they expose.

**Essential properties (added):**
- `capabilities` — declared reasoning patterns
- `laneContext` — state for multi-step intent resolution
- `intentEncoder` — mechanism for translating intent into method selection

### McpTool (`o-mcp`)

An **McpTool** is a Tool that does not implement its own methods but instead bridges to an external MCP (Model Context Protocol) server. It auto-discovers the external server's tools and resources and exposes them as native Olane methods. An McpTool is a translation layer — it makes foreign capabilities speak the `o://` protocol.

**Essential properties (added):**
- `mcpServerPath` — location of the external MCP server
- `mcpServerArgs` — configuration for the external server

---

## III. Relations

Entities in Olane are connected by a small set of fundamental relations.

### parentOf / childOf

A Node may spawn other Nodes. The spawning node becomes the **parent**, and the spawned node becomes the **child**. This relation is encoded in the address namespace: a child of `o://browser` named `session-1` receives the address `o://browser/session-1` upon registration.

Parent-child is the primary structuring relation in Olane. It enables:
- **Isolation** — each child has independent state and configuration
- **Lifecycle coupling** — stopping a parent cascades to all children
- **Namespace scoping** — children are addressable as sub-paths of their parent

### leaderOf / registeredWith

Every Node in a running Olane network is registered with a **Leader** (`o-leader`). The Leader is the root of the network's registry — it knows every node's address, methods, and status. This is not a hierarchical authority relation but a discovery relation: the Leader enables nodes to find each other.

### uses

When Node A sends a Request to Node B, A **uses** B. This is the fundamental interaction relation. It is transitive in effect (A uses B, B uses C, therefore A's intent flows through C) but not in identity (A does not have a direct relation with C).

### dependsOn

At the package level, `dependsOn` describes which packages require which others to function. This relation is strictly acyclic and defines the system's layered architecture.

### bridges

An McpTool **bridges** an external MCP server into the Olane namespace. This relation crosses system boundaries — it connects Olane's `o://` address space with external tool ecosystems.

### approves / gates

The Approval system (`o-approval`) introduces a **gates** relation: certain actions cannot proceed without human approval. This is a control-flow relation that interposes a human decision point between a request and its execution.

---

## IV. Strata

The packages composing Olane form five strata, ordered by abstraction. Each stratum depends only on those below it.

### Stratum 0 — Specification

The formal contracts that define what Olane *is*, independent of implementation.

| Package | Role | Defines |
|---------|------|---------|
| **o-protocol** | Protocol schema | `oAddress`, `oMethod`, `oParameter`, `oRouter`, `oHandshake`, `oRegister`, `oDependency` |

This stratum has no dependencies. It is pure definition.

### Stratum 1 — Substrate

The runtime machinery that makes communication possible.

| Package | Role | Provides |
|---------|------|----------|
| **o-core** | Communication engine | `oRequest`, `oResponse`, `oConnection`, transports, routers, streaming, JSON-RPC handling |
| **o-config** | Network configuration | libp2p transport setup (TCP, WebSocket, WebTransport), encryption (noise), peer discovery (DHT, mDNS) |

These packages implement the protocol but do not define any tools or nodes. They are the plumbing.

### Stratum 2 — Abstraction

The base classes from which all participants in the network are built.

| Package | Role | Provides |
|---------|------|----------|
| **o-tool** | Tool abstraction | `oTool`, `oToolBase`, `RunTool` — what it means to be callable |
| **o-node** | Node abstraction | `oNode`, `oNodeTool`, `oNodeAddress`, hierarchy management — what it means to be addressable and networked |

Everything above this stratum is a specialization of Node or Tool.

### Stratum 3 — Capability

Packages that add higher-order behavior to the base abstractions.

| Package | Role | Adds |
|---------|------|------|
| **o-lane** | Intent resolution | AI-driven method selection, capability advertising, multi-step workflows |
| **o-gateway-interface** | Gateway contract | Abstract interface for request routing between nodes |
| **o-gateway-olane** | Gateway implementation | `oGatewayResolver` — concrete routing logic for the `o://` protocol |
| **o-leader** | Network root | `LeaderNode` — registry, discovery, coordination of all nodes |

### Stratum 4 — Service

Concrete services that provide specific functionality to the network.

| Package | Role | Function |
|---------|------|----------|
| **o-storage** | Persistence | Key-value storage with pluggable providers (memory, filesystem, OS config) |
| **o-intelligence** | Reasoning | LLM access (Ollama, OpenAI, Anthropic, Gemini, Grok, Perplexity) for completion, embedding, image generation |
| **o-server** | HTTP interface | REST API exposing node methods to the web via Express + JWT auth |
| **o-client-limited** | Constrained access | Lightweight client for browsers and restricted devices via circuit relay |
| **o-login** | Identity | Human and AI agent authentication, session management |
| **o-approval** | Safety | Human-in-the-loop gating for sensitive operations |
| **o-monitor** | Observability | Heartbeat, node health, libp2p metrics, Prometheus export |
| **o-mcp** | External bridging | Bridges MCP servers into the Olane namespace |
| **o-tool-registry** | Discovery | Semantic search over tool methods using embeddings and vector store |
| **o-tools-common** | Shared utilities | Initialization helpers, encryption, common patterns for tool developers |
| **o-test** | Testing | Mock factories, fixtures, assertions — orthogonal to runtime strata |

### Stratum 5 — System

The operating system itself.

| Package | Role | Function |
|---------|------|----------|
| **o-os** | Operating system | Bootstraps the leader, registers all system services, starts the network — the top of the dependency graph |

---

## V. Axioms

These are the invariant principles that govern the system. Violations of these axioms produce undefined behavior.

### 1. The Lifecycle Axiom

> **`start()` is sacred.** No entity may override the `start()` method. Initialization logic belongs in `hookInitializeFinished()` (for service setup) or `hookStartFinished()` (for background tasks and child creation). The lifecycle sequence `start → initialize → hookInitializeFinished → register → hookStartFinished → RUNNING` is inviolable.

### 2. The Error Axiom

> **Failure is expressed through exceptions, not return values.** A tool method throws an error on failure and returns raw data on success. The base class handles wrapping returns into the `{ success, data, error }` response envelope. No tool method may construct its own success/failure wrapper.

### 3. The Address Axiom

> **Addresses are born simple and become hierarchical.** A node's constructor receives a flat address (`o://name`). Hierarchical addresses (`o://parent/child`) are created by the system during parent-child registration. No entity may construct a nested address directly.

### 4. The Response Axiom

> **All interactions are synchronous in structure.** Every request yields exactly one response. The response is accessed via `response.result.success`, `response.result.data`, and `response.result.error`. There are no unacknowledged messages.

### 5. The Discovery Axiom

> **A tool's methods are its public identity.** Methods prefixed with `_tool_` are automatically discovered and exposed. Methods without this prefix are invisible to the network. A tool's `description` and `methods` definitions are sufficient for an AI agent to use it without prior knowledge.

### 6. The Cascade Axiom

> **A parent's death is inherited by its children.** When a parent node stops, all its children must be stopped. State cleanup flows downward through the hierarchy. No orphan nodes may persist after a parent's termination.

---

## VI. The Dual Nature of Olane

Olane exhibits a fundamental duality: it is both a **protocol** and an **operating system**.

As a **protocol**, it defines how entities identify themselves (Addresses), declare their capabilities (Methods), express intentions (Requests), and report outcomes (Responses). This protocol is substrate-independent — it could, in principle, run on any transport, any language, any machine.

As an **operating system**, it provides the concrete services that a running distributed system needs: storage, intelligence, identity, safety, monitoring, and discovery. These services are themselves nodes in the network, addressable and callable like any user-created tool. The OS does not sit *above* the tools it manages — it sits *among* them, as a first-class participant in its own protocol.

This means Olane is **self-hosting** in a conceptual sense: the operating system is described by the same ontology as the tools it runs. A storage service is a Tool. The leader is a Node. Authentication is a LaneTool. There is no privileged category of "system" entity — only nodes with particular responsibilities.

---

## VII. Dependency Graph

```
o-protocol ─────────────────────────────────────────────────────────────┐
    │                                                                    │
o-core ──────────────────────────────────────────────────────────┐      │
    │                                                             │      │
o-config (independent) ────────────────────────────────────┐     │      │
    │                                                       │     │      │
o-tool ←─── o-config + o-core + o-protocol                 │     │      │
    │                                                       │     │      │
o-node ←─── o-tool + o-core + o-config + o-protocol        │     │      │
    │                                                       │     │      │
    ├── o-lane ←─── o-node + o-storage                     │     │      │
    │     │                                                 │     │      │
    │     ├── o-intelligence ←─── o-lane                   │     │      │
    │     ├── o-login ←─── o-lane                          │     │      │
    │     ├── o-approval ←─── o-lane                       │     │      │
    │     └── o-monitor ←─── o-lane + o-storage            │     │      │
    │                                                       │     │      │
    ├── o-storage ←─── o-node                              │     │      │
    │                                                       │     │      │
    ├── o-gateway-interface ←─── o-tool                    │     │      │
    ├── o-gateway-olane ←─── o-node + o-gateway-interface  │     │      │
    │                                                       │     │      │
    ├── o-leader ←─── o-node + o-lane + o-gateway-olane    │     │      │
    │                                                       │     │      │
    ├── o-server ←─── o-core                               │     │      │
    ├── o-client-limited ←─── o-node                       │     │      │
    │                                                       │     │      │
    ├── o-mcp ←─── o-lane + o-leader + o-intelligence      │     │      │
    ├── o-tools-common ←─── o-lane + o-leader + o-storage  │     │      │
    ├── o-tool-registry ←─── o-lane + o-intelligence       │     │      │
    │                                                       │     │      │
    └── o-os ←─── (nearly everything above)                │     │      │
                                                            │     │      │
o-test ←─── o-core (orthogonal to runtime)                 │     │      │
```

---

## VIII. Glossary

| Term | Definition |
|------|-----------|
| **Address** | A unique `o://` identifier for a node in the network |
| **Capability** | A declared reasoning pattern (Evaluate, Search, MultipleStep) that a LaneTool can perform |
| **Child** | A node spawned by and registered under a parent node |
| **Gateway** | A resolver that routes requests between nodes based on address |
| **Hook** | A lifecycle extension point (`hookInitializeFinished`, `hookStartFinished`) for custom initialization |
| **Intent** | A natural-language expression of what a caller wants, resolved by a Lane into specific method calls |
| **Lane** | The AI reasoning layer that maps intents to tool methods |
| **Leader** | The root node of the network that maintains the registry of all active nodes and their methods |
| **Method** | A declared, named capability on a tool, with typed parameters and descriptions |
| **Node** | An addressable participant in the peer-to-peer network |
| **Parent** | A node that has spawned and manages child nodes |
| **Request** | A JSON-RPC message expressing a caller's intention toward a target node |
| **Response** | The result of a request, containing success status, data, and optional error |
| **Stratum** | A layer in the dependency hierarchy, where each layer depends only on those below |
| **Tool** | A node that has declared methods and can be invoked by other nodes |

---

*This ontology describes Olane v0.8.3.*
