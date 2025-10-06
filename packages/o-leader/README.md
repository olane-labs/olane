# o-leader {#o-leader}

**The root coordinator for self-organizing Olane OS agent networks.**

**TL;DR**: `o-leader` enables multi-agent systems to discover and coordinate autonomously. Agents self-register their capabilities, discover other agents via a built-in registry, and form dynamic networks without manual configuration. Perfect for scaling from single-agent to distributed multi-agent architectures.

---

## Overview {#overview}

`o-leader` is the **root coordinator node** for Olane OS agent networks. It provides centralized discovery and coordination for distributed agents, enabling self-organizing systems without manual infrastructure configuration.

### When to use o-leader {#when-to-use}

Use `o-leader` when:
- Building **multi-agent systems** requiring coordination
- Creating **discoverable agent networks** (agents find each other autonomously)
- Implementing **hierarchical agent architectures** (departments, teams, domains)
- Scaling from **single-agent to multi-agent** systems

### Core capabilities {#core-capabilities}

<CardGroup cols={2}>
  <Card title="Network Coordination" icon="network-wired" color="#0D9373">
    Entry point for agents joining the network
  </Card>
  <Card title="Agent Discovery" icon="magnifying-glass" color="#0D9373">
    Built-in registry for finding agents by capability
  </Card>
  <Card title="Network Intelligence" icon="brain" color="#0D9373">
    Automatic indexing and mapping of agent capabilities
  </Card>
  <Card title="Fault Tolerance" icon="shield" color="#0D9373">
    Automatic failover and recovery coordination
  </Card>
</CardGroup>

---

## Quick Start {#quick-start}

### Prerequisites {#prerequisites}

- Node.js 20.x or higher
- Basic understanding of Olane OS concepts
- `@olane/o-core` installed

### Installation {#installation}

```bash
npm install @olane/o-leader
```

### Basic Leader Node Setup {#basic-setup}

```typescript
import { oLeaderNode } from '@olane/o-leader';
import { oAddress } from '@olane/o-core';

// Create a leader node for your agent network
const leader = new oLeaderNode({
  networkName: 'my-agent-network',
  address: oAddress.leader(), // o://leader
});

// Start the leader (initializes registry and coordination services)
await leader.start();

console.log('Leader node running at o://leader');
console.log('Registry service available at o://registry');
```

**What this does:**
1. Creates a leader node at `o://leader`
2. Initializes the built-in registry at `o://registry`
3. Opens the network for agents to join

### Next Steps {#next-steps}

<CardGroup cols={3}>
  <Card title="Join Agents" icon="users" href="#joining-agents-to-network">
    Connect agents to your network
  </Card>
  <Card title="Discover Agents" icon="magnifying-glass" href="#using-the-registry">
    Search for agents by capability
  </Card>
  <Card title="Custom Validation" icon="shield-check" href="#join-request-validation">
    Implement access control
  </Card>
</CardGroup>

---

## Core Concepts {#core-concepts}

### Leader Node Architecture {#leader-architecture}

The leader node is the **root coordinator** of an Olane OS agent network. Unlike traditional orchestrators that require pre-defined workflows, `o-leader` enables **emergent coordination** where agents self-organize.

#### Key Responsibilities {#leader-responsibilities}

1. **Network Entry Point**: First contact for agents joining the network
2. **Registry Management**: Maintains live directory of agents and capabilities
3. **Discovery Coordination**: Helps agents find each other via `o://` addressing
4. **Network Intelligence**: Tracks and indexes agent capabilities across the network

#### Leader vs Traditional Orchestration {#leader-vs-traditional}

| Traditional Orchestrators | o-leader Node |
|--------------------------|---------------|
| Pre-defined workflows | **Emergent workflows** |
| Centralized control | **Distributed coordination** |
| Manual scaling | **Self-organizing** |
| Fixed topology | **Dynamic hierarchy** |

### The Registry Service {#registry-service}

The registry is the **discovery mechanism** for your agent network - a dynamic directory where agents register their capabilities and find other agents.

#### Registry Operations {#registry-operations}

- **`commit`**: Register an agent and its capabilities
- **`search`**: Find agents by address, protocol, or capability
- **`find_all`**: List all registered agents
- **`remove`**: Deregister an agent from the network

#### Example: Finding Agents by Capability {#registry-example}

```typescript
import { oAddress } from '@olane/o-core';

// Search for agents with specific capabilities
const agents = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    protocols: ['payment-processing', 'tax-calculation']
  }
});

console.log(`Found ${agents.result.length} agents with payment capabilities`);
// Use the discovered agents in your workflow
```

### Network Joining Flow {#joining-flow}

When an agent joins the network, the following process occurs:

1. Agent sends join request to `o://leader`
2. Leader validates the request (customizable)
3. Leader updates parent-child relationships
4. Agent is registered in the registry
5. Agent receives network configuration
6. Agent can now discover and communicate with other agents

