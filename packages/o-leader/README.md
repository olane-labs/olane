# o-leader README.md Outline

## 1. Overview (30 seconds)

### What is o-leader?
- **One-line definition**: The root coordinator node for Olane OS agent networks
- **Business value statement**: Provides centralized coordination and discovery for distributed agent networks
- **Key differentiator**: Self-organizing agent networks without manual infrastructure configuration

### When to use o-leader
- Building multi-agent systems requiring coordination
- Creating discoverable agent networks
- Implementing hierarchical agent architectures
- Scaling from single-agent to multi-agent systems

### Core capabilities at a glance
- **Network Coordination**: Entry point for agents joining the network
- **Agent Discovery**: Registry service for finding and connecting to agents
- **Network Intelligence**: Indexing and mapping of agent capabilities
- **Fault Tolerance**: Automatic failover and recovery coordination

---

## 2. Quick Start (5 minutes)

### Prerequisites
- Node.js 20.x or higher
- Basic understanding of Olane OS concepts
- An o-core installation

### Installation
```bash
npm install @olane/o-leader
```

### Basic Leader Node Setup
```typescript
import { oLeaderNode } from '@olane/o-leader';
import { RegistryMemoryTool } from '@olane/o-leader';

// Create a leader node
const leader = new oLeaderNode({
  networkName: 'my-agent-network',
  // configuration options
});

// Start the leader
await leader.start();

// Leader is now ready to coordinate your agent network
```

### Expected Output
- Leader node running at `o://leader`
- Registry service available at `o://registry`
- Network ready to accept agent join requests

### Next Steps
- [Add agents to your network](#joining-agents-to-network)
- [Configure network policies](#network-policies)
- [Implement custom validation](#custom-join-validation)

---

## 3. Core Concepts

### Leader Node Architecture

#### What is a Leader Node?
The leader node is the **root coordinator** of an Olane OS agent network. Unlike traditional orchestrators, it enables **emergent coordination** rather than explicit control.

#### Key Responsibilities
1. **Network Entry Point**: First contact for agents joining the network
2. **Registry Management**: Maintains live directory of agents and capabilities
3. **Discovery Coordination**: Helps agents find each other via `o://` addressing
4. **Network Intelligence**: Tracks and indexes agent capabilities across the network

#### Leader vs Traditional Orchestration
| Traditional Orchestrators | o-leader Node |
|--------------------------|---------------|
| Pre-defined workflows | Emergent workflows |
| Centralized control | Distributed coordination |
| Manual scaling | Self-organizing |
| Fixed topology | Dynamic hierarchy |

### The Registry Service

#### Purpose
The registry is the **discovery mechanism** for your agent network - a dynamic directory where agents register their capabilities and find other agents.

#### Registry Operations
- **`commit`**: Register an agent and its capabilities
- **`search`**: Find agents by address, protocol, or capability
- **find_all`**: List all registered agents
- **`remove`**: Deregister an agent from the network

#### How Agents Use the Registry
```typescript
// Agent searches for specialized capabilities
const agents = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    protocols: ['payment-processing', 'tax-calculation']
  }
});

// Returns all agents with these capabilities
```

### Network Joining Flow

#### The Join Process
1. New agent makes join request to leader (`o://leader`)
2. Leader validates the join request (customizable)
3. Leader updates parent-child relationships
4. Agent is registered in the registry
5. Agent receives network configuration
6. Agent can now discover and communicate with other agents

#### Join Request Structure
```typescript
{
  caller: 'o://company/finance/analyst',
  parent: 'o://company/finance',
  transports: ['webrtc', 'websocket']
}
```

### Network Indexing

#### What is Network Indexing?
Periodic crawling of all registered agents to build a **comprehensive map** of network capabilities, enabling intelligent routing and discovery.

#### Why Indexing Matters
- **Capability Discovery**: Agents can find specialized tools across the network
- **Intelligent Routing**: Requests automatically routed to capable agents
- **Network Health**: Identify disconnected or unresponsive agents
- **Knowledge Mapping**: Build network-wide capability graph

---

## 4. Integration Guide

### Setting Up Your Leader Node

#### Basic Configuration
```typescript
import { oLeaderNode } from '@olane/o-leader';
import { RegistryMemoryTool } from '@olane/o-leader';

const leader = new oLeaderNode({
  networkName: 'production-agents',
  address: oAddress.leader(), // o://leader
  type: NodeType.LEADER,
  // Optional: custom registry implementation
  registry: new RegistryMemoryTool(config)
});

await leader.start();
```

