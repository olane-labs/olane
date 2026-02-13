# @olane/o-protocol

Protocol specification and type definitions for the Olane network.

## Installation

```bash
pnpm add @olane/o-protocol
```

## Overview

The o-protocol defines the communication layer for AI agent interaction across distributed networks. It provides the type system, addressing scheme, JSON-RPC message format, method definitions, and routing interfaces that all Olane nodes use to discover, register, and communicate with each other.

## Key Features

- **Hierarchical P2P Network Structure** - Resolves addresses within the o-network, a hierarchical federated network of p2p nodes
- **Universal Address Format** - `o://network_name/node_group_name/node_name/node_tool/node_tool_method`
- **Middleware-Enabled Routing** - Each term within the address represents a p2p node that contains its own functionality that can be leveraged as middleware on its route to the destination leaf node
- **JSON-RPC 2.0 Messaging** - Standard request/response protocol with typed error codes
- **AI-Native Method Discovery** - Rich method definitions with parameters, examples, approval metadata, and performance hints for AI agent consumption

## Usage

### Defining Methods and Parameters

Methods describe the capabilities a node exposes. Each method includes typed parameters, descriptions for AI discovery, and optional metadata for approval, performance, and error handling.

```typescript
import { oMethod, oParameter } from '@olane/o-protocol';

const parameters: oParameter[] = [
  {
    name: 'customerId',
    type: 'string',
    description: 'Unique customer identifier (UUID)',
    required: true,
    exampleValues: ['cust_abc123'],
  },
  {
    name: 'includeHistory',
    type: 'boolean',
    description: 'Include purchase history in the response',
    required: false,
    defaultValue: false,
  },
  {
    name: 'status',
    type: 'string',
    description: 'Filter by account status',
    required: false,
    structure: { enum: ['active', 'inactive', 'suspended'] },
  },
];

const methods: Record<string, oMethod> = {
  get_customer: {
    name: 'get_customer',
    description: 'Retrieves customer information by ID.',
    parameters,
    dependencies: [],
    requiresApproval: false,
    examples: [
      {
        description: 'Fetch a customer by ID',
        intent: 'Get customer details for cust_abc123',
        params: { customerId: 'cust_abc123' },
        expectedResult: { id: 'cust_abc123', name: 'Alice' },
      },
    ],
    commonErrors: [
      {
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: 'No customer exists with the given ID',
        causes: ['Invalid or expired customer ID'],
        remediation: 'Verify the customer ID and try again',
      },
    ],
    performance: {
      estimatedDuration: 200,
      cacheable: true,
      cacheKey: ['customerId'],
      idempotent: true,
    },
  },
};
```

### Working with JSON-RPC Messages

All Olane communication uses JSON-RPC 2.0. The protocol exports request, response, and error types along with standard error codes.

```typescript
import {
  JSONRPC_VERSION,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
  oRequest,
  oResponse,
} from '@olane/o-protocol';

// oRequest and oResponse are aliases for JSONRPCRequest and JSONRPCResponse
const request: oRequest = {
  jsonrpc: JSONRPC_VERSION,
  id: 'req-1',
  method: 'get_customer',
  params: {
    _connectionId: 'conn-1',
    _requestMethod: 'get_customer',
    customerId: 'cust_abc123',
  },
};
```

### Protocol Methods Enum

Built-in protocol methods used for node lifecycle operations:

```typescript
import { oProtocolMethods } from '@olane/o-protocol';

// oProtocolMethods.HANDSHAKE   = "handshake"
// oProtocolMethods.REGISTER    = "register"
// oProtocolMethods.ROUTE       = "route"
// oProtocolMethods.INDEX_NETWORK = "index_network"
// oProtocolMethods.INTENT      = "intent"
// oProtocolMethods.INTENT_METHOD_CONFIGURATION = "intent_method_configuration"
```

## API Reference

### oAddress

Defines the transport and protocol for a node address.

```typescript
interface oAddress {
  transports: string[];
  protocol: string;
}
```

### oMethod

Describes a callable method on a node, including everything an AI agent needs for discovery and invocation.

```typescript
interface oMethod {
  name: string;                        // Method identifier
  description: string;                 // Human/AI-readable description
  parameters: oParameter[];            // Input parameters
  dependencies: oDependency[];         // External node dependencies
  requiresApproval?: boolean;          // Whether human approval is needed
  approvalMetadata?: oApprovalMetadata; // Risk level, category, auto-approve rules
  examples?: oMethodExample[];         // Example invocations with expected results
  commonErrors?: oCommonError[];       // Known failure modes and remediation
  performance?: oPerformanceMetadata;  // Timing, caching, batching hints
  successCriteria?: string;            // What constitutes a successful call
  suggestedContext?: string[];         // Recommended context for the AI agent
  similarMethods?: string[];           // Related methods for discovery
}
```

