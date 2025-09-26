---
title: "Router System - Address Resolution and Network Routing"
description: "Complete guide to Olane's intelligent routing system, address resolution, and network path discovery"
---

# Router System

The Olane router system is responsible for intelligent address resolution and network routing. It determines how requests are routed through the network to reach their destination, handles address translation, and manages the resolution of hierarchical addresses into concrete network paths.

## Overview

The router system provides:

- **Intelligent Address Resolution** - Converts logical addresses into routable network paths
- **Hierarchical Routing** - Understands network topology and parent-child relationships
- **Pluggable Resolvers** - Extensible system for custom address resolution logic
- **Transport Abstraction** - Routes requests across different transport protocols
- **Load Balancing** - Distributes requests across multiple available paths
- **Fallback Mechanisms** - Handles routing failures gracefully

## Core Components

### oRouter Class

The `oRouter` class is the abstract base class for all routing implementations.

```typescript
abstract class oRouter extends oObject {
  public addressResolution: oAddressResolution;
  
  abstract translate(addressWithLeaderTransports: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }>;
  
  abstract isInternal(addressWithLeaderTransports: oAddress): boolean;
  addResolver(resolver: oAddressResolver): void;
}
```

#### Methods

##### `translate(address: oAddress): Promise<{ nextHopAddress: oAddress; targetAddress: oAddress }>`

Translates a logical address into the next hop and final target addresses for routing.

**Parameters:**
- `address: oAddress` - The address to resolve and route

**Returns:** Promise resolving to routing information:
- `nextHopAddress` - The immediate next node to send the request to
- `targetAddress` - The final destination address

**Example:**

```typescript
// Request to: o://remote-network/ai/gpt4/chat
const { nextHopAddress, targetAddress } = await router.translate(
  new oAddress('o://remote-network/ai/gpt4/chat')
);

console.log('Next hop:', nextHopAddress.toString()); // o://gateway-node
console.log('Target:', targetAddress.toString());    // o://remote-network/ai/gpt4/chat
```

##### `isInternal(address: oAddress): boolean`

Determines if an address points to a local/internal resource or requires network routing.

```typescript
const localAddress = new oAddress('o://my-network/local-service');
const remoteAddress = new oAddress('o://other-network/service');

console.log('Is local internal?', router.isInternal(localAddress));  // true
console.log('Is remote internal?', router.isInternal(remoteAddress)); // false
```

##### `addResolver(resolver: oAddressResolver): void`

Adds a custom address resolver to the routing system.

```typescript
const customResolver = new DatabaseResolver(dbConfig);
router.addResolver(customResolver);
```

### oAddressResolution Class

Manages the collection of address resolvers and coordinates the resolution process.

```typescript
class oAddressResolution {
  constructor(hierarchy: oHierarchyManager);
  
  addResolver(resolver: oAddressResolver): void;
  supportsTransport(address: oAddress): boolean;
  resolve(address: oAddress): Promise<oAddress>;
}
```

#### Methods

##### `addResolver(resolver: oAddressResolver): void`

Adds a resolver to the resolution chain.

```typescript
const resolution = new oAddressResolution(hierarchyManager);
resolution.addResolver(new MethodResolver());
resolution.addResolver(new StorageResolver());
resolution.addResolver(new SearchResolver());
```

##### `supportsTransport(address: oAddress): boolean`

Checks if any resolver supports the transports available for an address.

```typescript
const address = new oAddress('o://service', [webSocketTransport]);
if (resolution.supportsTransport(address)) {
  console.log('Address is routable');
} else {
  console.log('No resolver supports this address');
}
```

##### `resolve(address: oAddress): Promise<oAddress>`

Resolves an address through the chain of resolvers.

```typescript
const originalAddress = new oAddress('o://my-network/storage/files');
const resolvedAddress = await resolution.resolve(originalAddress);
console.log('Resolved to:', resolvedAddress.toString());
```

### oAddressResolver Class

Abstract base class for implementing custom address resolution logic.