#### Join Request Structure {#join-request-structure}

```typescript
// Example join request parameters
{
  caller: 'o://company/finance/analyst',  // Agent's address
  parent: 'o://company/finance',          // Parent in hierarchy
  transports: ['webrtc', 'websocket']     // Supported transports
}
```

### Network Indexing {#network-indexing}

**Network indexing** periodically crawls all registered agents to build a **comprehensive map** of network capabilities, enabling intelligent routing and discovery.

#### Why Indexing Matters {#indexing-benefits}

- **Capability Discovery**: Agents can find specialized tools across the network
- **Intelligent Routing**: Requests automatically routed to capable agents
- **Network Health**: Identify disconnected or unresponsive agents
- **Knowledge Mapping**: Build network-wide capability graph

---

## Integration Guide {#integration-guide}

### Setting Up Your Leader Node {#setup-leader}

#### Basic Configuration {#basic-configuration}

```typescript
import { oLeaderNode } from '@olane/o-leader';
import { oAddress, NodeType } from '@olane/o-core';
import { RegistryMemoryTool } from '@olane/o-leader';

// Create leader with basic configuration
const leader = new oLeaderNode({
  networkName: 'production-agents',
  address: oAddress.leader(), // o://leader
  type: NodeType.LEADER,
});

// Start the leader node (initializes registry and network services)
await leader.start();

console.log('Leader node ready to accept agent connections');
```

#### Configuration Options {#configuration-options}

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `networkName` | string | Identifier for your agent network | Required |
| `address` | oAddress | Network address | `o://leader` |
| `type` | NodeType | Node type | `NodeType.LEADER` |
| `methods` | object | Custom methods exposed by the leader | `{}` |
| `registry` | RegistryTool | Registry implementation (memory or persistent) | `RegistryMemoryTool` |

### Joining Agents to Network {#joining-agents-to-network}

#### From an Agent Node {#agent-join-example}

```typescript
import { oNode } from '@olane/o-node';
import { oAddress } from '@olane/o-core';

// Create an agent node
const agent = new oNode({
  address: new oAddress('o://company/sales/analyst'),
  parent: new oAddress('o://company/sales'),
  protocols: ['lead-qualification', 'deal-analysis']
});

// Join the network via leader
await agent.use(oAddress.leader(), {
  method: 'join_network',
  params: {
    caller: agent.address.toString(),
    parent: 'o://company/sales',
    transports: ['webrtc']
  }
});

console.log('Agent successfully joined network');
// Agent is now discoverable via registry
```

#### Join Request Validation {#join-request-validation}

Customize validation logic for network access control:

```typescript
import { oLeaderNode } from '@olane/o-leader';
import { oRequest } from '@olane/o-core';

class CustomLeader extends oLeaderNode {
  // Override to implement custom validation
  async validateJoinRequest(request: oRequest): Promise<boolean> {
    const { caller, parent } = request.params;
    
    // Example: Check parent authorization
    if (!this.isAuthorizedParent(parent)) {
      throw new Error('Unauthorized parent address');
    }
    
    // Example: Verify security requirements
    if (!this.meetsSecurityRequirements(caller)) {
      throw new Error('Agent does not meet security requirements');
    }
    
    return true;
  }
  
  private isAuthorizedParent(parent: string): boolean {
    // Your authorization logic
    return parent.startsWith('o://company/');
  }
  
  private meetsSecurityRequirements(caller: string): boolean {
    // Your security validation logic
    return true;
  }
}
```

### Using the Registry {#using-the-registry}

#### Registering Agent Capabilities {#registering-capabilities}

```typescript
import { oAddress } from '@olane/o-core';

// Commit agent to registry with its capabilities
await leader.use(new oAddress('o://registry'), {
  method: 'commit',
  params: {
    peerId: 'QmXxxx...',                  // libp2p peer ID
    address: 'o://company/finance/analyst',
    staticAddress: 'analyst-prod-01',    // Stable reference
    protocols: [                          // Agent capabilities
      'financial-analysis',
      'report-generation',
      'data-visualization'
    ],
    transports: ['webrtc', 'websocket']  // Supported transports
  }
});

console.log('Agent registered in registry');
```

#### Searching for Agents {#searching-agents}

```typescript
// Find agents by capability
const analysts = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    protocols: ['financial-analysis']
  }
});
console.log(`Found ${analysts.result.length} financial analysts`);

// Find agent by address
const agent = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    address: 'o://company/finance/analyst'
  }
});
console.log('Found agent:', agent.result[0]);

// Find by static address (for stable references)
const stable = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    staticAddress: 'analyst-prod-01'
  }
});
console.log('Found stable agent reference');
```

#### Listing All Agents {#listing-agents}

```typescript
// Get all registered agents in the network
const allAgents = await leader.use(new oAddress('o://registry'), {
  method: 'find_all',
  params: {}
});

console.log(`Network has ${allAgents.result.length} active agents`);
allAgents.result.forEach(agent => {
  console.log(`- ${agent.address} (${agent.protocols.join(', ')})`);
});
```

