# oHierarchyManager

**Package**: `@olane/o-core`  
**Module**: `core/lib/o-hierarchy.manager`  
**Purpose**: Local relationship manager for tracking a single node's direct leaders, parents, and children  
**Scope**: Per-node instance (each node has its own hierarchy manager with local view only)

## Overview

The `oHierarchyManager` is a **local relationship manager** that tracks and manages a **single node's** direct relationships within the Olane OS network. Each node instance has its own hierarchy manager that maintains three types of relationships from that node's perspective:

- **Leaders**: Discovery and coordination nodes that this node connects to for registry services
- **Parents**: Direct ancestor nodes in this node's hierarchical address path
- **Children**: Direct descendant nodes that this node owns or manages

This manager operates with a **local view only** - it knows about this node's immediate relationships but has no global understanding of the broader network topology. It ensures the integrity of this node's relationship data by preventing duplicate entries and providing a clean API for relationship management.

## Purpose in Olane OS

In Olane OS, nodes are organized in a hierarchical structure similar to a file system. The `oHierarchyManager` is the internal component that **each individual node uses** to track its own local relationships:

1. **Track Local Position**: Know this node's direct parents and children
2. **Enable Discovery**: Maintain connections to leader nodes for registry services
3. **Support Address Resolution**: Use parent relationships to construct this node's full address
4. **Manage Direct Children**: Track nodes that this node directly owns or supervises

**Important**: Each node has its own hierarchy manager with a **local view only**. The manager doesn't know about siblings, distant relatives, or the global network structure - only this node's immediate relationships.

### Local Relationship View Example

Consider the full network topology:

```
o://
├── leader (root leader)
├── company/
│   ├── finance/           
│   │   ├── analyst        ← This node
│   │   │   ├── revenue    
│   │   │   └── expenses   
│   │   └── reporting
│   └── engineering/
│       └── backend
└── utilities/
    └── converter
```

The `o://company/finance/analyst` node's hierarchy manager **only knows**:
- **Leaders**: `[o://leader]` - Where to register and discover other nodes
- **Parents**: `[o://company/finance]` - Its direct parent in the address hierarchy
- **Children**: `[o://company/finance/analyst/revenue, o://company/finance/analyst/expenses]` - Its direct children

**It does NOT know about**:
- Sibling nodes (e.g., `reporting`, `engineering`)
- Cousin nodes (e.g., `backend`, `converter`)
- Any other nodes in the network

Each node maintains only its **own local relationship data**, not a global network map.

## Core Concepts

### Leaders

Leaders are special nodes that provide discovery and coordination services. **From this node's perspective**, leaders are the discovery endpoints that this node connects to for registry and coordination.

**What this node tracks**:
- Which leader(s) this node is connected to
- Where to send registration and discovery requests
- Which leader to query when looking for other nodes

**Important**: The hierarchy manager stores **this node's leader connections**, not information about the leaders themselves or what other nodes connect to which leaders.

**Example Use**:
```typescript
// This node connects to the root leader
const manager = new oHierarchyManager({
  leaders: [new oAddress('o://leader')]
});

// This node knows: "I am connected to o://leader for discovery"
const leaders = manager.getLeaders(); // [oAddress('o://leader')]
```

### Parents

Parents are the direct ancestor nodes in **this node's address path**. A node can have multiple parents, which enables flexible address construction.

**What this node tracks**:
- Which node(s) are directly above this node in the hierarchy
- The path components that come before this node's name in its address
- Where this node fits in the organizational structure

**Important**: The hierarchy manager stores **this node's parent references**, not information about the parents themselves or their other children.

**Example Use**:
```typescript
// This node (analyst) has finance as its parent
const manager = new oHierarchyManager({
  parents: [new oAddress('o://company/finance')]
});

// This node knows: "My parent is o://company/finance"
// This node's full address would be: o://company/finance/analyst
// But this node does NOT know about other children of finance (siblings)
```

### Children

Children are nodes that **this node directly manages or owns**. This creates a parent-child relationship where this node has responsibility for or awareness of its direct children.

**What this node tracks**:
- Which nodes are directly below this node in the hierarchy
- Which nodes this node is responsible for managing or coordinating
- The immediate descendants in the address tree

