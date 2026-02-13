# @olane/o-gateway-olane

Reference implementation of the Olane gateway. Resolves addresses in the `olane` namespace and routes requests through the Olane leader node.

## Installation

```bash
pnpm add @olane/o-gateway-olane
```

## How It Works

The `oGatewayResolver` handles address resolution for the Olane network. When a request arrives, it checks whether the address should be routed through the Olane gateway by examining two conditions:

1. **Path-based**: The address path starts with `olane` (e.g., `o://olane/some-tool`)
2. **Transport-based**: The target address includes the `/olane` custom transport

If either condition is met, the resolver routes the request to the Olane leader node at:

```
/dns4/leader.olane.com/tcp/3000/tls
```

Otherwise, the request is passed through unchanged.

## API

### `oGatewayResolver`

Extends `oAddressResolver` from `@olane/o-core`.

#### Constructor

```typescript
const resolver = new oGatewayResolver(address: oAddress);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `oAddress` | The address of the resolver node itself |

#### `resolve(request: ResolveRequest): Promise<RouteResponse>`

Resolves an incoming request to a route response. The `ResolveRequest` contains:

- `address` - The address being resolved
- `node` - The local node handling the request
- `request` - The original request payload
- `targetAddress` - The full target address with transport information

Returns a `RouteResponse` with `nextHopAddress`, `targetAddress`, and `requestOverride`.

#### `customTransports` (getter)

Returns `[new oCustomTransport('/olane')]`, declaring that this resolver handles the `/olane` transport.

## Usage

```typescript
import { oGatewayResolver } from '@olane/o-gateway-olane';
import { oAddress } from '@olane/o-core';

const resolver = new oGatewayResolver(myNodeAddress);

const route = await resolver.resolve({
  address: targetAddress,
  node: localNode,
  request: incomingRequest,
  targetAddress: fullTargetAddress,
});

// route.nextHopAddress will point to leader.olane.com for olane-bound requests
```

## Relationship to `@olane/o-gateway-interface`

This package is the reference implementation of the gateway concept defined by [`@olane/o-gateway-interface`](https://www.npmjs.com/package/@olane/o-gateway-interface). While `o-gateway-interface` defines the `oGateway` contract (name, transports, description, logo, website), this package provides the actual address resolution logic for the Olane network.

## Related Packages

- **@olane/o-gateway-interface** - Interface definition that gateways implement
- **@olane/o-core** - Core types including `oAddress`, `oAddressResolver`, `oCustomTransport`
- **@olane/o-node** - Node types including `oNodeTransport` used for leader routing

## License

(MIT OR Apache-2.0)
