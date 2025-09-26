---
title: "Address System - o:// Protocol and oAddress"
description: "Complete guide to Olane's hierarchical addressing system and the o:// protocol for network communication"
---

# Address System

The Olane address system uses the `o://` protocol to create hierarchical, human-readable addresses that enable intelligent routing and communication across the network. Every resource, tool, and service in an Olane network has a unique address.

## The o:// Protocol

The `o://` protocol is Olane's addressing scheme that provides:

- **Hierarchical Organization** - Addresses follow a tree-like structure
- **Human Readability** - Addresses are meaningful and easy to understand
- **Intelligent Routing** - The network can route requests efficiently based on address structure
- **Resource Identification** - Every tool, data point, or service has a unique address

### Address Format

```
o://[network]/[path]/[subpath]/[resource]
```

**Components:**

- `o://` - Protocol identifier (required)
- `network` - Root network identifier
- `path` - Primary path or service category
- `subpath` - Sub-category or specific service
- `resource` - Specific resource or method

### Address Examples

```typescript
// Network root
'o://my-company'

// Service categories
'o://my-company/storage'
'o://my-company/ai'
'o://my-company/mcp'

// Specific services
'o://my-company/storage/documents'
'o://my-company/ai/gpt4'
'o://my-company/mcp/linear'

// Methods and actions
'o://my-company/storage/documents/upload'
'o://my-company/ai/gpt4/chat'
'o://my-company/mcp/linear/create-issue'
```

## oAddress Class

The `oAddress` class represents and manages addresses within the Olane network.

### Constructor

```typescript
constructor(value: string, transports?: oTransport[])
```

**Parameters:**
- `value: string` - The address string (must start with 'o://')
- `transports?: oTransport[]` - Available transports for reaching this address

**Example:**

```typescript
import { oAddress } from '@olane/o-core';

// Basic address
const addr = new oAddress('o://my-network/storage');

// Address with transports
const addrWithTransports = new oAddress(
  'o://remote-network/api',
  [webSocketTransport, libp2pTransport]
);
```

### Properties

#### `value: string`

The complete address string.

```typescript
const addr = new oAddress('o://my-network/storage/files');
console.log(addr.value); // "o://my-network/storage/files"
```

#### `transports: oTransport[]`

Array of available transports for reaching this address.

```typescript
const addr = new oAddress('o://remote-service/api');
addr.setTransports([webSocketTransport, httpTransport]);

console.log('Available transports:', addr.transports.length);
```

#### `paths: string`

The address without the 'o://' protocol prefix.

```typescript
const addr = new oAddress('o://my-network/storage/documents');
console.log(addr.paths); // "my-network/storage/documents"
```

#### `protocol: string`

The address formatted for internal routing (replaces 'o://' with '/o/').

```typescript
const addr = new oAddress('o://my-network/storage');
console.log(addr.protocol); // "/o/my-network/storage"
```

#### `root: string`

The root network address.

```typescript
const addr = new oAddress('o://my-network/storage/documents/file.pdf');
console.log(addr.root); // "o://my-network"
```

### Methods

#### `validate(): boolean`

Validates that the address follows the correct o:// format.

```typescript
const validAddr = new oAddress('o://my-network/service');
console.log(validAddr.validate()); // true

const invalidAddr = new oAddress('http://example.com');
console.log(invalidAddr.validate()); // false

// Always validate addresses before using them
if (!address.validate()) {
  throw new Error('Invalid address format');
}
```

#### `equals(other: oAddress): boolean`

Compares two addresses for equality (includes transport comparison).

```typescript
const addr1 = new oAddress('o://network/service');
const addr2 = new oAddress('o://network/service');
const addr3 = new oAddress('o://network/other');

console.log(addr1.equals(addr2)); // true
console.log(addr1.equals(addr3)); // false
```

#### `transportsEqual(other: oAddress): boolean`

Compares only the transports of two addresses.

```typescript
const addr1 = new oAddress('o://service', [transport1, transport2]);
const addr2 = new oAddress('o://different-service', [transport1, transport2]);

console.log(addr1.transportsEqual(addr2)); // true (same transports)
```

#### `setTransports(transports: oTransport[]): void`

Sets the available transports for this address.