### Network Indexing {#network-indexing-usage}

#### Triggering Network Index {#trigger-index}

```typescript
import { oAddress } from '@olane/o-core';

// Trigger a full network index
await leader.use(oAddress.leader(), {
  method: 'index_network',
  params: {}
});

console.log('Network indexing complete');
// This crawls all registered agents and indexes their capabilities
```

<Note>
  **Tip**: Run indexing on a schedule (e.g., every 5-10 minutes) or trigger it after significant network changes.
</Note>

#### Custom Indexing Logic {#custom-indexing}

Extend the leader to implement custom indexing:

```typescript
import { oLeaderNode } from '@olane/o-leader';
import { oRequest, oAddress, RestrictedAddresses } from '@olane/o-core';

class CustomLeader extends oLeaderNode {
  // Override the default indexing logic
  async _tool_index_network(request: oRequest): Promise<any> {
    // Get all registered nodes
    const nodes = await this.use(
      new oAddress(RestrictedAddresses.REGISTRY),
      { method: 'find_all', params: {} }
    );
    
    console.log(`Indexing ${nodes.result.data.length} nodes`);
    
    // Custom indexing per node
    for (const node of nodes.result.data) {
      const capabilities = await this.indexNodeCapabilities(node);
      await this.storeCapabilities(node.address, capabilities);
    }
    
    return { 
      message: 'Network indexed with custom logic!',
      nodesIndexed: nodes.result.data.length
    };
  }
  
  private async indexNodeCapabilities(node: any) {
    // Your custom capability indexing logic
    return { /* capabilities */ };
  }
  
  private async storeCapabilities(address: string, capabilities: any) {
    // Store in your custom storage
  }
}
```

---

## Advanced Topics {#advanced-topics}

### Custom Registry Implementations {#custom-registry}

The default `RegistryMemoryTool` stores registrations in **memory** (great for development but not persistent). For **production**, implement a persistent registry backed by a database.

#### Persistent Registry Example {#persistent-registry-example}
```typescript
import { RegistryTool } from '@olane/o-leader';
import { oRequest } from '@olane/o-core';

class PostgresRegistryTool extends RegistryTool {
  constructor(config: oNodeToolConfig, private db: Database) {
    super(config);
  }

  async _tool_commit(request: oRequest): Promise<any> {
    const params = request.params as oRegistrationParams;
    
    await this.db.query(`
      INSERT INTO agent_registry (peer_id, address, protocols, transports)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (peer_id) DO UPDATE SET
        address = EXCLUDED.address,
        protocols = EXCLUDED.protocols,
        transports = EXCLUDED.transports,
        updated_at = NOW()
    `, [params.peerId, params.address, params.protocols, params.transports]);
    
    return { success: true };
  }
  
  async _tool_search(request: oRequest): Promise<any> {
    const params = request.params as oRegistrySearchParams;
    // Implement database search logic
  }
  
  // Implement other methods...
}
```

#### Using Custom Registry {#using-custom-registry}

```typescript
import { oLeaderNode } from '@olane/o-leader';

// Initialize your database connection
const db = new Database(dbConfig);

// Create custom registry instance
const registry = new PostgresRegistryTool(config, db);

// Use custom registry in leader
const leader = new oLeaderNode({
  networkName: 'production-network',
  registry: registry  // Use persistent registry instead of memory
});

await leader.start();
console.log('Leader using persistent registry');
```

<Check>
  **Production Recommendation**: Always use a persistent registry (PostgreSQL, Redis, MongoDB) for production networks.
</Check>

---

### Multi-Leader Networks {#multi-leader-networks}

#### When to Use Multiple Leaders {#when-multi-leader}

Use multiple leaders when you need:

- **Geographic Distribution**: Leader per region for low latency
- **Organizational Boundaries**: Leader per department or team
- **Fault Tolerance**: Backup leaders for high availability
- **Scale**: Distribute coordination load across leaders

#### Federation Pattern {#federation-pattern}
```typescript
// Primary leader
const primaryLeader = new oLeaderNode({
  networkName: 'global-network',
  address: new oAddress('o://leader/primary')
});

// Regional leaders
const usLeader = new oLeaderNode({
  networkName: 'us-network',
  address: new oAddress('o://leader/us'),
  parent: 'o://leader/primary'
});

const euLeader = new oLeaderNode({
  networkName: 'eu-network',
  address: new oAddress('o://leader/eu'),
  parent: 'o://leader/primary'
});

// Each regional leader manages its own registry
// but can query primary leader for global discovery
```

<Note>
  **Pattern**: Regional leaders handle local coordination while primary leader maintains global visibility.
</Note>

---

### Security and Access Control {#security-access-control}

