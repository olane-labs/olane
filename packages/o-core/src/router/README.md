# Router System - Intelligent Address Resolution & Routing

The router system in o-core is the **DNS-like layer** for Olane OS that handles intelligent routing of inter-process communication (IPC) between tool nodes through hierarchical address spaces. Think of it as the routing table and path resolution system for an operating system—enabling tool node processes to find and communicate with each other.

## Overview

The router system provides:

- **Hierarchical Addressing** (`o://` protocol) - Filesystem-like addressing for tool nodes
- **Intelligent Routing** - Automatic next-hop determination based on tool node hierarchy
- **Address Resolution** - Pluggable resolver system for custom address handling
- **Transport Management** - Support for multiple transport protocols (libp2p, HTTP, custom)
- **Static & Dynamic Addresses** - Both absolute and relative addressing modes

### Understanding the Context

In Olane OS:
- **AI Agents (LLMs)** are the intelligent users
- **Tool Nodes** are the specialized applications you build that agents use
- **The Router System** enables tool nodes to communicate with each other (IPC)

This documentation focuses on how tool nodes address and route requests to other tool nodes.

## Core Components

### 1. oAddress - The Addressing System

The `oAddress` class implements the `o://` protocol for hierarchical tool node addressing.

```typescript
import { oAddress } from '@olane/o-core';

// Create addresses
const addr1 = new oAddress('o://company/finance/accounting');
const addr2 = new oAddress('o://users/alice/inbox');

// Address properties
console.log(addr1.paths);        // "company/finance/accounting"
console.log(addr1.root);         // "o://company"
console.log(addr1.protocol);     // "/o/company/finance/accounting"
console.log(addr1.validate());   // true

// Static vs dynamic addresses
const staticAddr = addr1.toStaticAddress();
console.log(staticAddr.toString()); // "o://accounting"
```

#### Address Operations

```typescript
// Comparison
const addr1 = new oAddress('o://domain/service');
const addr2 = new oAddress('o://domain/service');
console.log(addr1.equals(addr2)); // true

// Transport management
addr1.setTransports([transport1, transport2]);
console.log(addr1.libp2pTransports);  // Filter libp2p transports
console.log(addr1.customTransports);  // Filter custom transports

// Content addressing
const cid = await addr1.toCID(); // Convert to IPFS CID
```

#### Special System Addresses

```typescript
import { oAddress, RestrictedAddresses } from '@olane/o-core';

// Reserved system addresses
const leader = oAddress.leader();      // o://leader
const registry = oAddress.registry();  // o://registry
const lane = oAddress.lane();         // o://lane

// Check if address is static
oAddress.isStatic(myAddress);
```

#### Next-Hop Calculation

The `oAddress.next()` method calculates the next hop in a hierarchical path:

```typescript
const current = new oAddress('o://company');
const target = new oAddress('o://company/finance/accounting');

const nextHop = oAddress.next(current, target);
console.log(nextHop.toString()); // "o://company/finance"
```

**Routing Logic:**
1. If at destination → return current address
2. If static address or at root → route to leader
3. Otherwise → route to next child in hierarchy

### 2. oRouter - The Abstract Router

The `oRouter` class is the base for implementing routing logic in tool node processes.

```typescript
import { oRouter, oAddress, RouteResponse } from '@olane/o-core';

class MyRouter extends oRouter {
  constructor() {
    super();
    // Add custom resolvers
    this.addResolver(new MyCustomResolver());
  }

  // Translate address to next hop
  async translate(
    address: oAddress,
    node: oCore
  ): Promise<RouteResponse> {
    // Implement routing logic
    const nextHop = this.calculateNextHop(address, node);
    return {
      nextHopAddress: nextHop,
      targetAddress: address
    };
  }

  // Check if request is internal
  isInternal(address: oAddress, node: oCore): boolean {
    return address.root === node.address.root;
  }

  // Route incoming requests
  async route(
    request: oRouterRequest,
    node: oCore
  ): Promise<RouteResponse> {
    // Handle routing requests from other nodes
    return await this.translate(request.address, node);
  }

  // Forward request to next node
  protected async forward(
    address: oAddress,
    request: oRequest,
    node: oCore
  ): Promise<any> {
    // Implement forwarding logic
    const connection = await node.connect(address);
    return await connection.send(request);
  }
}
```

#### Key Router Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `translate()` | Determine next hop for an address | `RouteResponse` |
| `isInternal()` | Check if address is within node's domain | `boolean` |
| `route()` | Handle routing requests from network | `RouteResponse` |
| `forward()` | Forward request to next node | `Promise<any>` |
| `addResolver()` | Add custom address resolver | `void` |
| `supportsAddress()` | Check if router can handle address | `boolean` |

### 3. oAddressResolution - The Resolution Chain

The `oAddressResolution` class manages a chain of resolvers that process addresses sequentially.