```typescript
const addr = new oAddress('o://remote-service/api');
addr.setTransports([
  new WebSocketTransport('ws://remote-host:8080'),
  new HttpTransport('https://remote-host:443')
]);
```

#### `supportsTransport(transport: oTransport): boolean`

Checks if the address supports a specific transport type.

```typescript
const addr = new oAddress('o://service', [webSocketTransport]);
console.log(addr.supportsTransport(webSocketTransport)); // true
console.log(addr.supportsTransport(httpTransport)); // false
```

#### `toString(): string`

Returns the address as a string.

```typescript
const addr = new oAddress('o://my-network/service');
console.log(addr.toString()); // "o://my-network/service"
console.log(`Connecting to ${addr}`); // Uses toString() automatically
```

### Static Methods

#### `equals(a: oAddress, b: oAddress): boolean`

Static method to compare two addresses.

```typescript
const addr1 = new oAddress('o://network/service');
const addr2 = new oAddress('o://network/service');

console.log(oAddress.equals(addr1, addr2)); // true
```

#### `leader(): oAddress`

Returns the special leader address for network routing.

```typescript
const leaderAddr = oAddress.leader();
console.log(leaderAddr.toString()); // Special leader address
```

#### `isStatic(address: oAddress): boolean`

Checks if an address is static (not a leader address).

```typescript
const regularAddr = new oAddress('o://my-network/service');
const leaderAddr = oAddress.leader();

console.log(oAddress.isStatic(regularAddr)); // true
console.log(oAddress.isStatic(leaderAddr)); // false
```

#### `next(address: oAddress, targetAddress: oAddress): oAddress`

Calculates the next hop address for routing to a target.

```typescript
const currentAddr = new oAddress('o://network/service');
const targetAddr = new oAddress('o://network/service/subservice');

const nextHop = oAddress.next(currentAddr, targetAddr);
console.log('Next hop:', nextHop.toString());
```

## Address Patterns and Best Practices

### Hierarchical Organization

Organize your addresses hierarchically for better routing and management:

```typescript
// Good: Clear hierarchy
'o://company/department/team/service'
'o://company/storage/documents/invoices'
'o://company/ai/models/gpt4'

// Avoid: Flat structure
'o://company/service1'
'o://company/service2'
'o://company/service3'
```

### Semantic Naming

Use meaningful names that describe the resource or service:

```typescript
// Good: Descriptive names
'o://analytics/user-behavior/tracking'
'o://storage/customer-data/profiles'
'o://ai/natural-language/translation'

// Avoid: Generic names
'o://system/service1/endpoint'
'o://data/table2/query'
```

### Service Categories

Group related services under logical categories:

```typescript
// Storage services
'o://network/storage/documents'
'o://network/storage/images'
'o://network/storage/backups'

// AI services
'o://network/ai/chat'
'o://network/ai/image-generation'
'o://network/ai/code-analysis'

// Integration services
'o://network/mcp/slack'
'o://network/mcp/github'
'o://network/mcp/linear'
```

### Method Addressing

Include method names in addresses for direct method invocation:

```typescript
// Direct method calls
'o://calculator/math/add'
'o://storage/files/upload'
'o://ai/chat/send-message'

// RESTful-style addressing
'o://api/users/create'
'o://api/users/update'
'o://api/users/delete'
```

## Address Resolution and Routing

### How Address Resolution Works

When a node receives a request for an address, it follows this resolution process:

1. **Parse the address** - Extract network, path, and resource components
2. **Check if internal** - Determine if the address points to a local resource
3. **Find next hop** - If external, determine the next node in the routing path
4. **Establish connection** - Connect to the next hop or target node
5. **Forward request** - Send the request along the routing path

### Example Resolution Flow

```typescript
// Request: o://remote-network/ai/gpt4/chat
// Current node: o://my-network/gateway

// Step 1: Parse address
const target = new oAddress('o://remote-network/ai/gpt4/chat');
console.log('Root:', target.root); // "o://remote-network"
console.log('Path:', target.paths); // "remote-network/ai/gpt4/chat"

// Step 2: Check if internal
const isInternal = router.isInternal(target); // false

// Step 3: Find next hop (likely a bridge or leader)
const { nextHopAddress, targetAddress } = await router.translate(target);
console.log('Next hop:', nextHopAddress.toString()); // "o://leader"
console.log('Final target:', targetAddress.toString()); // "o://remote-network/ai/gpt4/chat"

// Step 4: Establish connection and forward
const connection = await node.connect(nextHopAddress, targetAddress);
const response = await connection.send(request);
```