#### Network Access Policies {#access-policies}
```typescript
class SecureLeader extends oLeaderNode {
  private allowedNetworks = new Set(['o://company/*']);
  private requiresAuth = true;
  
  async validateJoinRequest(request: oRequest): Promise<boolean> {
    const { caller, authToken } = request.params;
    
    // Verify authentication
    if (this.requiresAuth && !this.verifyToken(authToken)) {
      throw new Error('Authentication required');
    }
    
    // Check network authorization
    const isAllowed = Array.from(this.allowedNetworks).some(pattern => 
      this.matchesPattern(caller, pattern)
    );
    
    if (!isAllowed) {
      throw new Error(`Address ${caller} not authorized for this network`);
    }
    
    // Rate limiting
    if (this.exceedsJoinRateLimit(request.metadata.peerId)) {
      throw new Error('Join rate limit exceeded');
    }
    
    return true;
  }
}
```

#### Registry Access Control {#registry-access-control}

```typescript
import { RegistryTool } from '@olane/o-leader';
import { oRequest } from '@olane/o-core';

class ProtectedRegistry extends RegistryTool {
  // Override search to add permission checks
  async _tool_search(request: oRequest): Promise<any> {
    // Verify requesting agent has permission
    const requester = request.metadata.caller;
    if (!this.canSearch(requester)) {
      throw new Error('Insufficient permissions for registry search');
    }
    
    // Filter results based on permissions
    const results = await this.performSearch(request.params);
    return this.filterByPermissions(results, requester);
  }
  
  private canSearch(caller: string): boolean {
    // Your permission logic
    return caller.startsWith('o://company/');
  }
  
  private filterByPermissions(results: any[], caller: string): any[] {
    // Filter results based on caller permissions
    return results.filter(agent => this.hasAccessTo(caller, agent));
  }
  
  private hasAccessTo(caller: string, agent: any): boolean {
    // Your access control logic
    return true;
  }
}
```

---

### Network Health Monitoring {#network-health}

#### Health Check Implementation {#health-check-implementation}
```typescript
class MonitoredLeader extends oLeaderNode {
  async getNetworkHealth(): Promise<NetworkHealth> {
    const allAgents = await this.use(
      new oAddress('o://registry'),
      { method: 'find_all', params: {} }
    );
    
    const health = {
      totalAgents: allAgents.result.length,
      activeAgents: 0,
      unhealthyAgents: [],
      timestamp: Date.now()
    };
    
    // Check each agent
    for (const agent of allAgents.result) {
      const isHealthy = await this.checkAgentHealth(agent);
      if (isHealthy) {
        health.activeAgents++;
      } else {
        health.unhealthyAgents.push(agent.address);
      }
    }
    
    return health;
  }
}
```

---

### Performance Optimization {#performance-optimization}

#### Registry Caching {#registry-caching}
```typescript
class CachedRegistry extends RegistryTool {
  private cache = new Map<string, CacheEntry>();
  private cacheTTL = 60000; // 1 minute
  
  async _tool_search(request: oRequest): Promise<any> {
    const cacheKey = this.getCacheKey(request.params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }
    
    const results = await this.performSearch(request.params);
    this.cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
    
    return results;
  }
}
```

#### Protocol Indexing Optimization
```typescript
class OptimizedRegistry extends RegistryMemoryTool {
  // Maintain protocol -> agents mapping for O(1) lookups
  private protocolIndex = new Map<string, Set<string>>();
  
  async _tool_commit(request: oRequest): Promise<any> {
    const result = await super._tool_commit(request);
    
    // Update protocol index
    const { peerId, protocols } = request.params;
    protocols.forEach(protocol => {
      if (!this.protocolIndex.has(protocol)) {
        this.protocolIndex.set(protocol, new Set());
      }
      this.protocolIndex.get(protocol)!.add(peerId);
    });
    
    return result;
  }
  
  async _tool_search(request: oRequest): Promise<any> {
    const { protocols } = request.params;
    
    if (protocols) {
      // Fast lookup using index
      const peerIds = this.findByProtocolIndex(protocols);
      return peerIds.map(id => this.registry.get(id));
    }
    
    return super._tool_search(request);
  }
}
```

---

## Best Practices {#best-practices}

### Network Design Patterns {#network-design-patterns}

#### 1. Hierarchical Organization {#hierarchical-organization}

Structure your network to **mirror your business domains**:
```
o://leader                          # Root coordinator
  └── o://company                   # Company root
      ├── o://company/finance       # Finance department
      │   ├── o://company/finance/analyst
      │   └── o://company/finance/reporting
      └── o://company/engineering   # Engineering department
          ├── o://company/engineering/backend
          └── o://company/engineering/frontend
```

#### 2. Capability-Based Discovery {#capability-based-discovery}

Register agents with **clear, specific capabilities**:

```typescript
// ✅ Good: Specific capabilities
protocols: ['payment-processing', 'stripe-api', 'refund-handling']

// ❌ Avoid: Generic capabilities
protocols: ['payments', 'api', 'processing']
```

#### 3. Static Addresses for Stability {#static-addresses}