```typescript
abstract class oAddressResolver extends oObject {
  constructor(address: oAddress);
  
  get customTransports(): oTransport[];
  get transportTypes(): TransportType[];
  
  async resolve(
    address: oAddress, 
    hierarchy: oHierarchyManager
  ): Promise<oAddress>;
}
```

#### Properties

##### `customTransports: oTransport[]`

Returns custom transports that this resolver can provide.

```typescript
class WebSocketResolver extends oAddressResolver {
  get customTransports(): oTransport[] {
    return [
      new oCustomTransport('ws://localhost:8080'),
      new oCustomTransport('wss://secure.example.com:443')
    ];
  }
}
```

##### `transportTypes: TransportType[]`

Returns the transport types this resolver supports.

```typescript
class HttpResolver extends oAddressResolver {
  get transportTypes(): TransportType[] {
    return [TransportType.CUSTOM]; // for HTTP transports
  }
}
```

#### Methods

##### `resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress>`

Implements the resolution logic for this resolver.

```typescript
class DatabaseResolver extends oAddressResolver {
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    // Check if this is a database address
    if (address.paths.startsWith('db/')) {
      const dbName = address.paths.split('/')[1];
      const dbServer = await this.findDatabaseServer(dbName);
      
      return new oAddress(
        `o://database-cluster/${dbServer}/${address.paths}`,
        this.customTransports
      );
    }
    
    // Not a database address, return unchanged
    return address;
  }
  
  private async findDatabaseServer(dbName: string): Promise<string> {
    // Load balancing logic for database servers
    const servers = await this.getAvailableServers();
    return this.selectServer(servers, dbName);
  }
}
```

## Built-in Resolvers

### Method Resolver

Resolves method-based addresses to specific node capabilities.

```typescript
class oMethodResolver extends oAddressResolver {
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    const method = this.extractMethod(address);
    
    if (method && this.nodeSupportsMethod(method)) {
      return new oAddress(
        address.toString(),
        this.getMethodTransports(method)
      );
    }
    
    return address;
  }
  
  private extractMethod(address: oAddress): string | null {
    const parts = address.paths.split('/');
    return parts[parts.length - 1] || null;
  }
  
  private nodeSupportsMethod(method: string): boolean {
    // Check if current node supports this method
    return Object.keys(this.node.methods).includes(method);
  }
}
```

### Storage Resolver

Resolves storage-related addresses to appropriate storage nodes.

```typescript
class StorageResolver extends oAddressResolver {
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    if (address.paths.includes('/storage/')) {
      const storageType = this.extractStorageType(address);
      const storageNode = await this.findStorageNode(storageType);
      
      return new oAddress(
        `o://${storageNode}${address.paths}`,
        this.getStorageTransports(storageNode)
      );
    }
    
    return address;
  }
  
  private extractStorageType(address: oAddress): string {
    const parts = address.paths.split('/');
    const storageIndex = parts.indexOf('storage');
    return parts[storageIndex + 1] || 'default';
  }
  
  private async findStorageNode(storageType: string): Promise<string> {
    // Logic to find appropriate storage node
    const storageMap = {
      'documents': 'document-storage-cluster',
      'images': 'media-storage-cluster',
      'cache': 'cache-storage-cluster',
      'default': 'general-storage-cluster'
    };
    
    return storageMap[storageType] || storageMap['default'];
  }
}
```

### Search Resolver

Resolves addresses by searching the network for available nodes.

```typescript
class SearchResolver extends oAddressResolver {
  constructor(
    address: oAddress,
    private readonly networkClient: NetworkClient
  ) {
    super(address);
  }
  