### Custom Address Resolvers

You can create custom resolvers for specific address patterns:

```typescript
import { oAddressResolver } from '@olane/o-core';

class DatabaseResolver extends oAddressResolver {
  async resolve(address: oAddress): Promise<oAddress[]> {
    // Handle database-specific addresses
    if (address.paths.startsWith('db/')) {
      const dbName = address.paths.split('/')[1];
      const dbServer = this.getDatabaseServer(dbName);
      return [new oAddress(`o://db-cluster/${dbServer}${address.paths}`)];
    }
    return [];
  }
  
  private getDatabaseServer(dbName: string): string {
    // Load balancing logic for database servers
    const servers = ['db-server-1', 'db-server-2', 'db-server-3'];
    const hash = this.hashString(dbName);
    return servers[hash % servers.length];
  }
}

// Add to router
node.router.addResolver(new DatabaseResolver());
```

## Advanced Address Usage

### Dynamic Address Generation

Generate addresses programmatically based on context:

```typescript
class AddressBuilder {
  private base: string;
  
  constructor(network: string) {
    this.base = `o://${network}`;
  }
  
  storage(category: string): oAddress {
    return new oAddress(`${this.base}/storage/${category}`);
  }
  
  ai(model: string, method?: string): oAddress {
    const path = `${this.base}/ai/${model}`;
    return new oAddress(method ? `${path}/${method}` : path);
  }
  
  mcp(service: string, action?: string): oAddress {
    const path = `${this.base}/mcp/${service}`;
    return new oAddress(action ? `${path}/${action}` : path);
  }
}