**Important**: The hierarchy manager stores **this node's direct children only**, not grandchildren or any other descendants.

**Example Use**:
```typescript
// This node (analyst) directly manages revenue and expenses nodes
const manager = new oHierarchyManager({
  children: [
    new oAddress('o://company/finance/analyst/revenue'),
    new oAddress('o://company/finance/analyst/expenses')
  ]
});

// This node knows: "I manage revenue and expenses"
// This node does NOT know about:
// - Children of revenue or expenses (grandchildren)
// - Siblings of this node
// - Any other nodes in the network
```

## API Reference

### Constructor

```typescript
constructor(config: oHierarchyManagerConfig)
```

Creates a new hierarchy manager with the specified relationships.

**Parameters**:
- `config.leaders` (optional): Array of leader node addresses
- `config.parents` (optional): Array of parent node addresses
- `config.children` (optional): Array of child node addresses

**Example**:
```typescript
const manager = new oHierarchyManager({
  leaders: [new oAddress('o://leader')],
  parents: [new oAddress('o://company/finance')],
  children: [
    new oAddress('o://company/finance/analyst/revenue')
  ]
});
```

### clear()

```typescript
clear(): void
```

Resets all relationships by clearing leaders, parents, and children arrays.

**Example**:
```typescript
manager.clear();
// All relationships removed: leaders = [], parents = [], children = []
```

**Use Cases**:
- Node shutdown or reinitialization
- Testing and cleanup
- Dynamic topology reconfiguration

### addChild()

```typescript
addChild(address: oAddress): void
```

Adds a child node relationship. Automatically deduplicates to prevent adding the same child twice.

**Parameters**:
- `address`: The `oAddress` of the child node

**Example**:
```typescript
manager.addChild(new oAddress('o://company/finance/analyst/revenue'));
manager.addChild(new oAddress('o://company/finance/analyst/revenue')); // Ignored (duplicate)

const children = manager.getChildren(); // Only one entry
```

### removeChild()

```typescript
removeChild(address: oAddress | string): void
```

Removes a child node relationship.

**Parameters**:
- `address`: The `oAddress` or address string of the child to remove

**Example**:
```typescript
manager.removeChild(new oAddress('o://company/finance/analyst/revenue'));
// or
manager.removeChild('o://company/finance/analyst/revenue');
```

### getChild()

```typescript
getChild(address: oAddress): oAddress | undefined
```

Retrieves a specific child node by its static address (the last component of the address path).

**Parameters**:
- `address`: The `oAddress` to search for

**Returns**: The matching child `oAddress` or `undefined` if not found

**Example**:
```typescript
// Add child with full path
manager.addChild(new oAddress('o://company/finance/analyst/revenue'));

// Can find by full path or static address
const child = manager.getChild(new oAddress('o://revenue'));
// Returns: oAddress('o://company/finance/analyst/revenue')
```

**Note**: Uses `toStaticAddress()` for comparison, which extracts the last component of the address (e.g., `o://company/finance/analyst` → `o://analyst`).

### getChildren()

```typescript
getChildren(): oAddress[]
```

Returns all child node addresses.

**Returns**: Array of child `oAddress` objects

**Example**:
```typescript
const children = manager.getChildren();
// [oAddress('o://company/finance/analyst/revenue'), oAddress('o://company/finance/analyst/expenses')]
```

### addParent()

```typescript
addParent(address: oAddress): void
```

Adds a parent node relationship. Automatically deduplicates.

**Parameters**:
- `address`: The `oAddress` of the parent node

**Example**:
```typescript
manager.addParent(new oAddress('o://company/finance'));
manager.addParent(new oAddress('o://company/analytics')); // Multiple parents allowed
```

### removeParent()

```typescript
removeParent(address: oAddress | string): void
```

Removes a parent node relationship.

**Parameters**:
- `address`: The `oAddress` or address string of the parent to remove

**Example**:
```typescript
manager.removeParent(new oAddress('o://company/finance'));
// or
manager.removeParent('o://company/finance');
```

### getParents()

```typescript
getParents(): oAddress[]
```

