# @olane/o-gateway-interface

Interface definition for Olane gateway implementations. This package defines the contract that all gateway implementations must satisfy.

## What is a Gateway?

In the Olane network, gateways act like DNS registrars for `o://` addresses. When a request is made to an address like `o://brendon/my-tool`, the gateway is responsible for resolving the first term (`brendon`) to determine how to route the request. Gateways prevent conflicting namespaces, bridge into walled gardens, broker communication, and establish a system of trust for AI agents, humans, and other entities to collaborate safely.

## Installation

```bash
pnpm add @olane/o-gateway-interface
```

## The `oGateway` Interface

This package exports a single interface that all gateway implementations must conform to:

```typescript
import { oGateway } from '@olane/o-gateway-interface';
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | The unique name identifying this gateway (e.g., `"olane"`) |
| `transports` | `string[]` | List of transport protocols this gateway supports (e.g., `["/olane"]`) |
| `description` | `string` | Human-readable description of the gateway and its purpose |
| `logo` | `string` | URL or path to the gateway's logo image |
| `website` | `string` | URL of the gateway's website |

### Interface Definition

```typescript
export interface oGateway {
  name: string;
  transports: string[];
  description: string;
  logo: string;
  website: string;
}
```

## Implementing a Gateway

To create a custom gateway, implement the `oGateway` interface and provide an address resolver that handles routing for your namespace. The resolver is responsible for inspecting incoming addresses and determining the next hop.

For a complete reference implementation, see [`@olane/o-gateway-olane`](https://www.npmjs.com/package/@olane/o-gateway-olane), which resolves addresses in the `olane` namespace and routes them through the Olane leader node.

## Related Packages

- **@olane/o-gateway-olane** - Reference implementation of this interface for the Olane network
- **@olane/o-core** - Core types including `oAddress`, `oAddressResolver`, and transport primitives
- **@olane/o-protocol** - Protocol definitions used by gateways

## License

(MIT OR Apache-2.0)
