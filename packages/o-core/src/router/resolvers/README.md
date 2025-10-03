# Address Resolvers

**TL;DR**: Customize how nodes resolve addresses in the `o://` space. Think of resolvers as the DNS layer for Olane OS.

## What is a Resolver?

An `oAddressResolver` is a pluggable component that processes addresses during routing. Resolvers form a chain where each resolver can:

- Modify the target address
- Add or modify transport information
- Transform the request
- Cache routing decisions
- Query external services for address resolution

## Quick Example

```typescript
import { oAddressResolver, oAddress, RouteResponse, ResolveRequest } from '@olane/o-core';

class MyCustomResolver extends oAddressResolver {
  constructor() {
    super(new oAddress('o://my-resolver'));
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: req } = request;
    
    // Your custom resolution logic
    const resolvedAddress = await this.lookupAddress(address);
    
    return {
      nextHopAddress: resolvedAddress,
      targetAddress: address,
      requestOverride: req
    };
  }
}
```

## Using Resolvers

Add resolvers to your router in the order they should execute:

```typescript
class MyRouter extends oRouter {
  constructor() {
    super();
    
    // Resolvers execute in order
    this.addResolver(new CacheResolver());
    this.addResolver(new RegistryResolver());
    this.addResolver(new MyCustomResolver());
  }
}
```

## Complete Documentation

See the [Router README](../README.md) for comprehensive documentation on:

- Address resolution patterns
- Creating custom resolvers
- Resolution chains
- Transport-specific routing
- Best practices and examples

## Example Resolvers

This directory contains example resolver implementations. Currently:

- `search.resolver.ts` - Network discovery resolver (commented out, requires libp2p)

Feel free to contribute additional resolver examples!