Returns all parent node addresses.

**Returns**: Array of parent `oAddress` objects

**Example**:
```typescript
const parents = manager.getParents();
// [oAddress('o://company/finance'), oAddress('o://company/analytics')]
```

### getLeaders()

```typescript
getLeaders(): oAddress[]
```

Returns all leader node addresses.

**Returns**: Array of leader `oAddress` objects

**Example**:
```typescript
const leaders = manager.getLeaders();
// [oAddress('o://leader')]
```

## Usage Examples

### Basic Node Hierarchy Setup

```typescript
import { oHierarchyManager } from '@olane/o-core';
import { oAddress } from '@olane/o-core';

// Create a hierarchy manager for THIS node
const hierarchyManager = new oHierarchyManager({
  leaders: [new oAddress('o://leader')],        // Where THIS node connects
  parents: [new oAddress('o://company/finance')], // THIS node's parent
  children: []                                    // THIS node's children (none yet)
});

// THIS node can now:
// 1. Register itself with its leader
// 2. Resolve its full address using its parent path
// 3. Manage its direct child nodes as they connect
```

### Visual: What Each Node Knows

```
Full Network Topology (global view - NO single node knows this):
┌────────────────────────────────────────────────────────────┐
│  o://                                                       │
│  ├── leader                                                 │
│  └── company/                                               │
│      ├── finance/                                           │
│      │   ├── analyst ← NODE A                               │
│      │   │   ├── revenue ← NODE B                           │
│      │   │   └── expenses ← NODE C                          │
│      │   └── reporting ← NODE D                             │
│      └── engineering/                                       │
│          └── backend ← NODE E                               │
└────────────────────────────────────────────────────────────┘

NODE A (o://company/finance/analyst) ONLY knows:
  hierarchy.leaders = [o://leader]                    ✓ Its leader
  hierarchy.parents = [o://company/finance]           ✓ Its parent
  hierarchy.children = [o://...analyst/revenue,       ✓ Its children
                        o://...analyst/expenses]
  
  Does NOT know about: reporting, engineering, backend ✗

NODE B (o://company/finance/analyst/revenue) ONLY knows:
  hierarchy.leaders = [o://leader]                    ✓ Its leader
  hierarchy.parents = [o://company/finance/analyst]   ✓ Its parent
  hierarchy.children = []                             ✓ Its children (none)
  
  Does NOT know about: expenses (sibling), analyst's parent ✗

NODE D (o://company/finance/reporting) ONLY knows:
  hierarchy.leaders = [o://leader]                    ✓ Its leader
  hierarchy.parents = [o://company/finance]           ✓ Its parent
  hierarchy.children = []                             ✓ Its children (none)
  
  Does NOT know about: analyst (sibling), its children ✗

Key Insight: Each hierarchy manager is ISOLATED - no node knows about
other nodes except through explicit parent-child relationships.
```

### Dynamic Child Management

```typescript
// Financial coordinator node managing multiple worker nodes
const coordinator = new oHierarchyManager({
  leaders: [new oAddress('o://leader')],
  parents: [new oAddress('o://company')],
  children: []
});

// Add worker nodes as they start
coordinator.addChild(new oAddress('o://company/finance/revenue'));
coordinator.addChild(new oAddress('o://company/finance/expenses'));
coordinator.addChild(new oAddress('o://company/finance/reporting'));

// Get all managed workers
const workers = coordinator.getChildren();
console.log(`Managing ${workers.length} worker nodes`);

// Remove a worker if it shuts down
coordinator.removeChild(new oAddress('o://company/finance/expenses'));
```

### Multi-Parent Node Configuration

```typescript
// Node that belongs to multiple organizational hierarchies
const hybridNode = new oHierarchyManager({
  leaders: [new oAddress('o://leader')],
  parents: [
    new oAddress('o://company/finance'),
    new oAddress('o://company/analytics'),
    new oAddress('o://company/reporting')
  ],
  children: []
});

// Node can be addressed through any parent path:
// - o://company/finance/hybrid-node
// - o://company/analytics/hybrid-node
// - o://company/reporting/hybrid-node

const allParents = hybridNode.getParents();
console.log(`Node accessible via ${allParents.length} parent paths`);
```