### oParameter

Defines a single input parameter for a method.

```typescript
interface oParameter {
  name: string;                          // Parameter name
  type: string;                          // Type: "string", "number", "boolean", "array", "object"
  value?: any;                           // Pre-set value (if fixed)
  description?: string;                  // Human/AI-readable description
  required?: boolean;                    // Whether the parameter is required
  options?: any[];                       // Allowed values (legacy, prefer structure.enum)
  structure?: oParameterStructure;       // Nested structure, constraints, enums
  schema?: any;                          // JSON Schema for complex validation
  defaultValue?: any;                    // Default if not provided
  exampleValues?: any[];                 // Example values for AI agents
  validationRules?: string[];            // Validation rule descriptions
}

interface oParameterStructure {
  objectProperties?: Record<string, oParameter>; // Properties for object types
  arrayItems?: oParameter;                        // Item type for array types
  enum?: any[];                                   // Allowed values
  pattern?: string;                               // Regex pattern for strings
  minimum?: number;                               // Minimum for numbers
  maximum?: number;                               // Maximum for numbers
  minLength?: number;                             // Min length for strings/arrays
  maxLength?: number;                             // Max length for strings/arrays
}
```

### oDependency

Declares a dependency on another node in the network.

```typescript
interface oDependency {
  address: string;            // o:// address of the dependency
  version?: string;           // Required version
  method?: string;            // Specific method required
  parameters?: oParameter[];  // Parameters to pass
}
```

### JSON-RPC Types

| Type | Description |
|------|-------------|
| `JSONRPCRequest` | A request that expects a response (`jsonrpc`, `id`, `method`, `params`) |
| `JSONRPCResponse` | A successful response (`jsonrpc`, `id`, `result`) |
| `JSONRPCError` | An error response (`jsonrpc`, `id`, `error: { code, message, data? }`) |
| `JSONRPCNotification` | A notification that does not expect a response |
| `oRequest` | Alias for `JSONRPCRequest` |
| `oResponse` | Alias for `JSONRPCResponse` |
| `RequestId` | `string \| number` |

### Standard Error Codes

| Constant | Value | Meaning |
|----------|-------|---------|
| `PARSE_ERROR` | -32700 | Invalid JSON received |
| `INVALID_REQUEST` | -32600 | JSON is not a valid request object |
| `METHOD_NOT_FOUND` | -32601 | Method does not exist |
| `INVALID_PARAMS` | -32602 | Invalid method parameters |
| `INTERNAL_ERROR` | -32603 | Internal server error |

### Approval Metadata

Methods that perform sensitive operations can declare approval requirements:

```typescript
interface oApprovalMetadata {
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'read' | 'write' | 'destructive' | 'network' | 'system';
  description?: string;
  autoApproveConditions?: {
    parameterConstraints?: Record<string, any>;
    contextRequirements?: string[];
    userRoles?: string[];
  };
  denialReasons?: string[];
  alternativeMethods?: string[];
}
```

### Performance Metadata

Hints for AI agents and the runtime about method behavior:

```typescript
interface oPerformanceMetadata {
  estimatedDuration?: number;    // Expected duration in ms
  maxDuration?: number;          // Timeout threshold in ms
  cacheable?: boolean;           // Whether results can be cached
  cacheKey?: string[];           // Parameter names that form the cache key
  idempotent?: boolean;          // Safe to retry
  supportsBatching?: boolean;    // Can process multiple inputs
  batchSizeLimit?: number;       // Max batch size
  supportsStreaming?: boolean;    // Supports streaming responses
}
```

### Registration and Routing

Used internally by the node lifecycle for network registration and message routing:

- **`oRegisterRequest`** - Request to register a node with `transports`, `peerId`, `address`, `protocols`, and optional `ttl`
- **`oRouterRequestInterface`** - Request to route a message to an `address` with a `payload`
- **`oHandshakeRequest` / `oHandshakeResponse`** - Initial capability exchange between nodes

### Config

```typescript
import { LATEST_PROTOCOL_VERSION } from '@olane/o-protocol';
// LATEST_PROTOCOL_VERSION = '1.0.0'
```

## License

MIT