Use **static addresses** for production agents that need stable references:

```typescript
// Register agent with both dynamic and static addresses
{
  address: 'o://company/finance/analyst',  // Dynamic (changes with restarts)
  staticAddress: 'analyst-prod-01'         // Stable (consistent reference)
}
```

<Check>
  **Why?** Static addresses allow reliable references even when agent instances change.
</Check>

---

### Operational Guidelines {#operational-guidelines}

#### Registry Maintenance {#registry-maintenance}

- **TTL Strategy**: Implement time-to-live for registry entries to auto-cleanup stale agents
- **Health Checks**: Periodically verify registered agents are still responsive
- **Cleanup**: Remove inactive agents to keep registry performant

#### Network Indexing {#indexing-guidelines}

- **Scheduled Indexing**: Run network indexing on a schedule (e.g., every 5 minutes)
- **Event-Driven**: Trigger indexing when significant network changes occur
- **Incremental**: For large networks, implement incremental indexing

#### Monitoring and Observability {#monitoring-observability}
```typescript
// Log key network events
leader.on('agent:joined', (agent) => {
  logger.info('Agent joined network', {
    address: agent.address,
    capabilities: agent.protocols,
    timestamp: Date.now()
  });
});

leader.on('agent:removed', (agent) => {
  logger.info('Agent removed from network', {
    address: agent.address,
    timestamp: Date.now()
  });
});

// Metrics collection
const metrics = {
  totalAgents: await registry.count(),
  joinRate: calculateJoinRate(),
  searchLatency: measureSearchLatency(),
  networkHealth: await leader.getNetworkHealth()
};
```

### Security Best Practices {#security-best-practices}

Follow these security guidelines for production networks:

<Steps>
  <Step title="Validate Join Requests">
    Always implement custom `validateJoinRequest()` logic with business rules
  </Step>
  <Step title="Use Authentication">
    Require authentication tokens for all join requests
  </Step>
  <Step title="Rate Limiting">
    Implement rate limiting on join requests to prevent abuse
  </Step>
  <Step title="Permission-Based Access">
    Filter registry results based on caller permissions
  </Step>
  <Step title="Monitor Patterns">
    Watch for unusual patterns (rapid joins, suspicious addresses)
  </Step>
  <Step title="Encrypted Transports">
    Prefer WebRTC over WebSocket for sensitive data
  </Step>
</Steps>

---

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

#### Agents Can't Join Network {#agents-cant-join}
**Symptoms**: Join requests fail or timeout
**Solutions**:
- Verify leader is running and accessible
- Check network connectivity between agent and leader
- Review `validateJoinRequest` logic for rejections
- Ensure parent address exists in hierarchy

#### Registry Search Returns No Results {#registry-no-results}

**Symptoms**: Search returns empty array when agents should exist

**Solutions**:
- Verify agents committed to registry successfully
- Check search parameters match registered protocols/addresses
- Inspect registry state: `await registry.find_all()`
- Look for typos in protocol names or addresses

#### Network Indexing Fails {#indexing-fails}

**Symptoms**: Index operation throws errors or never completes

**Solutions**:
- Check for agents that are unresponsive or disconnected
- Implement timeout logic for indexing individual agents
- Add error handling to continue indexing after failures
- Monitor agent count vs indexed count

#### Memory Issues with Large Networks {#memory-issues}

**Symptoms**: Registry memory grows unbounded

**Solutions**:
- Implement **persistent registry** instead of in-memory
- Add **TTL** for registry entries
- Implement **cleanup** for disconnected agents
- Consider **registry sharding** for very large networks

---

### Debugging Tips {#debugging-tips}

#### Enable Debug Logging {#debug-logging}

```bash
# Enable debug output for o-leader and o-protocol
DEBUG=o-protocol:*,o-leader:* node your-app.js
```

#### Inspect Registry State {#inspect-registry}
```typescript
const allAgents = await leader.use(
  new oAddress('o://registry'),
  { method: 'find_all', params: {} }
);
console.log('Registry state:', JSON.stringify(allAgents, null, 2));
```

#### Monitor Join Requests
```typescript
class DebugLeader extends oLeaderNode {
  async _tool_join_network(request: oRequest): Promise<any> {
    console.log('Join request received:', {
      caller: request.params.caller,
      parent: request.params.parent,
      transports: request.params.transports,
      timestamp: Date.now()
    });
    
    try {
      return await super._tool_join_network(request);
    } catch (error) {
      console.error('Join request failed:', error);
      throw error;
    }
  }
}
```

---

## API Reference {#api-reference}

### oLeaderNode {#oleadernode}

The main class for creating a leader node.

#### Constructor {#oleadernode-constructor}

```typescript
constructor(config: oNodeToolConfig)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.networkName` | string | Yes | Network identifier |
| `config.address` | oAddress | No | Leader node address (default: `o://leader`) |
| `config.type` | NodeType | No | Must be `NodeType.LEADER` |
| `config.methods` | object | No | Custom methods to expose |