```typescript
import { oAddressResolution, oAddressResolver } from '@olane/o-core';

const resolution = new oAddressResolution();

// Add resolvers (executed in order)
resolution.addResolver(new DNSResolver());
resolution.addResolver(new CacheResolver());
resolution.addResolver(new RegistryResolver());

// Resolve an address
const result = await resolution.resolve({
  address: new oAddress('o://service/endpoint'),
  node: myNode,
  request: myRequest
});

console.log(result.nextHopAddress);  // Resolved address
console.log(result.targetAddress);   // Original target
console.log(result.requestOverride); // Modified request (if any)
```

**Resolution Flow:**
1. Address passes through each resolver in order
2. Each resolver can modify the address or request
3. Final resolved address is returned
4. Original target address is preserved

### 4. oAddressResolver - Custom Resolver Base

Create custom resolvers by extending `oAddressResolver`:

```typescript
import { 
  oAddressResolver, 
  oAddress, 
  RouteResponse,
  ResolveRequest,
  TransportType 
} from '@olane/o-core';

class CacheResolver extends oAddressResolver {
  private cache = new Map<string, oAddress>();

  constructor() {
    super(new oAddress('o://cache'));
  }

  // Define supported transport types
  get transportTypes(): TransportType[] {
    return [TransportType.LIBP2P, TransportType.CUSTOM];
  }

  // Implement resolution logic
  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: req } = request;
    
    // Check cache
    const cached = this.cache.get(address.toString());
    if (cached) {
      return {
        nextHopAddress: cached,
        targetAddress: address,
        requestOverride: req
      };
    }

    // Cache miss - return original address
    return {
      nextHopAddress: address,
      targetAddress: address,
      requestOverride: req
    };
  }
}
```

## Routing Patterns

### Hierarchical Routing

Routing follows the tool node hierarchy automatically:

```typescript
// Tool node hierarchy: o://company → o://company/finance → o://company/finance/accounting

const node = new oAddress('o://company/finance');
const target = new oAddress('o://company/finance/accounting');

// Routing direction: child
// o://company/finance → o://company/finance/accounting (direct to child tool node)

const target2 = new oAddress('o://company/legal');

// Routing direction: up to parent, then down to sibling
// o://company/finance → o://company → o://company/legal (via parent tool node)
```

### Internal vs External Routing

```typescript
class MyRouter extends oRouter {
  isInternal(address: oAddress, node: oCore): boolean {
    // Same root domain = internal
    if (address.root === node.address.root) {
      return true;
    }
    
    // Check if address is a child
    if (node.hierarchyManager.hasChild(address)) {
      return true;
    }
    
    return false;
  }

  async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
    if (this.isInternal(address, node)) {
      // Route internally (direct or through children)
      return this.routeInternally(address, node);
    } else {
      // Route externally (through parent or leader)
      return this.routeExternally(address, node);
    }
  }
}
```

### Leader-Based Routing

For addresses outside the local hierarchy, route through the leader:

```typescript
async routeExternally(address: oAddress, node: oCore): Promise<RouteResponse> {
  const leader = node.leader;
  
  if (!leader) {
    throw new Error('No leader configured for external routing');
  }

  // Leader will handle routing to external domains
  return {
    nextHopAddress: leader,
    targetAddress: address
  };
}
```

## Advanced Usage

### Custom Resolver Chain

Build a sophisticated resolution pipeline:

```typescript
class MyRouter extends oRouter {
  constructor() {
    super();
    
    // 1. Check local cache first
    this.addResolver(new CacheResolver());
    
    // 2. Check local registry
    this.addResolver(new RegistryResolver());
    
    // 3. Query network for discovery
    this.addResolver(new NetworkDiscoveryResolver());
    
    // 4. Fallback to leader routing
    this.addResolver(new LeaderFallbackResolver());
  }
}
```

### Dynamic Address Resolution

Resolve dynamic addresses at runtime:

```typescript
class DynamicResolver extends oAddressResolver {
  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node } = request;
    
    // Handle dynamic addresses like o://leader, o://parent
    if (address.value === 'o://leader') {
      return {
        nextHopAddress: node.leader!,
        targetAddress: address
      };
    }
    
    if (address.value === 'o://parent') {
      return {
        nextHopAddress: node.parent!,
        targetAddress: address
      };
    }
    
    return {
      nextHopAddress: address,
      targetAddress: address
    };
  }
}
```

### Request Modification During Resolution

Resolvers can modify requests as they pass through the resolution chain:

```typescript
class AuthResolver extends oAddressResolver {
  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: req } = request;
    
    // Add authentication to request
    const modifiedRequest = new oRequest({
      ...req,
      params: {
        ...req?.params,
        _auth: await this.generateAuthToken(node)
      }
    });
    
    return {
      nextHopAddress: address,
      targetAddress: address,
      requestOverride: modifiedRequest
    };
  }
}
```

### Transport-Specific Routing

Route based on available transports:

```typescript
class TransportRouter extends oRouter {
  async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
    // Prefer libp2p if available
    if (address.libp2pTransports.length > 0) {
      return this.routeViaLibp2p(address);
    }
    
    // Fallback to custom transports
    if (address.customTransports.length > 0) {
      return this.routeViaCustom(address);
    }
    
    // No direct transport - route through parent
    return this.routeThroughParent(address, node);
  }
}
```

## Interfaces

### RouteResponse