// Usage
const builder = new AddressBuilder('my-company');
const addresses = {
  documents: builder.storage('documents'),
  chatGPT: builder.ai('gpt4', 'chat'),
  slackPost: builder.mcp('slack', 'post-message')
};
```

### Address Validation and Sanitization

```typescript
class AddressValidator {
  static validate(address: string): boolean {
    // Basic format check
    if (!address.startsWith('o://')) {
      return false;
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"\\|?*]/;
    if (invalidChars.test(address)) {
      return false;
    }
    
    // Check path structure
    const paths = address.replace('o://', '').split('/');
    if (paths.length === 0 || paths[0] === '') {
      return false;
    }
    
    return true;
  }
  
  static sanitize(address: string): string {
    // Remove invalid characters
    let sanitized = address.replace(/[<>:"\\|?*]/g, '');
    
    // Ensure proper format
    if (!sanitized.startsWith('o://')) {
      sanitized = 'o://' + sanitized;
    }
    
    // Remove double slashes (except after protocol)
    sanitized = sanitized.replace(/([^:])\/+/g, '$1/');
    
    return sanitized;
  }
}

// Usage
const userInput = 'my-network/storage/documents';
const sanitized = AddressValidator.sanitize(userInput);
console.log(sanitized); // "o://my-network/storage/documents"

if (AddressValidator.validate(sanitized)) {
  const address = new oAddress(sanitized);
  // Use the address...
}
```

### Address Patterns for Different Use Cases

#### Microservices Architecture

```typescript
// Service discovery pattern
'o://services/user-service/api/v1'
'o://services/payment-service/api/v1'
'o://services/notification-service/api/v1'

// Load balancing pattern
'o://services/user-service/instance-1'
'o://services/user-service/instance-2'
'o://services/user-service/instance-3'
```

#### Data Pipeline Architecture

```typescript
// Pipeline stages
'o://pipeline/ingestion/raw-data'
'o://pipeline/processing/clean-data'
'o://pipeline/analysis/insights'
'o://pipeline/output/reports'

// Data sources
'o://data/sources/salesforce'
'o://data/sources/database'
'o://data/sources/api-feeds'
```

#### AI Agent Network

```typescript
// Specialized agents
'o://agents/research/web-search'
'o://agents/analysis/data-scientist'
'o://agents/communication/email-writer'
'o://agents/coordination/project-manager'

// Shared resources
'o://shared/knowledge-base'
'o://shared/tools/calculator'
'o://shared/memory/conversation-history'
```

## Error Handling

### Address Validation Errors

```typescript
function safeCreateAddress(addressString: string): oAddress {
  try {
    const address = new oAddress(addressString);
    
    if (!address.validate()) {
      throw new Error(`Invalid address format: ${addressString}`);
    }
    
    return address;
  } catch (error) {
    console.error('Address creation failed:', error.message);
    // Return a default or throw a custom error
    throw new oError('INVALID_ADDRESS', `Cannot create address: ${addressString}`);
  }
}

// Usage
try {
  const address = safeCreateAddress('o://my-network/service');
  // Use address...
} catch (error) {
  console.error('Address error:', error.message);
}
```

### Routing Errors

```typescript
async function safeAddressResolution(node: oCore, address: oAddress) {
  try {
    const { nextHopAddress, targetAddress } = await node.router.translate(address);
    return { nextHopAddress, targetAddress };
  } catch (error) {
    if (error.code === 'ADDRESS_NOT_FOUND') {
      console.error(`Cannot resolve address: ${address.toString()}`);
      // Maybe try alternative addresses or fallback services
    } else if (error.code === 'NETWORK_UNREACHABLE') {
      console.error(`Network unreachable for: ${address.toString()}`);
      // Maybe retry later or use cached data
    }
    throw error;
  }
}
```

## Complete Example

```typescript
import { oAddress, oCore, oTransport } from '@olane/o-core';

class SmartAddressManager {
  private node: oCore;
  private addressCache: Map<string, oAddress> = new Map();
  
  constructor(node: oCore) {
    this.node = node;
  }
  
  // Create and cache addresses
  createAddress(addressString: string, transports?: oTransport[]): oAddress {
    const cached = this.addressCache.get(addressString);
    if (cached) {
      return cached;
    }
    
    const address = new oAddress(addressString, transports);
    
    if (!address.validate()) {
      throw new Error(`Invalid address: ${addressString}`);
    }
    
    this.addressCache.set(addressString, address);
    return address;
  }
  
  // Smart address resolution with fallbacks
  async resolveWithFallback(addressString: string): Promise<oAddress> {
    const primaryAddress = this.createAddress(addressString);
    
    try {
      // Try primary address
      const { nextHopAddress } = await this.node.router.translate(primaryAddress);
      return nextHopAddress;
    } catch (error) {
      console.warn(`Primary address failed: ${addressString}, trying fallbacks`);
      
      // Try fallback addresses
      const fallbacks = this.generateFallbacks(primaryAddress);
      
      for (const fallback of fallbacks) {
        try {
          const { nextHopAddress } = await this.node.router.translate(fallback);
          console.log(`Using fallback: ${fallback.toString()}`);
          return nextHopAddress;
        } catch (fallbackError) {
          console.warn(`Fallback failed: ${fallback.toString()}`);
        }
      }
      
      throw new Error(`All address resolution attempts failed for: ${addressString}`);
    }
  }
  
  private generateFallbacks(address: oAddress): oAddress[] {
    const fallbacks: oAddress[] = [];
    
    // Try parent addresses
    const parts = address.paths.split('/');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('/');
      fallbacks.push(new oAddress(`o://${parentPath}`));
    }
    
    // Try leader address
    fallbacks.push(oAddress.leader());
    
    return fallbacks;
  }
  
  // Batch address operations
  async batchResolve(addresses: string[]): Promise<Map<string, oAddress>> {
    const results = new Map<string, oAddress>();
    
    const promises = addresses.map(async (addr) => {
      try {
        const resolved = await this.resolveWithFallback(addr);
        results.set(addr, resolved);
      } catch (error) {
        console.error(`Failed to resolve: ${addr}`, error);
      }
    });
    
    await Promise.allSettled(promises);
    return results;
  }
}

// Usage
const addressManager = new SmartAddressManager(node);

// Create addresses with validation
const serviceAddr = addressManager.createAddress('o://my-network/ai/gpt4');

// Resolve with automatic fallbacks
const resolvedAddr = await addressManager.resolveWithFallback('o://remote-service/api');

// Batch operations
const addresses = [
  'o://service-1/api',
  'o://service-2/data',
  'o://service-3/compute'
];
const resolved = await addressManager.batchResolve(addresses);
```

This comprehensive address system enables flexible, intelligent routing and communication throughout the Olane network while maintaining human-readable, hierarchical organization.