### Topology Reconfiguration

```typescript
// Node initially configured in one location
const mobileNode = new oHierarchyManager({
  leaders: [new oAddress('o://leader')],
  parents: [new oAddress('o://region-east')],
  children: []
});

// Later, move to different region
mobileNode.removeParent(new oAddress('o://region-east'));
mobileNode.addParent(new oAddress('o://region-west'));

// Node has now "moved" in the topology without recreating
```

### Cleanup and Reset

```typescript
// During node shutdown or reinitialization
const nodeManager = new oHierarchyManager({
  leaders: [new oAddress('o://leader')],
  parents: [new oAddress('o://company/finance')],
  children: [
    new oAddress('o://company/finance/analyst/revenue')
  ]
});

// Clean shutdown: remove all relationships
nodeManager.clear();

// Manager is now empty and ready for reinitialization
console.log(nodeManager.getLeaders().length); // 0
console.log(nodeManager.getParents().length); // 0
console.log(nodeManager.getChildren().length); // 0
```

## Design Decisions

### Why Separate Leaders, Parents, and Children?

The three-way distinction serves different purposes **from this node's perspective**:

**Leaders** (Service Discovery):
- Where **this node** connects for discovery and coordination
- This node's entry point into the network
- Nodes can connect to leaders regardless of their hierarchical position
- This is a **service dependency**, not a hierarchical relationship

**Parents** (Address Hierarchy):
- Where **this node** fits in the address structure
- Path components that come before this node's name
- Multiple parents allow this node to be addressed through different paths
- This is a **positional relationship** for address resolution

**Children** (Direct Management):
- Which nodes **this node** directly owns or manages
- Immediate descendants that this node is responsible for
- Enables this node to delegate work or coordinate operations
- This is a **responsibility relationship** for management purposes

Each type serves a distinct role in how **this specific node** operates and interacts with the network.

### Why Allow Multiple Parents?

Multiple parents provide **addressing flexibility for this node**:

1. **Multi-Path Accessibility**: This node can be reached via different address paths
2. **Cross-Functional Belonging**: This node can logically belong to multiple organizational units
3. **Address Aliasing**: Same node accessible through different hierarchical routes
4. **Reorganization Safety**: Add new paths without breaking existing references

**Example**:
```typescript
// This analytics node can be addressed through multiple paths
const analytics = new oHierarchyManager({
  parents: [
    new oAddress('o://company/finance'),    // Accessible as o://company/finance/analytics
    new oAddress('o://company/marketing'),  // Accessible as o://company/marketing/analytics
    new oAddress('o://company/operations')  // Accessible as o://company/operations/analytics
  ]
});

// This single node instance is addressable via three different paths
// But it still doesn't know about siblings in any of these parent paths
```

### Why Automatic Deduplication?

Deduplication prevents common programming errors and maintains data integrity:

1. **Prevents Duplicate Relationships**: Calling `addChild()` twice with same address is safe
2. **Simplifies Client Code**: No need to check existence before adding
3. **Consistency**: Ensures each relationship appears exactly once
4. **Performance**: Reduces memory overhead and iteration time

### Why Static Address Comparison for getChild()?

The `getChild()` method uses `toStaticAddress()` (extracts last path component) rather than full address comparison because:

1. **Flexible Lookup**: Find child without knowing full hierarchical path
2. **Future-Proof**: Node reorganization doesn't break lookups
3. **Convenience**: Simpler API for common use case

**Example**:
```typescript
manager.addChild(new oAddress('o://very/long/path/to/node'));

// Can find with just the node name
const child = manager.getChild(new oAddress('o://node'));
// Returns: oAddress('o://very/long/path/to/node')
```

## Integration with Olane OS

**Every Olane node** has its own `oHierarchyManager` instance. The hierarchy manager is used internally by `oCore`, the base class for all nodes:

```typescript
// Simplified oCore usage - each node instance has its own hierarchy manager
class oCore extends oObject {
  public hierarchy: oHierarchyManager;

  constructor(config: oCoreConfig) {
    super();
    // Each node creates its own local hierarchy manager
    this.hierarchy = new oHierarchyManager({
      leaders: config.leader ? [config.leader] : [],
      parents: config.parent ? [config.parent] : [],
      children: []
    });
  }

  // This node uses its hierarchy manager for:
  // - Tracking which leader(s) it's connected to
  // - Knowing its parent(s) for address resolution
  // - Managing its direct children
  // - Local relationship management only
}
```

**Important**: Each node in the network has its own separate hierarchy manager instance. The hierarchy managers do not communicate with each other or share data. They are purely local storage for each node's own relationship information.

### When Nodes Use Hierarchy Manager

**During Startup**:
1. This node reads its hierarchy configuration
2. Creates its own `oHierarchyManager` with its leaders and parents
3. Connects to its leader(s) for network registration
4. Uses parent paths to construct its full address

**During Runtime**:
1. Receives child node connections → calls `addChild()` on its own manager
2. Needs to contact children → queries `getChildren()` from its own manager
3. Needs discovery services → queries `getLeaders()` from its own manager
4. Handles local topology changes (e.g., child disconnects → `removeChild()`)

**During Shutdown**:
1. Notifies its direct children of shutdown
2. Unregisters from its leaders
3. Calls `clear()` to clean up its local relationship data

## Performance Considerations

### Deduplication Cost

The `deduplicate()` method creates a new array on every add operation. For nodes with:
- **< 100 relationships**: Negligible performance impact
- **100-1000 relationships**: Still acceptable (< 1ms)
- **> 1000 relationships**: Consider optimization if frequent adds

**Current Implementation**:
```typescript
private deduplicate(addresses: oAddress[]): oAddress[] {
  const added: any = {};
  return addresses.filter((a: oAddress) => {
    if (added[a.toString()]) {
      return false;
    }
    added[a.toString()] = true;
    return true;
  });
}
```

### Memory Usage

- Each relationship stores an `oAddress` object (~100 bytes)
- Typical node: 1 leader + 1-2 parents + 0-10 children = ~1.5KB
- Even with 1000 nodes, total memory < 1.5MB

### Optimization Opportunities

For high-scale deployments (1000+ children per node):
1. Use `Set<string>` instead of array for O(1) lookups
2. Implement lazy deduplication on read instead of write
3. Consider immutable data structures for concurrent access

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { oHierarchyManager } from '@olane/o-core';
import { oAddress } from '@olane/o-core';

describe('oHierarchyManager', () => {
  it('should initialize with provided relationships', () => {
    const manager = new oHierarchyManager({
      leaders: [new oAddress('o://leader')],
      parents: [new oAddress('o://parent')],
      children: [new oAddress('o://child')]
    });

    expect(manager.getLeaders()).toHaveLength(1);
    expect(manager.getParents()).toHaveLength(1);
    expect(manager.getChildren()).toHaveLength(1);
  });

  it('should deduplicate child nodes', () => {
    const manager = new oHierarchyManager({ children: [] });
    const address = new oAddress('o://child');

    manager.addChild(address);
    manager.addChild(address); // Duplicate
    manager.addChild(address); // Duplicate

    expect(manager.getChildren()).toHaveLength(1);
  });

  it('should find child by static address', () => {
    const manager = new oHierarchyManager({ children: [] });
    manager.addChild(new oAddress('o://company/finance/analyst/revenue'));

    const found = manager.getChild(new oAddress('o://revenue'));
    expect(found).toBeDefined();
    expect(found?.toString()).toBe('o://company/finance/analyst/revenue');
  });

  it('should support multiple parents', () => {
    const manager = new oHierarchyManager({
      parents: [
        new oAddress('o://parent1'),
        new oAddress('o://parent2')
      ]
    });

    expect(manager.getParents()).toHaveLength(2);
  });

  it('should clear all relationships', () => {
    const manager = new oHierarchyManager({
      leaders: [new oAddress('o://leader')],
      parents: [new oAddress('o://parent')],
      children: [new oAddress('o://child')]
    });

    manager.clear();

    expect(manager.getLeaders()).toHaveLength(0);
    expect(manager.getParents()).toHaveLength(0);
    expect(manager.getChildren()).toHaveLength(0);
  });

  it('should remove relationships by string or oAddress', () => {
    const manager = new oHierarchyManager({
      children: [new oAddress('o://child1'), new oAddress('o://child2')]
    });

    manager.removeChild('o://child1');
    manager.removeChild(new oAddress('o://child2'));

    expect(manager.getChildren()).toHaveLength(0);
  });
});
```

## Related Documentation

- [Olane OS Architecture](../../../../docs/documentation-context/OLANE_OS_ARCHITECTURE.md) - Overall system architecture
- [oCore Class](../o-core.ts) - Node base class that uses this manager
- [oAddress Class](../../router/o-address.ts) - Address representation and utilities
- [@olane/o-core Package](../../README.md) - Parent package documentation

## Troubleshooting

### Issue: Can't find sibling or cousin nodes

**Problem**: Trying to use hierarchy manager to find nodes that aren't direct children.

**Cause**: This is the **most common misconception**. The hierarchy manager only tracks **this node's direct relationships**, not the entire network.

**Solution**: To discover other nodes in the network, use the leader's registry:

```typescript
// ❌ WRONG - hierarchy manager doesn't know about siblings
const sibling = this.hierarchy.getChild(new oAddress('o://sibling')); // undefined!