```typescript
interface RouteResponse {
  nextHopAddress: oAddress;      // Where to send the request next
  targetAddress: oAddress;        // Final destination address
  requestOverride?: oRequest;     // Modified request (optional)
}
```

### ResolveRequest

```typescript
interface ResolveRequest {
  address: oAddress;    // Address to resolve
  node?: oCore;        // Current node context
  request?: oRequest;  // Request being routed
}
```

## Restricted Addresses

System-reserved addresses for special purposes:

```typescript
enum RestrictedAddresses {
  REGISTRY = 'o://registry',      // Tool node registry service
  LEADER = 'o://leader',          // Network leader node
  LANE = 'o://lane',             // Lane coordinator (process manager)
  INTELLIGENCE = 'o://intelligence' // Intelligence service
}
```

These addresses have special routing behavior and are reserved for system services. Do not use them for your tool nodes.

## Best Practices

### 1. Design Hierarchical Addressing

```typescript
// ✅ Good - Clear hierarchy
o://company/department/team/service

// ❌ Bad - Flat structure
o://service-1
o://service-2
```

### 2. Implement Caching

```typescript
class CachingRouter extends oRouter {
  private cache = new Map<string, RouteResponse>();

  async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
    // Check cache first
    const cached = this.cache.get(address.toString());
    if (cached) return cached;

    // Compute route
    const route = await this.computeRoute(address, node);
    
    // Cache result
    this.cache.set(address.toString(), route);
    
    return route;
  }
}
```

### 3. Handle Routing Errors Gracefully

```typescript
async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
  try {
    return await this.attemptDirectRoute(address, node);
  } catch (error) {
    // Fallback to parent routing
    this.logger.warn('Direct route failed, using parent', error);
    return this.routeThroughParent(address, node);
  }
}
```

### 4. Use Resolvers for Cross-Cutting Concerns

```typescript
// Authentication
this.addResolver(new AuthResolver());

// Logging
this.addResolver(new LoggingResolver());

// Metrics
this.addResolver(new MetricsResolver());

// Cache
this.addResolver(new CacheResolver());
```

### 5. Validate Addresses Early

```typescript
async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
  if (!address.validate()) {
    throw new Error(`Invalid address: ${address.toString()}`);
  }
  
  // Continue with routing...
}
```

## Common Routing Patterns

### Parent-Child Routing

```typescript
// Child → Parent
const parent = node.parent;
if (parent) {
  return { nextHopAddress: parent, targetAddress: address };
}

// Parent → Child
const child = node.hierarchyManager.findChild(address);
if (child) {
  return { nextHopAddress: child, targetAddress: address };
}
```

### Sibling Routing

```typescript
// Route through common parent
async routeToSibling(target: oAddress, node: oCore): Promise<RouteResponse> {
  const parent = node.parent;
  if (!parent) {
    throw new Error('Cannot route to sibling without parent');
  }
  
  // Parent will route to target sibling
  return {
    nextHopAddress: parent,
    targetAddress: target
  };
}
```

### Broadcast Routing

```typescript
// Route to all children
async broadcast(request: oRequest, node: oCore): Promise<void> {
  const children = node.hierarchyManager.children;
  
  for (const child of children) {
    await node.use(child, {
      method: request.method,
      params: request.params
    });
  }
}
```

## Performance Considerations

1. **Cache Resolved Routes** - Avoid re-resolving the same addresses
2. **Limit Resolver Chain Length** - Each resolver adds latency
3. **Use Transport Hints** - Provide transport info in addresses when known
4. **Implement Timeouts** - Don't wait indefinitely for resolution
5. **Monitor Metrics** - Track resolution times and success rates

## Debugging

Enable debug logging to trace routing decisions:

```typescript
import debug from 'debug';

const log = debug('o-core:router');

class DebugRouter extends oRouter {
  async translate(address: oAddress, node: oCore): Promise<RouteResponse> {
    log('Translating address:', address.toString());
    log('Current node:', node.address.toString());
    
    const result = await this.computeRoute(address, node);
    
    log('Next hop:', result.nextHopAddress.toString());
    log('Target:', result.targetAddress.toString());
    
    return result;
  }
}
```

## Related Components

- **oConnectionManager** - Handles actual connections to next-hop addresses
- **oTransport** - Transport layer implementations
- **oHierarchyManager** - Manages parent-child relationships between tool nodes
- **oCore** - Uses router for all inter-process communication (IPC) between tool nodes

## Examples

See the [resolvers/](./resolvers/) directory for example resolver implementations.

---

## Summary

The router system is the intelligent routing layer that enables:

1. **Hierarchical Organization** - Tool nodes organized in filesystem-like structures
2. **Automatic Routing** - Tool nodes discover and communicate without manual configuration
3. **Context Inheritance** - Tool nodes inherit domain knowledge from their hierarchical position
4. **Fault Tolerance** - Natural failover paths through the hierarchy

This routing infrastructure is what makes Olane OS an **operating system for tool nodes** (with AI agents as the intelligent users) rather than just a network framework. Tool nodes can address each other using the `o://` protocol, and the router handles the complexity of finding efficient paths through the hierarchy—just like an OS handles process-to-process communication.