#### Methods {#oleadernode-methods}

##### `validateJoinRequest(request: oRequest): Promise<boolean>` {#validate-join}

Override to implement custom join validation logic.

**Parameters:**
- `request` (oRequest): Join request containing caller, parent, transports

**Returns:** `Promise<boolean>` - Resolves to `true` if valid, throws error if invalid

**Example:**
```typescript
async validateJoinRequest(request: oRequest): Promise<boolean> {
  if (!isAuthorized(request.params.caller)) {
    throw new Error('Unauthorized');
  }
  return true;
}
```

##### `_tool_join_network(request: oRequest): Promise<any>` {#tool-join-network}

Processes agent join requests.

**Request Parameters:**
- `caller` (string): Address of joining agent
- `parent` (string): Parent address in hierarchy
- `transports` (string[]): Available transport protocols

**Returns:** `Promise<any>` - Success message

##### `_tool_index_network(request: oRequest): Promise<any>` {#tool-index-network}

Indexes all registered agents in the network.

**Returns:** `Promise<any>` - Index completion status

##### `_tool_save_plan(request: oRequest): Promise<any>` {#tool-save-plan}

Saves network coordination plans.

**Request Parameters:**
- `plan` (object): Plan to save

**Returns:** `Promise<any>` - Success indicator

---

### RegistryTool {#registrytool}

Abstract base class for registry implementations.

#### Abstract Methods {#registrytool-methods}

##### `_tool_commit(request: oRequest): Promise<ToolResult>` {#registry-commit}

Register an agent in the registry.

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `peerId` | string | Yes | Agent's peer ID |
| `address` | string | No | Agent's o:// address |
| `staticAddress` | string | No | Stable reference address |
| `protocols` | string[] | No | Capabilities/protocols |
| `transports` | string[] | No | Transport protocols |

**Returns:** `Promise<ToolResult>` - Success indicator

##### `_tool_search(request: oRequest): Promise<ToolResult>` {#registry-search}

Search for agents matching criteria.

**Request Parameters:**
- `address` (string, optional): Search by address
- `staticAddress` (string, optional): Search by static address
- `protocols` (string[], optional): Search by protocols

**Returns:** `Promise<ToolResult>` - Array of matching agents

##### `_tool_find_all(request: oRequest): Promise<ToolResult>` {#registry-find-all}

List all registered agents.

**Returns:** `Promise<ToolResult>` - Array of all registered agents

##### `_tool_remove(request: oRequest): Promise<ToolResult>` {#registry-remove}

Remove an agent from registry.

**Request Parameters:**
- `peerId` (string): Peer ID of agent to remove

**Returns:** `Promise<ToolResult>` - Success indicator

---

### RegistryMemoryTool {#registrymemorytool}

Concrete implementation of `RegistryTool` using in-memory storage.

**Usage:**
```typescript
import { RegistryMemoryTool } from '@olane/o-leader';

const registry = new RegistryMemoryTool(config);
```

**Characteristics:**
- Uses Map data structures for **fast lookups**
- Protocol indexing for **efficient searches**
- **Not persistent** across restarts (use for development only)

<Warning>
  **Production Warning**: Use a persistent registry (PostgreSQL, Redis) for production networks.
</Warning>

---

## Examples {#examples}

### Example 1: Basic Multi-Agent Network {#example-basic-network}
```typescript
// examples/basic-network.ts
import { oLeaderNode, RegistryMemoryTool } from '@olane/o-leader';
import { oNode } from '@olane/o-node';
import { oAddress } from '@olane/o-core';

async function main() {
  // 1. Start leader
  const leader = new oLeaderNode({
    networkName: 'my-agents',
  });
  await leader.start();
  
  // 2. Create specialized agents
  const analyst = new oNode({
    address: 'o://agents/financial-analyst',
    protocols: ['financial-analysis', 'report-generation']
  });
  
  const dataCollector = new oNode({
    address: 'o://agents/data-collector',
    protocols: ['data-fetching', 'api-integration']
  });
  
  // 3. Join agents to network
  await analyst.use(oAddress.leader(), {
    method: 'join_network',
    params: {
      caller: 'o://agents/financial-analyst',
      parent: 'o://agents',
      transports: ['webrtc']
    }
  });
  
  await dataCollector.use(oAddress.leader(), {
    method: 'join_network',
    params: {
      caller: 'o://agents/data-collector',
      parent: 'o://agents',
      transports: ['webrtc']
    }
  });
  
  // 4. Use registry to find agents
  const agents = await leader.use(new oAddress('o://registry'), {
    method: 'find_all',
    params: {}
  });
  
  console.log(`Network has ${agents.result.length} agents`);
}
```

