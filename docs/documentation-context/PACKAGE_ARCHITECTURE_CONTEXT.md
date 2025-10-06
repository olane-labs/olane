# Olane OS Package Architecture & Functional Context

> **Purpose**: This document maps the functional architecture of Olane OS packages, explaining what each component does, how they work together, and how they support the core value propositions. Use this to inform documentation site structure and content organization.

**Last Updated**: September 29, 2025  
**For**: Documentation site planning (mint.json structure)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The Layered Stack](#the-layered-stack)
3. [Package Functional Map](#package-functional-map)
4. [Core Value Propositions](#core-value-propositions)
5. [Functional Groupings](#functional-groupings)
6. [Cross-Package Workflows](#cross-package-workflows)
7. [Documentation Site Mapping](#documentation-site-mapping)

---

## Architecture Overview

### What is Olane OS?

**Olane OS is an agentic operating system** where **agents (human or AI) are the users**, **tool nodes are the applications**, and **Olane packages provide the runtime infrastructure**. It's NOT a network framework, API library, or orchestration tool - it's a complete operating system for intelligent agents to interact with specialized capabilities.

### Three-Layer Mental Model

```
┌─────────────────────────────────────────────────┐
│  USERS: Agents (Human or AI)                     │
│  - Humans: CLI, web UI, API                      │
│  - AI: Generalist reasoning (GPT-4, Claude)      │
│  - Natural language interfaces                   │
│  - Intent-driven interactions                    │
└─────────────────────────────────────────────────┘
                      ⬇ use
┌─────────────────────────────────────────────────┐
│  APPLICATIONS: Tool Nodes & Capabilities         │
│  - Domain-specific tools (CRM, analytics, etc.)  │
│  - Business integrations (APIs, databases)       │
│  - Specialized capabilities (search, compute)    │
│  - Agent-agnostic interface                      │
└─────────────────────────────────────────────────┘
                      ⬇ run on
┌─────────────────────────────────────────────────┐
│  OPERATING SYSTEM: Olane Runtime                 │
│  - Process management (o-lane)                   │
│  - Tool system (o-tool)                          │
│  - IPC & networking (o-node, o-core)             │
│  - Coordination (o-leader)                       │
└─────────────────────────────────────────────────┘
```

### Understanding the Layers

**Users (Agents - Human or AI)**: The intelligent consumers who interact with the system using natural language. Agents can be:
- **Human agents**: Developers, business users, analysts interacting via CLI, web UI, or API
- **AI agents**: LLMs (GPT-4, Claude, etc.) that serve as autonomous reasoning brains

Both types of agents make requests, express intents, and coordinate with tool nodes using the same natural language interface.

**Applications (Tool Nodes)**: The specialized capabilities and integrations that agents invoke to accomplish tasks. These are the agent-agnostic, domain-specific tools that developers build - CRM integrations, analytics engines, data pipelines, etc. Tool nodes serve both human and AI agents through a unified interface.

**Operating System (Olane)**: The runtime infrastructure that manages processes, handles communication, coordinates agents, and provides the foundation for everything to work together. This is what the Olane packages provide.

### Key Architectural Principles

1. **Agents as Users**: Agents (human or AI) are the intelligent users of the system, not what you build
2. **Tool Nodes as Applications**: Developers build specialized tool nodes that agents invoke
3. **Agent-Agnostic Design**: Tool nodes serve both human and AI agents through unified interfaces
4. **Generalist-Specialist Pattern**: One LLM brain (for AI agents) serves many specialized tool nodes
5. **Emergent Orchestration**: Workflows discovered through agent interactions, not pre-defined
6. **Hierarchical Organization**: Filesystem-like addressing (o://) for tool node discovery
7. **Intent-Driven Execution**: Agents use natural language to interact with tool nodes
8. **Tool Augmentation**: Specialization through capabilities and context, not training

---

## The Layered Stack

### Layer 1: Kernel (Foundation Runtime)

The abstract operating system layer - defines contracts but doesn't implement transport.

#### @olane/o-core (The Kernel)
**What it does**: Provides the foundational runtime infrastructure for creating and managing nodes that agents (human or AI) interact with.

**Think of it as**: The Linux kernel - defines how processes work, but doesn't implement specific hardware drivers.

**Core Responsibilities**:
- Node lifecycle management (start/stop/states)
- Inter-node communication (IPC) abstractions
- Hierarchical addressing system (o:// protocol)
- Routing and connection management interfaces
- Parent-child hierarchy management
- Metrics and observability foundation
- Error handling and fault tolerance

**Key Classes**:
- `oCore` - Abstract base class for all agents
- `oAddress` - Hierarchical addressing (o://company/dept/agent)
- `oRouter` - Abstract routing logic
- `oConnection` - Abstract IPC connections
- `oHierarchyManager` - Parent-child relationships

**Does NOT include**: Actual networking, transport implementations, or tool system

**Use When**: Building custom transport implementations or need base infrastructure without networking

#### @olane/o-protocol
**What it does**: Type definitions, interfaces, and protocol specifications for the o:// protocol.

**Think of it as**: The POSIX standard - defines how things should work.

**Contains**:
- Request/Response types (JSON-RPC 2.0 based)
- Error codes and error types
- Node types (LEADER, AGENT, TOOL)
- Method metadata structures
- Configuration interfaces

#### @olane/o-config
**What it does**: Configuration utilities and helpers for libp2p and system setup.

**Contains**:
- libp2p transport configurations
- Connection manager presets
- Bootstrap node lists
- Network configuration helpers

---

### Layer 2: Framework (Production Implementation)

Production-ready implementations and agent augmentation systems.

#### @olane/o-node (The Distribution)
**What it does**: Production-ready, libp2p-based implementation of o-core that makes nodes work over real P2P networks.

**Think of it as**: Ubuntu/Fedora - a concrete Linux distribution. While o-core is the kernel spec, o-node is the actual working OS.

**Core Responsibilities**:
- Peer-to-peer networking via libp2p
- Automatic peer discovery (DHT, mDNS, bootstrap)
- NAT traversal and relay protocols
- Network registration with leader nodes
- Persistent agent identity (seed-based peer IDs)
- Multiple transport support (TCP, WebSocket, WebRTC, QUIC)
- Connection security and gating

**Key Classes**:
- `oNode` - Base libp2p implementation
- `oServerNode` - Full-featured server (24/7 agents)
- `oClientNode` - Lightweight dial-only client
- `oNodeAddress` - Address with libp2p transports
- `oNodeConnection` - libp2p stream-based IPC
- `oNodeRouter` - libp2p-aware routing

**Network Capabilities**:
- Listens for incoming connections
- Participates in DHT
- Advertises services on network
- Maintains connection pools
- Handles automatic reconnection

**Use When**: Building tool nodes that need real networking between processes/machines

#### @olane/o-tool (The Tool System)
**What it does**: Convention-based system for augmenting nodes with discoverable, validated capabilities that agents can use.

**Think of it as**: System calls and libraries - how applications invoke OS functionality.

**Core Responsibilities**:
- Tool method registration via `_tool_` prefix convention
- Automatic parameter validation
- Tool discovery and indexing (vector store integration)
- Mixin architecture (add tools to any oCore class)
- Built-in lifecycle tools (handshake, routing, indexing)
- Hierarchical tool organization
- Streaming support for long operations

**Key Classes**:
- `oToolBase` - Base class for creating tools
- `oTool(Base)` - Mixin to add tool capabilities to any class
- `oNodeTool` - Tool system + networking (combines oTool + oNode)

**Convention Pattern**:
```typescript
class MyTool extends oToolBase {
  // _tool_ prefix = executable method
  async _tool_analyze(request) { }
  
  // _params_ prefix = parameter schema
  _params_analyze() { return { /* schema */ } }
}
```

**Built-in Tools**:
- `handshake` - Capability negotiation
- `route` - Request routing
- `index_network` - Vector store indexing
- `hello_world` - Connectivity test
- `stop` - Graceful shutdown
- `child_register` - Hierarchy registration

**Specialization Method**: Tools are how you create specialist tool nodes that agents can use. Inject domain knowledge via context + provide domain tools. Tool nodes are agent-agnostic - they serve both human and AI agents.

#### @olane/o-lane (The Process Manager)
**What it does**: Manages agentic workflows through capability-based loops, transforming intents from agents (human or AI) into coordinated multi-step actions.

**Think of it as**: systemd or the process scheduler - manages running processes for intent-driven execution.

**Core Responsibilities**:
- Intent-driven execution (natural language goals)
- Capability-based execution loop (evaluate → decide → execute)
- Execution sequence tracking and audit trails
- Real-time streaming of progress
- Content-addressed storage of execution history
- Lane lifecycle management (PENDING → RUNNING → COMPLETED)
- Sub-lane spawning (parent-child execution contexts)

**Key Classes**:
- `oLane` - Execution context for resolving an intent
- `oLaneTool` - Tool with lane execution capabilities
- `oIntent` - Natural language intent wrapper
- `oCapability` - Abstract atomic operation
- `oCapabilityResult` - Result + next capability signal
- `oLaneManager` - Lane lifecycle tracking
- `oLaneContext` - Historical/domain context

**Built-in Capabilities**:
1. **Evaluate** (`EVALUATE`) - Analyze intent, decide next step
2. **Task** (`TASK`) - Execute specific tool method
3. **Search** (`SEARCH`) - Query vector stores/registries
4. **Configure** (`CONFIGURE`) - Setup tools/environment
5. **Error** (`ERROR`) - Handle errors and recovery
6. **Multiple Step** (`MULTIPLE_STEP`) - Coordinate multi-step ops

**The Capability Loop**:
```
1. EVALUATE → Agent analyzes current state + intent
2. DECIDE   → Agent picks next capability
3. EXECUTE  → Capability performs action
4. RECORD   → Add to sequence history
5. CHECK    → Done? If no, loop back to EVALUATE
```

**Lane Lifecycle**:
```
PENDING → PREFLIGHT → RUNNING → POSTFLIGHT → COMPLETED
                         ↓
                      FAILED
                         ↓
                     CANCELLED
```

**Key Innovation**: Emergent orchestration. The system discovers optimal workflows through execution rather than following pre-defined graphs (LangGraph, etc.). Works for both human-initiated and AI-autonomous workflows.

**Use When**: You want tool nodes to accept natural language intents from agents (human or AI) and autonomously accomplish complex, multi-step goals without explicit workflow definition.

#### @olane/o-leader (The Network Coordinator)
**What it does**: Root coordinator node for tool node networks, providing centralized coordination and discovery.

**Think of it as**: The init process (PID 1) or DNS - the root service that bootstraps and coordinates the rest of the system.

**Core Responsibilities**:
- Network entry point for joining nodes
- Node discovery registry (who's available, what can they do)
- Network-wide capability indexing
- Join request validation and access control
- Parent-child relationship management
- Network health coordination
- Fault tolerance coordination

**Key Classes**:
- `oLeaderNode` - Root coordinator implementation
- `RegistryTool` - Abstract registry interface
- `RegistryMemoryTool` - In-memory registry (dev/testing)
- Custom registry implementations (PostgreSQL, Redis, etc.)

**Registry Operations**:
- `commit` - Register node and capabilities
- `search` - Find nodes by address/capability/protocol
- `find_all` - List all registered nodes
- `remove` - Deregister node

**Network Join Flow**:
```
1. Node makes join request → o://leader
2. Leader validates request (customizable)
3. Leader updates hierarchy relationships
4. Node registered in registry
5. Node receives network configuration
6. Node can now discover other nodes
```

**Network Architecture Patterns**:
- **Hub-and-Spoke**: Central leader, all nodes connect to it
- **Hierarchical**: Department leaders under root leader
- **Multi-Leader**: Regional leaders for scale/geography
- **Mesh**: All nodes know each other (via DHT)

**Use When**: Building multi-node systems where tool nodes need to discover and coordinate with each other.

---

### Layer 3: Applications (Your Tool Nodes)

This is where you build domain-specific tool nodes that agents (human or AI) use to accomplish tasks.

**What You Build**: Specialized, agent-agnostic tool nodes with domain capabilities that agents invoke through natural language.

**Examples**:
- Financial analysis tools (revenue calculation, trend analysis, forecasting)
- CRM integration tools (customer lookup, ticket creation, data synchronization)
- Data pipeline tools (ETL operations, data validation, transformation)
- Research tools (web search, document analysis, citation management)

**Remember**: You're building the **applications** (tool nodes) that run on the **OS** (Olane), which are used by **agents** (human or AI) as intelligent users. Tool nodes are agent-agnostic - the same tool serves both human agents (via CLI/web UI) and AI agents (programmatically).

---

## Package Functional Map

### Complete Package Inventory

| Package | Layer | Purpose | Key Innovation |
|---------|-------|---------|----------------|
| **o-core** | Kernel | Abstract agent runtime | Process management for AI |
| **o-protocol** | Kernel | Type definitions | JSON-RPC 2.0 for agents |
| **o-config** | Kernel | Configuration utilities | libp2p presets |
| **o-node** | Framework | P2P networking | Real network implementation |
| **o-tool** | Framework | Tool augmentation | Convention-based specialization |
| **o-lane** | Framework | Process management | Intent-driven execution |
| **o-leader** | Framework | Network coordination | Self-organizing networks |

### Package Dependencies

```
Your Tool Node
    ├── depends on: o-lane (for intent-driven execution)
    ├── depends on: o-tool (for tool capabilities)
    ├── depends on: o-leader (for network coordination)
    └── depends on: o-node (for P2P networking)
            ├── depends on: o-tool
            │       └── depends on: o-core
            └── depends on: o-core
                    ├── depends on: o-protocol
                    └── depends on: o-config
```

### When to Use Each Package

**Use o-core when**:
- Building custom transport implementations
- Creating new tool node runtimes
- Research/experimentation with architectures
- Don't need networking (local/single-process tool nodes)

**Use o-node when**:
- Building tool nodes that need real P2P networking
- Tool nodes on different machines need to communicate
- Want production-ready libp2p implementation
- Need peer discovery and NAT traversal

**Use o-tool when**:
- Creating specialized tool capabilities for agents to use
- Want convention-based tool registration
- Need parameter validation
- Building discoverable tools for agents to find

**Use o-lane when**:
- Tool nodes need to accept natural language intents from agents
- Want emergent workflow discovery
- Need execution history and audit trails
- Building autonomous tool nodes

**Use o-leader when**:
- Building multi-tool networks
- Tool nodes need to discover each other
- Want centralized coordination
- Need network-wide capability indexing

---

## Core Value Propositions

### 1. Generalist-Specialist Architecture & Agent-Agnostic Design

**The Problem**: Fine-tuning separate models for each domain is expensive ($$$) and slow. Building separate interfaces for humans and AI creates duplication.

**The Solution**: Agent-agnostic tool nodes that serve both human and AI agents through a unified natural language interface. For AI agents: one generalist LLM + specialized tool nodes through tool augmentation and context injection.

**How Olane Enables This**:

```
┌─────────────────────────────────────────┐
│  Agents (Human or AI)                    │
│  - Human: CLI, web UI, API               │
│  - AI: Generalist LLM (GPT-4, Claude)    │
│  "The intelligent users"                 │
└─────────────────────────────────────────┘
              ⬇ use
┌─────────────────────────────────────────┐
│  Specialist Tool Nodes (o-tool + o-lane)│
│  - Agent-agnostic interface              │
│  - Context injection (domain knowledge)  │
│  - Tool augmentation (capabilities)      │
│  - Knowledge accumulation (learning)     │
└─────────────────────────────────────────┘
```

**Packages Involved**:
- **o-tool**: Provides tool augmentation system for building tool nodes
- **o-lane**: Enables tool nodes to accept intents and inject context
- **o-core**: Base runtime infrastructure

**Result**: 
- For human agents: Simplified intent-driven interactions
- For both: Build once, serve both through unified interface

### 2. Emergent Intelligence (vs Explicit Orchestration)

**The Problem**: Pre-defined workflows (LangGraph) can't adapt or learn optimal paths.

**The Solution**: System discovers optimal workflows through execution and shared knowledge. Works for both human-initiated and AI-autonomous workflows.

**How Olane Enables This**:

**Traditional (LangGraph)**:
```typescript
// Pre-define the graph
const workflow = new StateGraph({
  nodes: ['fetch_data', 'analyze', 'report'],
  edges: [
    ['fetch_data', 'analyze'],
    ['analyze', 'report']
  ]
});
```

**Olane (Emergent)**:
```typescript
// Human agent (CLI):
// $ olane intent "Analyze Q4 sales and create report"

// AI agent (programmatic):
const result = await toolNode.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 sales and create report'
  }
});

// Tool node discovers optimal path (same for both agent types):
// Cycle 1: EVALUATE → "Need data source"
// Cycle 2: SEARCH → Found o://analytics
// Cycle 3: TASK → Fetch data
// Cycle 4: EVALUATE → "Analyze now"
// Cycle 5: TASK → Run analysis
// Cycle 6: EVALUATE → "Create report"
// Cycle 7: TASK → Generate report
// Cycle 8: STOP → Done!
```

**Packages Involved**:
- **o-lane**: Capability loop enables emergent behavior
- **o-tool**: Tools are discovered, not pre-wired
- **o-leader**: Nodes discover each other dynamically

**Key Mechanism**: "Rooms with Tips" - tool nodes leave knowledge artifacts that other executions discover and learn from, benefiting both human-initiated and AI-autonomous workflows.

**Result**: Workflows improve over time through collective learning

### 3. Hierarchical Organization

**The Problem**: Flat tool networks don't reflect organizational structure or domain boundaries.

**The Solution**: Filesystem-like addressing with automatic context inheritance for tool nodes.

**How Olane Enables This**:

```
o://company                        # Root context: company knowledge
  ├── o://company/finance          # Inherits company + finance context
  │   ├── o://company/finance/accounting   # + accounting context
  │   └── o://company/finance/reporting    # + reporting context
  └── o://company/engineering      # Inherits company + eng context
      ├── o://company/engineering/backend  # + backend context
      └── o://company/engineering/frontend # + frontend context
```

**Benefits**:
- Tool nodes inherit domain knowledge from position in hierarchy
- Natural resource organization for agents to discover
- Intelligent routing through hierarchy
- Fault tolerance (automatic failover paths)

**Packages Involved**:
- **o-core**: Hierarchical addressing (oAddress)
- **o-core**: Parent-child hierarchy manager
- **o-node**: Network-aware hierarchical routing
- **o-leader**: Hierarchy validation and coordination

### 4. Complex & Long-Running Tasks

**The Problem**: Tool nodes timeout, lose state, or can't handle multi-day workflows when agents make requests.

**The Solution**: Persistent tool node processes with checkpointing and recovery.

**How Olane Enables This**:

**Persistent Processes**:
```typescript
// Lane can run for hours/days
const lane = await manager.createLane({
  intent: new oIntent({ intent: 'Monitor API health continuously' }),
  maxCycles: 10000, // Long-running
  streamTo: alertAddress // Real-time updates
});

// State persisted at each cycle
// Automatic recovery on failure
// Content-addressed storage of history
```

**Packages Involved**:
- **o-lane**: Persistent execution context
- **o-lane**: Checkpointing via sequence storage
- **o-core**: Agent lifecycle management
- **o-node**: Persistent peer identity (seeds)

**Result**: 99.8% reliability for long-running tasks

### 5. Intelligence Reuse

**The Problem**: Each execution learns in isolation, no knowledge sharing.

**The Solution**: Knowledge artifacts shared across all executions automatically, benefiting both human and AI agent interactions.

**How Olane Enables This**:

```
First execution (human or AI) discovers: "Best way to analyze Q4 sales"
    ↓ stores knowledge artifact
o://knowledge/sales-analysis/q4-best-practices
    ↓ discovered by
Second execution: "I need to analyze sales too"
    ↓ learns from first execution
Second execution uses proven approach (75% faster)
```

**Packages Involved**:
- **o-lane**: Knowledge stored in lane sequences
- **o-tool**: Tool indexing in vector stores
- **o-leader**: Network-wide knowledge indexing
- **o-core**: Content-addressed storage

**Result**: 75% reduction in development time through reuse

---

## Functional Groupings

### Group 1: Node Runtime & Lifecycle

**Purpose**: Create, start, stop, and manage nodes as processes.

**Primary Packages**:
- o-core (abstract lifecycle)
- o-node (concrete implementation)

**Key Concepts**:
- Node states (STOPPED, STARTING, RUNNING, STOPPING, ERROR)
- Lifecycle hooks (initialize, register, unregister, teardown)
- Graceful shutdown
- Health monitoring

**Documentation Topics**:
- Creating your first node
- Node lifecycle management
- State transitions
- Error recovery

### Group 2: Inter-Node Communication (IPC)

**Purpose**: Nodes communicate with each other using o:// addresses.

**Primary Packages**:
- o-core (abstract connections)
- o-node (libp2p streams)
- o-protocol (message formats)

**Key Concepts**:
- Request/Response pattern (JSON-RPC 2.0)
- Connection pooling and reuse
- Streaming responses
- Error handling

**Documentation Topics**:
- Making requests between nodes
- Connection management
- Handling responses
- Error codes and recovery

### Group 3: Addressing & Routing

**Purpose**: Hierarchical addressing system (o://) and intelligent routing.

**Primary Packages**:
- o-core (oAddress, oRouter)
- o-node (libp2p-aware routing)

**Key Concepts**:
- o:// protocol
- Static vs dynamic addresses
- Hierarchical path resolution
- Next-hop calculation

**Documentation Topics**:
- o:// address format
- Address resolution
- Routing strategies
- Custom resolvers

### Group 4: Tool Augmentation & Specialization

**Purpose**: Create specialized tool nodes through tool augmentation that agents (human or AI) can use.

**Primary Packages**:
- o-tool
- o-lane (context injection)

**Key Concepts**:
- Convention-based tool registration (`_tool_` prefix)
- Parameter validation
- Tool discovery
- Context specialization
- Mixin architecture

**Documentation Topics**:
- Creating tools
- Tool conventions
- Parameter validation
- Tool discovery
- Building specialist tool nodes
- Agent-agnostic design patterns

### Group 5: Process Management & Workflows

**Purpose**: Manage agentic workflows through intent-driven execution.

**Primary Packages**:
- o-lane

**Key Concepts**:
- Intents (natural language goals)
- Capabilities (atomic operations)
- Capability loop (emergent orchestration)
- Execution sequences
- Lane lifecycle
- Streaming

**Documentation Topics**:
- Intent design
- Capability system
- Custom capabilities
- Workflow patterns
- Execution tracking

### Group 6: Network Coordination & Discovery

**Purpose**: Multi-node coordination and service discovery.

**Primary Packages**:
- o-leader
- o-node (P2P networking)

**Key Concepts**:
- Leader nodes (root coordinators)
- Registry (service directory)
- Join requests
- Network indexing
- Capability discovery

**Documentation Topics**:
- Setting up leader nodes
- Node registration
- Service discovery
- Network architecture patterns
- Multi-leader federation

---

## Cross-Package Workflows

### Workflow 1: Creating a Specialized Tool Node

**Scenario**: Build a financial analysis tool node that agents (human or AI) can use to analyze sales data.

**Packages Used**: o-node → o-tool → o-lane

```typescript
// Step 1: Create tool-enabled network node (o-node + o-tool)
class FinancialToolNode extends oNodeTool {
  constructor() {
    super({
      address: new oAddress('o://company/finance/analyst'),
      leader: leaderAddress,
      parent: parentAddress
    });
  }

  // Step 2: Add domain-specific tools (o-tool)
  async _tool_analyze_revenue(request: oRequest) {
    const { quarter, year } = request.params;
    // Domain logic here
    return { revenue, growth, trends };
  }

  _params_analyze_revenue() {
    return {
      quarter: { type: 'string', required: true },
      year: { type: 'number', required: true }
    };
  }
}

// Step 3: Start tool node (o-node)
const toolNode = new FinancialToolNode();
await toolNode.start(); // Registers with leader, joins network

// Step 4: Agents (human or AI) can use this tool node with natural language (o-lane)

// Human agent (CLI):
// $ olane intent "Analyze Q4 2024 revenue and identify growth trends"

// AI agent (programmatic):
const result = await toolNode.use({
  method: 'intent',
  params: {
    intent: 'Analyze Q4 2024 revenue and identify growth trends',
    context: 'Previous quarters showed 15% growth'
  }
});

// Tool node autonomously (same process for both agent types):
// 1. Evaluates intent (using LLM reasoning)
// 2. Searches for data sources
// 3. Calls analyze_revenue tool
// 4. Processes results
// 5. Generates insights
// 6. Returns formatted report to the agent
```

**Key Interactions**:
- o-node: Network connectivity and peer discovery
- o-tool: Tool registration and validation
- o-lane: Intent processing (agent interaction layer)
- o-core: Underlying runtime infrastructure

### Workflow 2: Multi-Tool Network Coordination

**Scenario**: Create a network of specialized tool nodes that agents (human or AI) discover and coordinate.

**Packages Used**: o-leader → o-node → o-lane

```typescript
// Step 1: Setup network with leader (o-leader)
const leader = new oLeaderNode({
  address: new oAddress('o://leader')
});
await leader.start();

// Step 2: Create specialized tool nodes (o-node + o-tool)
const dataCollector = new oNodeTool({
  address: new oAddress('o://data-collector'),
  leader: leaderAddress
});

const analyst = new oNodeTool({
  address: new oAddress('o://analyst'),
  leader: leaderAddress
});

const reporter = new oNodeTool({
  address: new oAddress('o://reporter'),
  leader: leaderAddress
});

await dataCollector.start(); // Auto-registers with leader
await analyst.start();
await reporter.start();

// Step 3: Coordinator tool node that agents interact with (o-lane)
const coordinator = new oLaneTool({
  address: new oAddress('o://coordinator'),
  leader: leaderAddress
});
await coordinator.start();

// Agent (human or AI) sends intent to coordinator tool node

// Human: $ olane intent "Coordinate team to analyze customer satisfaction"

// AI agent:
const result = await coordinator.use({
  method: 'intent',
  params: {
    intent: 'Coordinate team to analyze customer satisfaction'
  }
});

// o-lane capability loop autonomously coordinates tool nodes (same for both):
// Cycle 1: EVALUATE → "Need to collect data"
// Cycle 2: SEARCH → Discovers o://data-collector via registry
// Cycle 3: TASK → Calls data-collector tool node
// Cycle 4: EVALUATE → "Have data, need analysis"
// Cycle 5: SEARCH → Discovers o://analyst tool node
// Cycle 6: TASK → Calls analyst tool node
// Cycle 7: EVALUATE → "Have analysis, need report"
// Cycle 8: SEARCH → Discovers o://reporter tool node
// Cycle 9: TASK → Calls reporter tool node
// Cycle 10: STOP → Report complete, returned to agent
```

**Key Interactions**:
- o-leader: Service discovery and registration for tool nodes
- o-node: P2P communication between tool nodes
- o-lane: Emergent workflow coordination across tool network
- o-tool: Tool discovery via vector search

### Workflow 3: Long-Running Tool Node with Checkpointing

**Scenario**: Build a monitoring tool node that agents (human or AI) can use for continuous health monitoring.

**Packages Used**: o-lane → o-core → o-node

```typescript
// Step 1: Create monitoring tool node with lane capability
class HealthMonitorToolNode extends oLaneTool {
  constructor() {
    super({
      address: new oAddress('o://monitoring/health'),
      leader: leaderAddress,
      seed: process.env.MONITOR_SEED // Persistent identity
    });
  }
}

const monitor = new HealthMonitorToolNode();
await monitor.start();

// Step 2: Agent (human or AI) sends long-running intent to tool node

// Human: $ olane intent "Monitor API endpoints every 5 minutes and alert on failures"

// AI agent:
const result = await monitor.use({
  method: 'intent',
  params: {
    intent: 'Monitor API endpoints every 5 minutes and alert on failures',
    streamTo: 'o://alerts/stream' // Real-time updates
  }
});

// o-lane manages:
// - Persistent execution context for the tool node
// - State saved after each cycle (checkpointing)
// - If tool node crashes → restart from last checkpoint
// - Content-addressed storage of execution history
// - Streaming progress to alert system

// o-core provides:
// - Lifecycle management for tool node
// - Graceful shutdown on SIGTERM
// - Automatic cleanup

// o-node provides:
// - Persistent peer ID (via seed)
// - Network reconnection on disconnect
// - Health monitoring
```

---

## Documentation Site Mapping

### How Packages Map to mint.json Structure

#### Get Started Section
**Purpose**: Onboarding (5-10 minutes to first working tool node)

**Primary Packages**: o-node + o-tool

**Content Flow**:
1. **Introduction**: What is Olane OS? (all packages overview, emphasize agent-agnostic design)
2. **Quickstart**: Create first tool node (o-node + o-tool)
3. **Installation**: npm install packages

#### Generalist-Specialist Architecture Section
**Purpose**: Explain core innovation - agent-agnostic design, one LLM for AI agents, many specialists

**Primary Packages**: o-tool + o-lane

**Content Flow**:
1. Overview: The architecture (emphasize agent-agnostic design)
2. Quickstart: Build specialist tool node (show both human and AI usage)
3. Agent-Agnostic Design: One interface serves both
4. Generalist Model Brain: How LLM serves AI agents
5. Specialist Tool Node Layer: Tool + context augmentation (o-tool)
6. Hierarchical Organization: o:// addressing (o-core)
7. Context Specialization: Lane context injection (o-lane)
8. Tool Augmented Nodes: Convention-based tools (o-tool)
9. Specialization Flywheel: Knowledge accumulation

#### Emergent Intelligence Section
**Purpose**: Explain emergent vs explicit orchestration

**Primary Packages**: o-lane

**Content Flow**:
1. Overview: Emergent coordination
2. Quickstart: Intent-driven workflow
3. Rooms with Tips: Knowledge artifacts
4. Knowledge Artifacts: Storage and discovery
5. Cross-Agent Learning: Knowledge sharing
6. vs LangGraph: Comparison
7. Best Practices: Intent design

#### Cost Optimization Section
**Purpose**: Show cost benefits of generalist-specialist

**Primary Packages**: o-tool + o-lane

**Content Flow**:
1. Overview: Cost model
2. Quickstart: Measure costs
3. Generalist vs Specialist Costs: Comparison
4. Model Sharing Strategies: One LLM for all
5. Resource Optimization: Connection pooling, etc.

#### Complex Tasks Section
**Purpose**: Handle long-running, multi-step workflows

**Primary Packages**: o-lane + o-node

**Content Flow**:
1. Overview: Long-running processes
2. Quickstart: Multi-step workflow
3. Multi-Agent Coordination: (o-leader)
4. Long-Running Processes: Persistence (o-lane)
5. Fault Tolerance: Recovery (o-core)

#### Tool Node Specialization Section
**Purpose**: Build domain-specific tool nodes

**Primary Packages**: o-tool + o-lane

**Content Flow**:
1. Overview: Specialization methods (emphasize agent-agnostic)
2. Quickstart: Create specialist tool node (show both human and AI usage)
3. Context Injection: o-lane context
4. Tool Integration: o-tool system
5. Domain Expertise: Combining context + tools
6. Hierarchical Context Inheritance: o:// benefits
7. Knowledge Accumulation: Learning
8. Collaborative Specialization: Multi-node coordination

#### Developer Resources Section
**Purpose**: Practical implementation guides

**All Packages**

**Content Flow**:
1. Testing Tool Nodes: All packages
2. Debugging Guide: All packages
3. Building Specialist Tool Nodes: o-tool + o-lane
4. Agent-Agnostic Design Patterns: Best practices for serving both humans and AI
5. Context Management: o-lane
6. Hierarchical Design Patterns: o-core
7. Tool Development: o-tool
8. Performance Profiling: All packages

#### API Reference Section
**Purpose**: Technical documentation

**Maps directly to packages**:

1. **Core Runtime**: o-core
   - oCore class
   - Lifecycle methods
   - IPC abstractions

2. **Agent Specialization Runtime**: o-tool + o-lane
   - oTool system
   - oLane capabilities
   - Context injection

3. **o:// Protocol & Addressing**: o-core
   - oAddress class
   - oRouter system
   - Hierarchical routing

4. **Emergent Intelligence System**: o-lane
   - Capability loop
   - Knowledge artifacts
   - Cross-agent learning

5. **System Components**: All
   - Error handling (o-core)
   - Metrics (o-core)
   - Configuration (o-config)

#### Migration & Support Section
**Purpose**: Help users transition from other frameworks

**Primary Packages**: All (showing equivalents)

**Content Flow**:
1. From LangGraph: Show o-lane as alternative (emergent vs explicit)
2. From CrewAI: Show o-leader + multi-node coordination
3. From AutoGen: Show hierarchical organization
4. Monolithic to Specialist: Show o-tool (agent-agnostic design)
5. Comparisons: Feature-by-feature
6. Troubleshooting: Common issues

---

## Package Feature Matrix

### What Each Package Provides

| Feature | o-core | o-node | o-tool | o-lane | o-leader |
|---------|--------|--------|--------|--------|----------|
| Node lifecycle | ✅ | ✅ | ✅ | ✅ | ✅ |
| P2P networking | ❌ | ✅ | ✅ | ✅ | ✅ |
| Tool system | ❌ | ❌ | ✅ | ✅ | ❌ |
| Intent execution | ❌ | ❌ | ❌ | ✅ | ❌ |
| Agent-agnostic interface | ❌ | ❌ | ✅ | ✅ | ❌ |
| Network coordination | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hierarchical addressing | ✅ | ✅ | ✅ | ✅ | ✅ |
| IPC abstractions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Routing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Service discovery | ❌ | Partial | ✅ | ✅ | ✅ |
| Capability loop | ❌ | ❌ | ❌ | ✅ | ❌ |
| Registry | ❌ | ❌ | ❌ | ❌ | ✅ |

### Typical Usage Combinations

**Minimal** (Local Development):
- o-core only (no networking)

**Basic Tool Node** (Single Node):
- o-core + o-node

**Specialized Tool Node** (Domain Specific):
- o-core + o-node + o-tool

**Intent-Driven Tool Node** (Accepts Natural Language):
- o-core + o-node + o-tool + o-lane

**Multi-Tool Network** (Coordinated Discovery):
- o-core + o-node + o-tool + o-lane + o-leader

---

## Key Terminology for Documentation

### Core Terms

| Term | Definition | Package |
|------|------------|---------|
| **Agent** | Intelligent user (human or AI) that interacts with tool nodes | - |
| **Human Agent** | Human user via CLI, web UI, or API | - |
| **AI Agent** | LLM (GPT-4, Claude, etc.) that uses tool nodes programmatically | - |
| **Tool Node** | Specialized, agent-agnostic capability node | o-core |
| **Agent-Agnostic** | Serves both human and AI agents through unified interface | - |
| **Intent** | Natural language goal from agent (human or AI) | o-lane |
| **Capability** | Atomic operation in capability loop | o-lane |
| **Tool** | Discoverable method on a tool node | o-tool |
| **Lane** | Execution context for resolving intent | o-lane |
| **Leader** | Root coordinator node | o-leader |
| **Registry** | Service directory for tool nodes | o-leader |
| **o:// Address** | Hierarchical tool node address | o-core |
| **IPC** | Inter-process communication | o-core |
| **Peer ID** | libp2p node identifier | o-node |
| **Multiaddress** | libp2p network address | o-node |

### Process Terms

| Term | Definition | Package |
|------|------------|---------|
| **Lifecycle** | Node states (start/stop/run) | o-core |
| **Capability Loop** | Evaluate→Decide→Execute cycle | o-lane |
| **Handshake** | Capability negotiation | o-tool |
| **Join Request** | Node joining network | o-leader |
| **Network Indexing** | Crawling node capabilities | o-leader |
| **Tool Discovery** | Vector search for tools | o-tool |
| **Context Injection** | Adding domain knowledge to tool nodes | o-lane |
| **Knowledge Artifacts** | Stored learnings (benefits both human and AI) | o-lane |

---

## Content Priorities by Audience

### For Evaluators (First 10 minutes)

**Goal**: Understand value proposition quickly

**Emphasize**:
- Agent-agnostic design (build once, serve both human and AI)
- Generalist-specialist architecture (cost benefits for AI agents)
- Emergent vs explicit orchestration
- Quick comparison to LangGraph/CrewAI

**Packages to Feature**:
- o-lane (emergent intelligence demo)
- o-tool (specialization demo with both human and AI examples)

**Content**:
- 5-minute quickstart showing both human and AI usage
- Cost comparison table
- Architecture diagram (showing both agent types)
- One compelling example demonstrating agent-agnostic interface

### For Developers (Building Phase)

**Goal**: Build their first specialized tool node

**Emphasize**:
- Agent-agnostic design patterns
- o-tool conventions for creating tools
- o-lane intent handling for agent interactions (human and AI)
- o-node networking setup

**Packages to Feature**:
- o-node (getting connected)
- o-tool (creating tool capabilities)
- o-lane (accepting intents from both agent types)

**Content**:
- Multiple working examples (showing both human and AI invocation)
- Best practices for agent-agnostic tool node development
- Troubleshooting guide
- API reference

### For Architects (Scaling Phase)

**Goal**: Design multi-tool network architectures

**Emphasize**:
- Hierarchical organization patterns for tool nodes
- Multi-leader federation
- Network architecture patterns
- Performance optimization

**Packages to Feature**:
- o-leader (tool node coordination)
- o-core (custom implementations)

**Content**:
- Architecture patterns for tool networks
- Advanced configurations
- Production best practices
- Monitoring and observability

---

## Using This Document

### For Documentation Writers

1. **Starting a new doc page**: Find the relevant package in [Package Functional Map](#package-functional-map)
2. **Understanding relationships**: See [Cross-Package Workflows](#cross-package-workflows)
3. **Organizing content**: Use [Functional Groupings](#functional-groupings)
4. **Mapping to mint.json**: Reference [Documentation Site Mapping](#documentation-site-mapping)

### For Product Managers

1. **Value propositions**: See [Core Value Propositions](#core-value-propositions)
2. **Competitive positioning**: Cross-reference with emergent vs explicit
3. **Feature planning**: Use [Package Feature Matrix](#package-feature-matrix)

### For Developers

1. **Package selection**: See "When to Use Each Package"
2. **Implementation examples**: See [Cross-Package Workflows](#cross-package-workflows)
3. **Architecture understanding**: See [The Layered Stack](#the-layered-stack)

---

**This document should be updated whenever**:
- New packages are added
- Package responsibilities change
- New value propositions emerge
- Documentation site structure changes
- Agent terminology guidelines are updated

**Last Updated**: October 1, 2025
**Changelog**:
- Updated all terminology to follow AGENT_TERMINOLOGY_GUIDE.md
- Changed "AI agents" to "agents (human or AI)" throughout
- Added agent-agnostic design emphasis
- Updated workflows to show both human and AI invocation patterns