  get transportTypes(): TransportType[] {
    return [TransportType.LIBP2P];
  }
  
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    try {
      // Search peer store first
      const peerTransports = await this.searchPeerStore(address);
      if (peerTransports.length > 0) {
        return new oAddress(address.toString(), peerTransports);
      }
      
      // Search network if not found locally
      const networkTransports = await this.searchNetwork(address);
      if (networkTransports.length > 0) {
        return new oAddress(address.toString(), networkTransports);
      }
      
      return address;
    } catch (error) {
      this.logger.warn('Search resolution failed:', error);
      return address;
    }
  }
  
  private async searchPeerStore(address: oAddress): Promise<oTransport[]> {
    const peers = await this.networkClient.getPeers();
    const matchingPeer = peers.find(peer => 
      peer.protocols.includes(address.protocol)
    );
    
    return matchingPeer ? matchingPeer.transports : [];
  }
  
  private async searchNetwork(address: oAddress): Promise<oTransport[]> {
    const searchResults = await this.networkClient.findNode(address);
    return searchResults.transports || [];
  }
}
```

## Router Implementation Examples

### Basic Router Implementation

```typescript
import { oRouter, oAddress, oAddressResolution } from '@olane/o-core';

class BasicRouter extends oRouter {
  constructor(
    private readonly node: oCore,
    private readonly hierarchy: oHierarchyManager
  ) {
    super();
    this.addressResolution = new oAddressResolution(hierarchy);
    this.initializeResolvers();
  }
  
  private initializeResolvers(): void {
    this.addResolver(new MethodResolver(this.node.address));
    this.addResolver(new StorageResolver(this.node.address));
    this.addResolver(new SearchResolver(this.node.address, this.networkClient));
  }
  
  async translate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // Check if address is internal
    if (this.isInternal(address)) {
      return {
        nextHopAddress: this.node.address,
        targetAddress: address
      };
    }
    
    // Resolve address through resolvers
    const resolvedAddress = await this.addressResolution.resolve(address);
    
    // Determine next hop based on hierarchy
    const nextHop = this.determineNextHop(resolvedAddress);
    
    return {
      nextHopAddress: nextHop,
      targetAddress: resolvedAddress
    };
  }
  
  isInternal(address: oAddress): boolean {
    // Check if address belongs to this node's network
    return address.root === this.node.address.root;
  }
  
  private determineNextHop(address: oAddress): oAddress {
    // If we have direct transport, use it
    if (address.transports.length > 0) {
      return address;
    }
    
    // Check hierarchy for routing path
    const parent = this.hierarchy.getParent();
    if (parent) {
      return parent;
    }
    
    // Fallback to leader
    return oAddress.leader();
  }
}
```

### Advanced Router with Load Balancing

```typescript
class LoadBalancedRouter extends oRouter {
  private loadBalancer: LoadBalancer;
  private routingCache: Map<string, RoutingInfo> = new Map();
  private readonly cacheTimeout = 300000; // 5 minutes
  
  constructor(
    node: oCore,
    hierarchy: oHierarchyManager,
    loadBalancer: LoadBalancer
  ) {
    super();
    this.loadBalancer = loadBalancer;
    this.addressResolution = new oAddressResolution(hierarchy);
  }
  
  async translate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // Check cache first
    const cached = this.getFromCache(address);
    if (cached && !this.isCacheExpired(cached)) {
      return {
        nextHopAddress: cached.nextHop,
        targetAddress: cached.target
      };
    }
    
    // Resolve address
    const resolvedAddress = await this.addressResolution.resolve(address);
    
    // Apply load balancing
    const balancedAddress = await this.loadBalancer.selectTarget(resolvedAddress);
    
    // Determine routing
    const result = {
      nextHopAddress: this.determineNextHop(balancedAddress),
      targetAddress: balancedAddress
    };
    
    // Cache the result
    this.cacheRoutingInfo(address, result);
    
    return result;
  }
  
  private getFromCache(address: oAddress): RoutingInfo | null {
    return this.routingCache.get(address.toString()) || null;
  }
  
  private isCacheExpired(info: RoutingInfo): boolean {
    return Date.now() - info.timestamp > this.cacheTimeout;
  }
  
  private cacheRoutingInfo(
    address: oAddress, 
    result: { nextHopAddress: oAddress; targetAddress: oAddress }
  ): void {
    this.routingCache.set(address.toString(), {
      nextHop: result.nextHopAddress,
      target: result.targetAddress,
      timestamp: Date.now()
    });
  }
}