#### Configuration Options
- `networkName`: Identifier for your agent network
- `address`: Network address (defaults to `o://leader`)
- `type`: Node type (always `NodeType.LEADER`)
- `methods`: Custom methods exposed by the leader
- `registry`: Registry implementation (memory or persistent)

### Joining Agents to Network

#### From an Agent Node
```typescript
import { oNode } from '@olane/o-node';

const agent = new oNode({
  address: 'o://company/sales/analyst',
  parent: 'o://company/sales'
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
```

#### Join Request Validation
Customize validation logic for network access control:

```typescript
class CustomLeader extends oLeaderNode {
  async validateJoinRequest(request: oRequest): Promise<boolean> {
    const { caller, parent } = request.params;
    
    // Custom validation logic
    if (!this.isAuthorizedParent(parent)) {
      throw new Error('Unauthorized parent address');
    }
    
    if (!this.meetsSecurityRequirements(caller)) {
      throw new Error('Agent does not meet security requirements');
    }
    
    return true;
  }
}
```

### Using the Registry

#### Registering Agent Capabilities
```typescript
// Commit agent to registry
await leader.use(new oAddress('o://registry'), {
  method: 'commit',
  params: {
    peerId: 'QmXxxx...', // libp2p peer ID
    address: 'o://company/finance/analyst',
    staticAddress: 'analyst-prod-01',
    protocols: [
      'financial-analysis',
      'report-generation',
      'data-visualization'
    ],
    transports: ['webrtc', 'websocket']
  }
});
```

#### Searching for Agents
```typescript
// Find agents by capability
const analysts = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    protocols: ['financial-analysis']
  }
});

// Find agent by address
const agent = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    address: 'o://company/finance/analyst'
  }
});

// Find by static address (for stable references)
const stable = await leader.use(new oAddress('o://registry'), {
  method: 'search',
  params: {
    staticAddress: 'analyst-prod-01'
  }
});
```

#### Listing All Agents
```typescript
const allAgents = await leader.use(new oAddress('o://registry'), {
  method: 'find_all',
  params: {}
});

console.log(`Network has ${allAgents.result.length} active agents`);
```

### Network Indexing

#### Triggering Network Index
```typescript
// Index entire network
await leader.use(oAddress.leader(), {
  method: 'index_network',
  params: {}
});

// This crawls all registered agents and indexes their capabilities
```

#### Custom Indexing Logic
Extend the leader to implement custom indexing:

```typescript
class CustomLeader extends oLeaderNode {
  async _tool_index_network(request: oRequest): Promise<any> {
    // Get all registered nodes
    const nodes = await this.use(
      new oAddress(RestrictedAddresses.REGISTRY),
      { method: 'find_all', params: {} }
    );
    
    // Custom indexing per node
    for (const node of nodes.result.data) {
      const capabilities = await this.indexNodeCapabilities(node);
      await this.storeCapabilities(node.address, capabilities);
    }
    
    return { message: 'Network indexed with custom logic!' };
  }
}
```

---

## 5. Advanced Topics

### Custom Registry Implementations

#### Why Custom Registries?
The default `RegistryMemoryTool` stores registrations in memory, which is great for development but not persistent. For production, implement a persistent registry.

#### Persistent Registry Example
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

#### Using Custom Registry
```typescript
const db = new Database(dbConfig);
const registry = new PostgresRegistryTool(config, db);

const leader = new oLeaderNode({
  ...config,
  registry: registry
});
```

### Multi-Leader Networks

#### When to Use Multiple Leaders
- **Geographic Distribution**: Leader per region for latency
- **Organizational Boundaries**: Leader per department or team
- **Fault Tolerance**: Backup leaders for high availability
- **Scale**: Distribute coordination load across leaders

#### Federation Pattern
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

### Security and Access Control

#### Network Access Policies
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

#### Registry Access Control
```typescript
class ProtectedRegistry extends RegistryTool {
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
}
```

### Network Health Monitoring

#### Health Check Implementation
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

### Performance Optimization

#### Registry Caching
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

## 6. Best Practices

### Network Design Patterns

#### 1. Hierarchical Organization
Structure your network to mirror your business domains:
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