// ✅ CORRECT - ask the leader to discover nodes
const leaders = this.hierarchy.getLeaders(); // Get THIS node's leader connections
const leader = leaders[0]; // Connect to leader
const results = await leader.search({ /* search criteria */ }); // Discovery via leader
```

**Remember**: 
- Hierarchy manager = LOCAL relationship storage for THIS node only
- Leader's registry = GLOBAL node discovery across the network

### Issue: Child not found with getChild()

**Problem**: `getChild()` returns `undefined` even though child was added.

**Solution**: Remember that `getChild()` uses static address comparison (last path component only):

```typescript
manager.addChild(new oAddress('o://company/finance/revenue'));

// ❌ Won't find - middle component
manager.getChild(new oAddress('o://finance')); // undefined

// ✅ Will find - last component
manager.getChild(new oAddress('o://revenue')); // Found!
```

### Issue: Duplicate relationships appearing

**Problem**: Same address appears multiple times in relationship arrays.

**Diagnosis**: This should not happen due to automatic deduplication. If it occurs, check:
1. Are you using different `oAddress` instances with same value?
2. Is `toString()` returning consistent results?

**Workaround**: Call `clear()` and re-add relationships to force deduplication.

### Issue: Performance degradation with many children

**Problem**: Slow adds/removes with 1000+ children.

**Solution**: Consider batching operations or contributing optimization:
1. Use `clear()` + bulk add instead of individual `addChild()` calls
2. Cache `getChildren()` results if queried frequently
3. For extreme cases, extend class with `Set`-based implementation

## Summary

The `oHierarchyManager` is a **local relationship manager** that each Olane OS node uses to track its own direct relationships:

**Key Responsibilities**:
- ✅ Track which leaders **this node** connects to for discovery
- ✅ Maintain **this node's** parent references for address resolution
- ✅ Manage **this node's** direct children for delegation
- ✅ Ensure relationship integrity through automatic deduplication
- ✅ Provide clean API for local relationship management

**Design Principles**:
- **Local Scope**: Each node has its own manager with local view only
- **Simple API**: Clear methods for managing this node's relationships
- **Data Integrity**: Automatic deduplication prevents duplicate entries
- **Flexibility**: Multiple parents enable multi-path addressing
- **Type Safety**: Uses `oAddress` objects throughout
- **Performance**: Efficient for typical relationship counts per node

**Important Limitations**:
- ❌ Does NOT know about siblings, cousins, or other distant nodes
- ❌ Does NOT maintain global network topology
- ❌ Does NOT communicate with other hierarchy managers
- ✅ ONLY manages this single node's immediate relationships

**Use Cases**:
- Individual node initialization and configuration
- Managing this node's direct children
- Tracking this node's connection to leaders
- Resolving this node's full address via parents
- Local relationship updates (add/remove children)

---

**Package**: `@olane/o-core` v0.7.x  
**Last Updated**: October 13, 2025  
**Status**: Production-ready