interface RoutingInfo {
  nextHop: oAddress;
  target: oAddress;
  timestamp: number;
}
```

### Hierarchical Router

```typescript
class HierarchicalRouter extends oRouter {
  constructor(
    private readonly node: oCore,
    private readonly hierarchy: oHierarchyManager
  ) {
    super();
    this.addressResolution = new oAddressResolution(hierarchy);
  }
  
  async translate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // Handle different routing scenarios
    if (this.isDirectChild(address)) {
      return this.routeToDirectChild(address);
    }
    
    if (this.isDescendant(address)) {
      return this.routeToDescendant(address);
    }
    
    if (this.isSibling(address)) {
      return this.routeToSibling(address);
    }
    
    // Route through parent or leader
    return this.routeUpward(address);
  }
  
  private isDirectChild(address: oAddress): boolean {
    const children = this.hierarchy.getChildren();
    return children.some(child => 
      address.toString().startsWith(child.toString())
    );
  }
  
  private isDescendant(address: oAddress): boolean {
    // Check if address is in our subtree
    return address.toString().startsWith(this.node.address.root);
  }
  
  private isSibling(address: oAddress): boolean {
    const parent = this.hierarchy.getParent();
    return parent !== null && 
           address.root === this.node.address.root;
  }
  
  private async routeToDirectChild(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    const child = this.findDirectChild(address);
    return {
      nextHopAddress: child,
      targetAddress: address
    };
  }
  
  private async routeToDescendant(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // Find the child that leads to the descendant
    const childPath = this.findChildPathToDescendant(address);
    return {
      nextHopAddress: childPath,
      targetAddress: address
    };
  }
  
  private async routeToSibling(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    const parent = this.hierarchy.getParent();
    return {
      nextHopAddress: parent!,
      targetAddress: address
    };
  }
  
  private async routeUpward(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    const parent = this.hierarchy.getParent();
    if (parent) {
      return {
        nextHopAddress: parent,
        targetAddress: address
      };
    }
    
    // No parent, route to leader
    return {
      nextHopAddress: oAddress.leader(),
      targetAddress: address
    };
  }
}
```

## Custom Resolver Examples

### Service Discovery Resolver

```typescript
class ServiceDiscoveryResolver extends oAddressResolver {
  constructor(
    address: oAddress,
    private readonly serviceRegistry: ServiceRegistry
  ) {
    super(address);
  }
  
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    // Extract service name from address
    const serviceName = this.extractServiceName(address);
    if (!serviceName) {
      return address;
    }
    
    // Look up service in registry
    const serviceInstances = await this.serviceRegistry.discover(serviceName);
    if (serviceInstances.length === 0) {
      this.logger.warn(`No instances found for service: ${serviceName}`);
      return address;
    }
    
    // Select instance (with load balancing)
    const selectedInstance = this.selectInstance(serviceInstances);
    
    // Create address with instance-specific transport
    const instanceAddress = new oAddress(
      `o://${selectedInstance.host}${address.paths}`,
      [new oCustomTransport(`http://${selectedInstance.host}:${selectedInstance.port}`)]
    );
    
    return instanceAddress;
  }
  
  private extractServiceName(address: oAddress): string | null {
    const parts = address.paths.split('/');
    if (parts.length >= 2 && parts[1] === 'services') {
      return parts[2] || null;
    }
    return null;
  }
  
  private selectInstance(instances: ServiceInstance[]): ServiceInstance {
    // Simple round-robin selection
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }
}
```

### Geographic Resolver

```typescript
class GeographicResolver extends oAddressResolver {
  constructor(
    address: oAddress,
    private readonly geoService: GeographicService
  ) {
    super(address);
  }
  
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    // Check if this is a geo-aware address
    if (!address.paths.includes('/geo/')) {
      return address;
    }
    
    // Extract geographic requirements
    const geoRequirement = this.extractGeoRequirement(address);
    if (!geoRequirement) {
      return address;
    }
    
    // Find nearest nodes
    const nearestNodes = await this.geoService.findNearestNodes(
      geoRequirement.region,
      geoRequirement.maxDistance
    );
    
    if (nearestNodes.length === 0) {
      this.logger.warn(`No nodes found in region: ${geoRequirement.region}`);
      return address;
    }
    