#### 2. Capability-Based Discovery
Register agents with clear, specific capabilities:
```typescript
// Good: Specific capabilities
protocols: ['payment-processing', 'stripe-api', 'refund-handling']

// Avoid: Generic capabilities
protocols: ['payments', 'api', 'processing']
```

#### 3. Static Addresses for Stability
Use static addresses for production agents that need stable references:
```typescript
{
  address: 'o://company/finance/analyst',  // Dynamic
  staticAddress: 'analyst-prod-01'         // Stable reference
}
```

### Operational Guidelines

#### Registry Maintenance
- **TTL Strategy**: Implement time-to-live for registry entries to auto-cleanup stale agents
- **Health Checks**: Periodically verify registered agents are still responsive
- **Cleanup**: Remove inactive agents to keep registry performant

#### Network Indexing
- **Scheduled Indexing**: Run network indexing on a schedule (e.g., every 5 minutes)
- **Event-Driven**: Trigger indexing when significant network changes occur
- **Incremental**: For large networks, implement incremental indexing

#### Monitoring and Observability
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

### Security Best Practices

1. **Always validate join requests** with business logic
2. **Use authentication tokens** for production networks
3. **Implement rate limiting** on join requests
4. **Filter registry results** based on caller permissions
5. **Monitor for unusual patterns** (e.g., rapid joins, suspicious addresses)
6. **Use encrypted transports** (prefer webrtc over websocket for sensitive data)

---

## 7. Troubleshooting

### Common Issues

#### Agents Can't Join Network
**Symptoms**: Join requests fail or timeout
**Solutions**:
- Verify leader is running and accessible
- Check network connectivity between agent and leader
- Review `validateJoinRequest` logic for rejections
- Ensure parent address exists in hierarchy

#### Registry Search Returns No Results
**Symptoms**: Search returns empty array when agents should exist
**Solutions**:
- Verify agents committed to registry successfully
- Check search parameters match registered protocols/addresses
- Inspect registry state: `await registry.find_all()`
- Look for typos in protocol names or addresses

#### Network Indexing Fails
**Symptoms**: Index operation throws errors or never completes
**Solutions**:
- Check for agents that are unresponsive or disconnected
- Implement timeout logic for indexing individual agents
- Add error handling to continue indexing after failures
- Monitor agent count vs indexed count

#### Memory Issues with Large Networks
**Symptoms**: Registry memory grows unbounded
**Solutions**:
- Implement persistent registry instead of in-memory
- Add TTL for registry entries
- Implement cleanup for disconnected agents
- Consider registry sharding for very large networks

### Debugging Tips

#### Enable Debug Logging
```bash
DEBUG=o-protocol:*,o-leader:* node your-app.js
```

#### Inspect Registry State
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

## 8. API Reference

### oLeaderNode

#### Constructor
```typescript
constructor(config: oNodeToolConfig)
```

**Parameters:**
- `config.networkName` (string): Network identifier
- `config.address` (oAddress): Leader node address (default: `o://leader`)
- `config.type` (NodeType): Must be `NodeType.LEADER`
- `config.methods` (object): Custom methods to expose
- Other oNodeToolConfig parameters

#### Methods

##### `validateJoinRequest(request: oRequest): Promise<boolean>`
Override to implement custom join validation logic.

**Parameters:**
- `request`: Join request containing caller, parent, transports

**Returns:** Promise resolving to `true` if valid, throws error if invalid

**Example:**
```typescript
async validateJoinRequest(request: oRequest): Promise<boolean> {
  if (!isAuthorized(request.params.caller)) {
    throw new Error('Unauthorized');
  }
  return true;
}
```

##### `_tool_join_network(request: oRequest): Promise<any>`
Processes agent join requests.

**Request Parameters:**
- `caller` (string): Address of joining agent
- `parent` (string): Parent address in hierarchy
- `transports` (string[]): Available transport protocols

**Returns:** Success message

##### `_tool_index_network(request: oRequest): Promise<any>`
Indexes all registered agents in the network.

**Returns:** Index completion status

##### `_tool_save_plan(request: oRequest): Promise<any>`
Saves network coordination plans.

**Request Parameters:**
- `plan` (object): Plan to save

---

### RegistryTool

#### Abstract Methods

##### `_tool_commit(request: oRequest): Promise<ToolResult>`
Register an agent in the registry.

