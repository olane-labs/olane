# 🌊 O-Core: The Future of Distributed AI is Here

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![npm version](https://badge.fury.io/js/%40olane%2Fo-core.svg)](https://badge.fury.io/js/%40olane%2Fo-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> **Imagine AI agents that think, plan, and collaborate across a peer-to-peer network—without central servers, without vendor lock-in, without limits.**

O-Core is the foundation for building **decentralized AI networks** where LLM agents operate as autonomous peers, discovering and collaborating with each other to solve complex problems.

## 🚀 Why O-Core Will Change Everything

### 🌐 **True Decentralization**
- **No Single Point of Failure**: Your AI network runs across distributed nodes
- **Peer Discovery**: Nodes automatically find and connect to each other via libp2p
- **Network Resilience**: If one node goes down, others seamlessly take over

### 🧠 **Intelligent Agent Orchestration**
- **AI Planning Engine**: Agents autonomously plan multi-step tasks
- **Context-Aware Routing**: Smart request routing based on capabilities
- **Self-Organizing Networks**: Nodes discover optimal collaboration patterns

### ⚡ **Production-Ready Architecture**
- **Built on libp2p**: Battle-tested P2P networking foundation
- **TypeScript First**: Type-safe development with excellent IDE support
- **Metrics & Monitoring**: Built-in Prometheus metrics for observability

---

## 🎯 Core Features

### 🤖 **Autonomous AI Agents**
```typescript
// Agents that think and plan autonomously
const plan = new oPlan(node, {
  intent: "Analyze user behavior and suggest optimizations",
  caller: new oAddress('o://analytics-agent'),
  currentNode: node
});

const result = await plan.execute();
// Agent automatically discovers tools, plans steps, and executes
```

### 🕸️ **P2P Network Discovery**
```typescript
// Nodes automatically discover and connect to peers
const hostNode = new oHostNode({
  address: new oAddress('o://my-ai-node'),
  leader: null,  // Becomes a bootstrap node
  parent: null
});

await hostNode.start();
// Now part of the global AI network!
```

### 🎛️ **Flexible Node Types**
- **Host Nodes**: Full P2P nodes accessible via TCP/IP
- **Virtual Nodes**: Lightweight in-memory nodes for local processing
- **Hybrid Networks**: Mix node types for optimal performance

### 🔍 **Intelligent Tool Discovery**
```typescript
// Agents find the right tools across the network
const response = await node.use(new oAddress('o://vector-store'), {
  method: 'search',
  params: { query: 'user preferences' }
});
```

---

## 🌟 Real-World Applications

### 🏢 **Enterprise AI Mesh**
Deploy AI capabilities across your infrastructure where each service becomes an intelligent agent:
- Customer service bots that collaborate with analytics agents
- Content generation that works with fact-checking services
- Automated workflows that span multiple departments

### 🏠 **Personal AI Networks**
Build your own private AI ecosystem:
- Home automation agents that learn your preferences
- Personal assistants that coordinate across devices
- Local-first AI that never leaves your network

### 🌍 **Community AI Commons**
Participate in shared intelligence networks:
- Researchers sharing specialized AI models
- Open-source AI tools that anyone can contribute to
- Collaborative problem-solving at scale

---

## 🚀 Quick Start

### Installation
```bash
npm install @olane/o-core
```

### Create Your First AI Node
```typescript
import { oHostNode, oAddress } from '@olane/o-core';

// Create a P2P AI node
const node = new oHostNode({
  address: new oAddress('o://my-ai-agent'),
  parent: null,
  leader: null
});

// Start the node
await node.start();
console.log('🌊 AI node online:', node.p2pNode.getMultiaddrs());

// The node is now part of the global AI network!
```

### Make Your First AI Plan
```typescript
import { oPlan } from '@olane/o-core';

const plan = new oPlan(node, {
  intent: "Find weather information and suggest activities",
  caller: new oAddress('o://weather-assistant'),
  currentNode: node
});

const result = await plan.execute();
console.log('🎯 AI Plan Result:', result);
```

---

## 🏗️ Architecture Deep Dive

### 🔗 **Peer-to-Peer Foundation**
Built on **libp2p**, the same networking stack that powers IPFS and Ethereum 2.0:
- **Content addressing** for deterministic routing
- **NAT traversal** for real-world connectivity  
- **Pluggable transports** (TCP, WebRTC, WebSockets)

### 🧠 **AI Planning Layer**
Smart agents that can:
- **Analyze intent** and break down complex requests
- **Discover tools** across the network automatically
- **Execute multi-step plans** with error recovery
- **Learn from interactions** via vector storage

### 🎛️ **Flexible Deployment**
- **Docker-ready** with Kubernetes charts
- **Cloud-agnostic** - runs anywhere
- **Resource-aware** scaling and discovery

---

## 🛠️ Advanced Usage

### Custom Agent Prompts
```typescript
const customPrompt = (intent: string, context: string, history: string) => `
You are a specialized financial analysis agent.
Task: ${intent}
Available context: ${context}
Previous actions: ${history}
Focus on accuracy and compliance.
`;

const plan = new oPlan(node, {
  intent: "Analyze Q3 revenue trends",
  promptFunction: customPrompt,
  currentNode: node
});
```

### Network Metrics & Monitoring
```typescript
// Built-in Prometheus metrics
const metrics = node.p2pNode.metrics;
console.log('Active connections:', metrics.getConnectionCount());
console.log('Tool execution success rate:', node.successCount / (node.successCount + node.errorCount));
```

---

## 🤝 Join the Revolution

### 🌟 **For Developers**
- **Contribute tools** to the global AI network
- **Build specialized agents** for your domain
- **Extend the protocol** with new capabilities

### 🏢 **For Enterprises**
- **Deploy private AI networks** with zero vendor lock-in
- **Scale AI horizontally** across your infrastructure
- **Maintain data sovereignty** while leveraging collective intelligence

### 🎓 **For Researchers**
- **Experiment with distributed AI** at scale
- **Share models and tools** with the community
- **Study emergent behaviors** in AI networks

---

## 📖 Documentation & Resources

- **[API Documentation](https://olane-labs.github.io/o-core)**
- **[Architecture Guide](./docs/ARCHITECTURE.md)**
- **[Deployment Examples](./examples/)**
- **[Contributing Guidelines](./CONTRIBUTING.md)**

---

## 🎯 Roadmap

- **Q1 2024**: WebRTC support for browser nodes
- **Q2 2024**: Built-in model serving capabilities  
- **Q3 2024**: Advanced consensus mechanisms
- **Q4 2024**: Cross-network protocol bridges

---

## 💫 The Future is Distributed

O-Core isn't just another AI framework—it's the foundation for an **Internet of Intelligence** where AI agents collaborate as naturally as humans do, but at the speed of light and the scale of the internet.

**Ready to build the future?** 

```bash
npm install @olane/o-core
```

**Join our community:**
- 🐦 [Twitter/X](https://twitter.com/olane_labs)
- 💬 [Discord](https://discord.gg/olane)
- 📧 [Newsletter](https://olane.com/newsletter)

---

<div align="center">

**Made with 🌊 by the oLane Team**

*Democratizing AI, one node at a time.*

</div>