    // Select best node based on latency and load
    const selectedNode = await this.selectOptimalNode(nearestNodes);
    
    return new oAddress(
      `o://${selectedNode.address}${address.paths}`,
      selectedNode.transports
    );
  }
  
  private extractGeoRequirement(address: oAddress): GeoRequirement | null {
    const parts = address.paths.split('/');
    const geoIndex = parts.indexOf('geo');
    
    if (geoIndex >= 0 && parts.length > geoIndex + 1) {
      return {
        region: parts[geoIndex + 1],
        maxDistance: 1000 // km
      };
    }
    
    return null;
  }
  
  private async selectOptimalNode(nodes: GeoNode[]): Promise<GeoNode> {
    // Measure latency to each node
    const nodeMetrics = await Promise.all(
      nodes.map(async (node) => ({
        node,
        latency: await this.measureLatency(node),
        load: await this.getNodeLoad(node)
      }))
    );
    
    // Select node with best score (lowest latency + load)
    nodeMetrics.sort((a, b) => (a.latency + a.load) - (b.latency + b.load));
    return nodeMetrics[0].node;
  }
}
```

### Cache-Aware Resolver

```typescript
class CacheAwareResolver extends oAddressResolver {
  constructor(
    address: oAddress,
    private readonly cache: DistributedCache
  ) {
    super(address);
  }
  
  async resolve(address: oAddress, hierarchy: oHierarchyManager): Promise<oAddress> {
    // Check if this request can be served from cache
    if (this.isCacheable(address)) {
      const cacheKey = this.generateCacheKey(address);
      
      // Check if data is in cache
      const cachedData = await this.cache.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for: ${address.toString()}`);
        
        // Return cache node address
        return new oAddress(
          'o://cache-node/serve',
          [new oCustomTransport(`cache://${cacheKey}`)]
        );
      }
    }
    
    return address;
  }
  
  private isCacheable(address: oAddress): boolean {
    // Define caching rules
    const cacheablePatterns = [
      '/api/data/',
      '/storage/read/',
      '/compute/results/'
    ];
    
    return cacheablePatterns.some(pattern => 
      address.paths.includes(pattern)
    );
  }
  
  private generateCacheKey(address: oAddress): string {
    // Generate deterministic cache key
    return `cache:${address.toString()}:${this.getRequestHash()}`;
  }
  
  private getRequestHash(): string {
    // Generate hash based on request parameters
    return 'request-hash'; // Simplified
  }
}
```

## Error Handling and Fallbacks

### Router Error Handling

```typescript
class ResilientRouter extends oRouter {
  private fallbackResolvers: oAddressResolver[] = [];
  
  async translate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    try {
      return await this.primaryTranslate(address);
    } catch (error) {
      this.logger.warn('Primary routing failed, trying fallbacks:', error);
      return await this.fallbackTranslate(address);
    }
  }
  
  private async primaryTranslate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    const resolvedAddress = await this.addressResolution.resolve(address);
    
    if (resolvedAddress.transports.length === 0) {
      throw new Error('No transports available for address');
    }
    
    return {
      nextHopAddress: this.determineNextHop(resolvedAddress),
      targetAddress: resolvedAddress
    };
  }
  
  private async fallbackTranslate(address: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // Try fallback resolvers
    for (const resolver of this.fallbackResolvers) {
      try {
        const fallbackAddress = await resolver.resolve(address, this.hierarchy);
        if (fallbackAddress.transports.length > 0) {
          return {
            nextHopAddress: this.determineNextHop(fallbackAddress),
            targetAddress: fallbackAddress
          };
        }
      } catch (error) {
        this.logger.debug('Fallback resolver failed:', error);
      }
    }
    
    // Final fallback - route through leader
    return {
      nextHopAddress: oAddress.leader(),
      targetAddress: address
    };
  }
  
  addFallbackResolver(resolver: oAddressResolver): void {
    this.fallbackResolvers.push(resolver);
  }
}
```

This comprehensive router system enables intelligent, flexible routing throughout the Olane network while supporting custom resolution logic and handling various network topologies and failure scenarios.