**Request Parameters:**
- `peerId` (string, required): Agent's peer ID
- `address` (string): Agent's o:// address
- `staticAddress` (string): Stable reference address
- `protocols` (string[]): Capabilities/protocols
- `transports` (string[]): Transport protocols

**Returns:** Success indicator

##### `_tool_search(request: oRequest): Promise<ToolResult>`
Search for agents matching criteria.

**Request Parameters:**
- `address` (string, optional): Search by address
- `staticAddress` (string, optional): Search by static address
- `protocols` (string[], optional): Search by protocols

**Returns:** Array of matching agents

##### `_tool_find_all(request: oRequest): Promise<ToolResult>`
List all registered agents.

**Returns:** Array of all registered agents

##### `_tool_remove(request: oRequest): Promise<ToolResult>`
Remove an agent from registry.

**Request Parameters:**
- `peerId` (string): Peer ID of agent to remove

**Returns:** Success indicator

---

### RegistryMemoryTool

Concrete implementation of RegistryTool using in-memory storage.

**Usage:**
```typescript
const registry = new RegistryMemoryTool(config);
```

**Storage:**
- Uses Map data structures for fast lookups
- Protocol indexing for efficient searches
- Not persistent across restarts

---

## 9. Examples

### Example 1: Basic Multi-Agent Network
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

### Example 2: Custom Validation
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

### Example 3: Capability Discovery
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

### Example 4: Network Health Dashboard
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

## 10. Migration Guide

### From Manual Coordination to o-leader

#### Before: Manual Agent Management
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

#### After: With o-leader
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

### From Other Frameworks

#### From LangGraph
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

#### From CrewAI
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

## 11. FAQ

### General Questions

**Q: Do I need a leader node for every Olane OS network?**
A: Yes, every network needs at least one leader node. It serves as the entry point and coordination hub.

**Q: Can I have multiple leader nodes?**
A: Yes, for large or distributed networks, you can implement a federation pattern with regional leaders.

**Q: Is the registry required?**
A: The registry is built into the leader node and is essential for agent discovery in the network.

**Q: What happens if the leader node goes down?**
A: Existing agent connections remain active, but new agents cannot join. Implement leader failover for high availability.

### Technical Questions

**Q: How does registry search performance scale?**
A: In-memory registry is O(n) for searches. For large networks, implement indexed or database-backed registries.

**Q: Can I customize the registry implementation?**
A: Yes, extend `RegistryTool` to implement custom storage backends (database, cache, etc.).

**Q: What transports does the leader support?**
A: The leader supports all libp2p transports: WebRTC, WebSocket, TCP, QUIC, etc.

**Q: How do I handle registry cleanup?**
A: Implement TTL logic in your registry and periodic cleanup of disconnected agents.

### Operational Questions

**Q: How often should I run network indexing?**
A: Depends on network dynamics. For stable networks, every 5-10 minutes. For dynamic networks, event-driven indexing.

**Q: What's the recommended registry backend for production?**
A: For production, use a persistent registry (PostgreSQL, Redis, etc.) instead of in-memory.

**Q: How do I monitor leader health?**
A: Implement health check endpoints and monitoring using your observability tools.

**Q: Can agents join from different networks?**
A: Yes, as long as they can reach the leader node and pass validation.

---

## 12. Support and Resources

### Documentation
- [Olane OS Overview](/README.md)
- [o-core Documentation](/packages/o-core/README.md)
- [o-node Documentation](/packages/o-node/README.md)
- [Agent Specialization Guide](/docs/specialization.md)

### Examples
- [Basic Network Setup](/examples/basic-network)
- [Secure Network](/examples/secure-network)
- [Multi-Region Federation](/examples/multi-region)
- [Health Monitoring](/examples/health-monitoring)

### Community
- GitHub Issues: [Report bugs or request features](https://github.com/olane-labs/olane/issues)
- Discussions: [Ask questions and share ideas](https://github.com/olane-labs/olane/discussions)
- Discord: [Join our community](https://discord.gg/olane)

### Commercial Support
For enterprise support, custom implementations, or consulting:
- Email: support@olane.io
- Website: https://olane.io/enterprise

---

## 13. Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Areas for Contribution
- Registry backend implementations (PostgreSQL, Redis, MongoDB)
- Performance optimizations
- Security enhancements
- Documentation improvements
- Example projects

---

## License

ISC License - see [LICENSE](../../LICENSE) for details.