### Example 2: Secure Network with Validation {#example-secure-network}
```typescript
// examples/secure-network.ts
import { oLeaderNode } from '@olane/o-leader';
import { oRequest } from '@olane/o-core';

class SecureLeader extends oLeaderNode {
  private authorizedDomains = ['o://company', 'o://partners'];
  
  async validateJoinRequest(request: oRequest): Promise<boolean> {
    const { caller, authToken } = request.params;
    
    // Verify auth token
    if (!this.verifyAuthToken(authToken)) {
      throw new Error('Invalid authentication token');
    }
    
    // Check domain authorization
    const isAuthorized = this.authorizedDomains.some(domain =>
      caller.startsWith(domain)
    );
    
    if (!isAuthorized) {
      throw new Error(`Domain not authorized: ${caller}`);
    }
    
    this.logger.info(`Agent ${caller} authorized to join`);
    return true;
  }
  
  private verifyAuthToken(token: string): boolean {
    // Your token verification logic
    return token === 'valid-secret';
  }
}

const leader = new SecureLeader({
  networkName: 'secure-network'
});
await leader.start();
```

### Example 3: Capability Discovery {#example-capability-discovery}
```typescript
// examples/capability-discovery.ts
import { oAddress } from '@olane/o-core';

async function findAnalysisAgents(leader: oLeaderNode) {
  // Search for agents with specific capabilities
  const result = await leader.use(new oAddress('o://registry'), {
    method: 'search',
    params: {
      protocols: ['financial-analysis', 'data-visualization']
    }
  });
  
  const agents = result.result;
  console.log(`Found ${agents.length} agents with analysis capabilities`);
  
  // Connect to first available agent
  if (agents.length > 0) {
    const targetAgent = new oAddress(agents[0].address);
    const analysis = await leader.use(targetAgent, {
      method: 'analyze_portfolio',
      params: { portfolio: 'tech-stocks' }
    });
    
    return analysis;
  }
}
```

### Example 4: Network Health Dashboard {#example-health-dashboard}
```typescript
// examples/health-dashboard.ts
import { oLeaderNode, RegistryMemoryTool } from '@olane/o-leader';

class HealthMonitorLeader extends oLeaderNode {
  async getNetworkDashboard() {
    const allAgents = await this.use(
      new oAddress('o://registry'),
      { method: 'find_all', params: {} }
    );
    
    const dashboard = {
      totalAgents: allAgents.result.length,
      byCapability: this.groupByCapability(allAgents.result),
      byDomain: this.groupByDomain(allAgents.result),
      health: await this.checkAllAgentsHealth(allAgents.result)
    };
    
    return dashboard;
  }
  
  private groupByCapability(agents: any[]) {
    const groups = new Map<string, number>();
    agents.forEach(agent => {
      agent.protocols.forEach(protocol => {
        groups.set(protocol, (groups.get(protocol) || 0) + 1);
      });
    });
    return Object.fromEntries(groups);
  }
  
  private groupByDomain(agents: any[]) {
    const groups = new Map<string, number>();
    agents.forEach(agent => {
      const domain = agent.address.split('/').slice(0, 3).join('/');
      groups.set(domain, (groups.get(domain) || 0) + 1);
    });
    return Object.fromEntries(groups);
  }
  
  private async checkAllAgentsHealth(agents: any[]) {
    // Implementation for health checks
    return { healthy: agents.length, unhealthy: 0 };
  }
}
```

---

## Migration Guide {#migration-guide}

### From Manual Coordination to o-leader {#migration-manual-to-leader}

#### Before: Manual Agent Management {#before-manual}
```typescript
// Manually tracking agents
const agents = {
  'analyst-1': { address: '...', capabilities: [...] },
  'collector-1': { address: '...', capabilities: [...] }
};

// Manual discovery
function findAgent(capability) {
  for (const [id, agent] of Object.entries(agents)) {
    if (agent.capabilities.includes(capability)) {
      return agent;
    }
  }
}
```

#### After: With o-leader {#after-with-leader}
```typescript
// Automatic registration and discovery
const leader = new oLeaderNode({ networkName: 'agents' });

// Agents self-register
await agent.use(oAddress.leader(), {
  method: 'join_network',
  params: { caller: agent.address, parent, transports }
});

// Automatic discovery via registry
const agents = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: { protocols: ['analysis'] }
});
```

### From Other Frameworks {#migration-from-frameworks}

#### From LangGraph {#migration-from-langgraph}
LangGraph requires explicit graph definitions. With o-leader, agents discover each other:

```typescript
// LangGraph: Pre-defined graph
const graph = new StateGraph({
  nodes: ['analyst', 'collector', 'reporter'],
  edges: [['analyst', 'reporter'], ['collector', 'reporter']]
});

// o-leader: Emergent connections
const leader = new oLeaderNode({ networkName: 'agents' });
// Agents discover each other via registry
// No pre-defined connections needed
```

#### From CrewAI {#migration-from-crewai}
CrewAI uses explicit crew definitions. o-leader enables dynamic crews:

```typescript
// CrewAI: Static crew
const crew = new Crew({
  agents: [analyst, researcher, writer],
  tasks: [research_task, analysis_task, writing_task]
});

// o-leader: Dynamic discovery
const agents = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: { protocols: ['research', 'analysis', 'writing'] }
});
// Agents can form dynamic collaborations
```

---

## FAQ {#faq}

### General Questions {#faq-general}

<AccordionGroup>
  <Accordion title="Do I need a leader node for every Olane OS network?">
    Yes, every network needs at least one leader node. It serves as the **entry point** and **coordination hub** for the network.
  </Accordion>

  <Accordion title="Can I have multiple leader nodes?">
    Yes, for large or distributed networks, you can implement a **federation pattern** with regional leaders. See [Multi-Leader Networks](#multi-leader-networks).
  </Accordion>

  <Accordion title="Is the registry required?">
    The registry is **built into** the leader node and is essential for agent discovery. You cannot run a leader without a registry.
  </Accordion>

  <Accordion title="What happens if the leader node goes down?">
    Existing agent connections remain active, but **new agents cannot join**. Implement leader failover for high availability.
  </Accordion>
</AccordionGroup>

### Technical Questions {#faq-technical}

<AccordionGroup>
  <Accordion title="How does registry search performance scale?">
    In-memory registry is **O(n)** for searches. For large networks (1000+ agents), implement **indexed** or **database-backed** registries.
  </Accordion>

  <Accordion title="Can I customize the registry implementation?">
    Yes, extend `RegistryTool` to implement custom storage backends (PostgreSQL, Redis, MongoDB, etc.). See [Custom Registry Implementations](#custom-registry).
  </Accordion>

  <Accordion title="What transports does the leader support?">
    The leader supports all **libp2p transports**: WebRTC, WebSocket, TCP, QUIC, etc.
  </Accordion>

  <Accordion title="How do I handle registry cleanup?">
    Implement **TTL logic** in your registry and **periodic cleanup** of disconnected agents. See [Registry Maintenance](#registry-maintenance).
  </Accordion>
</AccordionGroup>

### Operational Questions {#faq-operational}

<AccordionGroup>
  <Accordion title="How often should I run network indexing?">
    Depends on network dynamics:
    - **Stable networks**: Every 5-10 minutes
    - **Dynamic networks**: Event-driven indexing
    - **Large networks**: Incremental indexing
  </Accordion>

  <Accordion title="What's the recommended registry backend for production?">
    For production, use a **persistent registry** (PostgreSQL, Redis, MongoDB) instead of in-memory. See [Persistent Registry Example](#persistent-registry-example).
  </Accordion>

  <Accordion title="How do I monitor leader health?">
    Implement **health check endpoints** and monitoring using your observability tools. See [Network Health Monitoring](#network-health).
  </Accordion>

  <Accordion title="Can agents join from different networks?">
    Yes, as long as they can **reach the leader node** and **pass validation**.
  </Accordion>
</AccordionGroup>

---

## Support and Resources {#support-resources}

### Documentation {#documentation-links}

<CardGroup cols={2}>
  <Card title="Olane OS Overview" icon="home" href="/README.md">
    Learn about Olane OS architecture
  </Card>
  <Card title="o-core" icon="gear" href="/packages/o-core/README.md">
    Core protocol and addressing
  </Card>
  <Card title="o-node" icon="server" href="/packages/o-node/README.md">
    Build agent nodes
  </Card>
  <Card title="o-lane" icon="brain" href="/packages/o-lane/README.md">
    Add intelligence to nodes
  </Card>
</CardGroup>

### Examples {#example-projects}

- [Basic Network Setup](/examples/basic-network) - Simple multi-agent network
- [Secure Network](/examples/secure-network) - Custom validation and access control
- [Multi-Region Federation](/examples/multi-region) - Distributed leader pattern
- [Health Monitoring](/examples/health-monitoring) - Network observability

### Community {#community}

<CardGroup cols={3}>
  <Card title="GitHub Issues" icon="github" href="https://github.com/olane-labs/olane/issues">
    Report bugs or request features
  </Card>
  <Card title="Discussions" icon="comments" href="https://github.com/olane-labs/olane/discussions">
    Ask questions and share ideas
  </Card>
  <Card title="Discord" icon="discord" href="https://discord.gg/olane">
    Join our community
  </Card>
</CardGroup>

### Commercial Support {#commercial-support}

For enterprise support, custom implementations, or consulting:
- **Email**: support@olane.io
- **Website**: [olane.io/enterprise](https://olane.io/enterprise)

---

## Contributing {#contributing}

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Areas for Contribution {#contribution-areas}

- **Registry Backends**: PostgreSQL, Redis, MongoDB implementations
- **Performance**: Optimization and scaling improvements
- **Security**: Enhanced validation and access control
- **Documentation**: Guides, tutorials, and examples
- **Examples**: Real-world use cases and patterns

---

## License {#license}

ISC License - see [LICENSE](../../LICENSE) for details.
