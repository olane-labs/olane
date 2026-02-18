# o-tools-common

**⚠️ EXPERIMENTAL PACKAGE** - This package is in active development and APIs may change.

Common tool collection for Olane OS nodes - provides essential capabilities like encryption, search, and storage that most nodes need.

**TL;DR**: Pre-built tools for storage, encryption, search, and approval that you can add to any node with one function call.

## Quick Start

```bash
# Install the package
pnpm install @olane/o-tools-common
```

```typescript
// Add common tools to your node with one line
import { oLaneTool } from '@olane/o-lane';
import { initCommonTools } from '@olane/o-tools-common';

class MyNode extends oLaneTool {
  async hookStartFinished(): Promise<void> {
    // Initialize all common tools
    await initCommonTools(this);

    // Now you can use encryption, search, and storage tools
    await super.hookStartFinished();
  }
}
```

## Overview {#overview}

`o-tools-common` is a collection of reusable tools that solve common needs across Olane nodes:

- **Storage**: Persistent data storage (via `@olane/o-storage`)
- **OS Config Storage**: OS-level configuration storage
- **Encryption**: Secure data encryption/decryption using AES-256-GCM
- **Search**: Network-wide vector search capabilities
- **Approval**: Human-in-the-loop approval system (via `@olane/o-approval`)

Instead of implementing these capabilities in every node, import this package and get them instantly.

## Installation {#installation}

```bash
pnpm install @olane/o-tools-common
```

**Peer Dependencies:**

The package requires these Olane packages (usually already in your project):

```json
{
  "@olane/o-config": "^0.7.2",
  "@olane/o-core": "^0.7.2",
  "@olane/o-leader": "^0.7.2",
  "@olane/o-protocol": "^0.7.2",
  "@olane/o-storage": "^0.7.2",
  "@olane/o-tool": "^0.7.2",
  "@olane/o-lane": "^0.7.2"
}
```

## Available Tools {#available-tools}

### 1. Encryption Tool {#encryption-tool}

Encrypts and decrypts sensitive data using AES-256-GCM algorithm.

**Address**: `o://encryption`

#### Methods

##### `_tool_encrypt(request)`

Encrypts plaintext to base64-encoded encrypted string.

**Parameters:**
- `value` (string, required): The plaintext to encrypt

**Returns:**
```typescript
{
  value: string  // Base64-encoded encrypted data
}
```

**Example:**

```typescript
// Encrypt sensitive data
const response = await node.use(new oNodeAddress('o://encryption'), {
  method: 'encrypt',
  params: {
    value: 'my-secret-password'
  }
});

if (response.result.success) {
  console.log(response.result.data.value);
  // Output: "eyJlbmNyeXB0ZWRUZXh0Ij..."
}
```

##### `_tool_decrypt(request)`

Decrypts base64-encoded encrypted string back to plaintext.

**Parameters:**
- `value` (string, required): Base64-encoded encrypted data

**Returns:**
```typescript
{
  value: string  // Decrypted plaintext
}
```

**Example:**

```typescript
// Decrypt encrypted data
const response = await node.use(new oNodeAddress('o://encryption'), {
  method: 'decrypt',
  params: {
    value: 'eyJlbmNyeXB0ZWRUZXh0Ij...'
  }
});

if (response.result.success) {
  console.log(response.result.data.value);
  // Output: "my-secret-password"
}
```

#### Configuration

Set encryption key via environment variable:

```bash
# .env file
VAULT_KEY=your-secret-key-here
```

**Generate a secure key:**

```typescript
import { EncryptionService } from '@olane/o-tools-common';

const secretKey = EncryptionService.generateSecretKey();
console.log(secretKey);
// Use this in your VAULT_KEY env var
```

---

### 2. Search Tool {#search-tool}

Performs vector-based semantic search across the Olane network.

**Address**: `o://search`

#### Methods

##### `_tool_vector(request)`

Searches the network using vector similarity.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Maximum results to return (default: 10)

**Returns:**
```typescript
Array<{
  // Search results from vector store
  // Structure depends on vector store implementation
}>
```

**Example:**

```typescript
// Search for documents about financial analysis
const response = await node.use(new oNodeAddress('o://search'), {
  method: 'vector',
  params: {
    query: 'financial analysis and revenue forecasting',
    limit: 5
  }
});

if (response.result.success) {
  console.log(response.result.data);
  // Returns 5 most similar documents
}
```

<Note>
  **Prerequisite**: Search tool requires a vector store node at `o://vector-store` with a `search_similar` method.
</Note>

---

### 3. Storage Tool {#storage-tool}

Provides persistent data storage capabilities. This tool is imported from `@olane/o-storage`.

**Address**: `o://storage`

See [@olane/o-storage documentation](/packages/o-storage) for complete API reference.

## Response Structure {#response-structure}

When calling common tools via `node.use()`, responses follow the standard Olane response structure:

```typescript
const response = await this.use(
  new oNodeAddress('o://encryption'),
  { method: 'encrypt', params: { value: 'secret' } }
);

// response.result.success - boolean indicating success or failure
// response.result.data    - the return value on success
// response.result.error   - error message on failure

if (response.result.success) {
  const encrypted = response.result.data.value;
} else {
  console.error('Failed:', response.result.error);
}
```

> **Important**: Never access `response.success` or `response.data` directly. Always use `response.result.success` and `response.result.data`.

## Usage Guide {#usage-guide}

### Basic Setup

Add common tools to any `oLaneTool` node:

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';
import { initCommonTools } from '@olane/o-tools-common';

class FinancialAnalystNode extends oLaneTool {
  constructor() {
    super({
      address: new oNodeAddress('o://company/finance/analyst'),
      laneContext: {
        domain: 'Financial Analysis'
      }
    });
  }

  async hookStartFinished(): Promise<void> {
    // Add all common tools
    await initCommonTools(this);

    this.logger.info('Common tools initialized');
    await super.hookStartFinished();
  }

  // Now you can use common tools in your methods
  async _tool_save_report(request: oRequest) {
    const { reportData } = request.params;

    // Use encryption tool
    const encryptResponse = await this.use(
      new oNodeAddress('o://encryption'),
      { method: 'encrypt', params: { value: reportData } }
    );

    if (!encryptResponse.result.success) {
      throw new Error(`Encryption failed: ${encryptResponse.result.error}`);
    }

    // Use storage tool
    await this.use(
      new oNodeAddress('o://storage'),
      { method: 'put', params: { key: 'report', value: encryptResponse.result.data.value } }
    );

    return { saved: true };
  }
}
```

### Selective Tool Initialization

Initialize tools individually if you don't need all of them:

```typescript
import { EncryptionTool } from '@olane/o-tools-common';
import { oLaneTool } from '@olane/o-lane';

class MyNode extends oLaneTool {
  async hookStartFinished(): Promise<void> {
    // Only add encryption tool
    const encryptionTool = new EncryptionTool({
      name: 'encryption',
      parent: this.address,
      leader: this.leader
    });

    await encryptionTool.start();
    this.addChildNode(encryptionTool as any);
    await super.hookStartFinished();
  }
}
```

## Common Use Cases {#use-cases}

### Use Case 1: Encrypt User Credentials

```typescript
class AuthNode extends oLaneTool {
  async _tool_store_credentials(request: oRequest) {
    const { username, password } = request.params;

    // Encrypt password before storing
    const encrypted = await this.use(
      new oNodeAddress('o://encryption'),
      { method: 'encrypt', params: { value: password } }
    );

    if (!encrypted.result.success) {
      throw new Error(`Encryption failed: ${encrypted.result.error}`);
    }

    // Store encrypted password
    await this.use(
      new oNodeAddress('o://storage'),
      {
        method: 'put',
        params: {
          key: `user:${username}:password`,
          value: encrypted.result.data.value
        }
      }
    );

    return { stored: true };
  }

  async _tool_verify_credentials(request: oRequest) {
    const { username, password } = request.params;

    // Retrieve encrypted password
    const stored = await this.use(
      new oNodeAddress('o://storage'),
      { method: 'get', params: { key: `user:${username}:password` } }
    );

    if (!stored.result.success) {
      throw new Error(`Storage retrieval failed: ${stored.result.error}`);
    }

    // Decrypt and compare
    const decrypted = await this.use(
      new oNodeAddress('o://encryption'),
      { method: 'decrypt', params: { value: stored.result.data.value } }
    );

    if (!decrypted.result.success) {
      throw new Error(`Decryption failed: ${decrypted.result.error}`);
    }

    return { valid: decrypted.result.data.value === password };
  }
}
```

### Use Case 2: Search and Retrieve Context

```typescript
class DocumentAnalystNode extends oLaneTool {
  async _tool_analyze_with_context(request: oRequest) {
    const { query } = request.params;

    // Search for relevant documents
    const searchResponse = await this.use(
      new oNodeAddress('o://search'),
      {
        method: 'vector',
        params: {
          query: query,
          limit: 5
        }
      }
    );

    if (!searchResponse.result.success) {
      throw new Error(`Search failed: ${searchResponse.result.error}`);
    }

    // Use context to generate analysis
    const analysis = this.analyzeWithContext(query, searchResponse.result.data);

    // Store analysis result
    await this.use(
      new oNodeAddress('o://storage'),
      {
        method: 'put',
        params: {
          key: `analysis:${Date.now()}`,
          value: JSON.stringify(analysis)
        }
      }
    );

    return analysis;
  }
}
```

### Use Case 3: Secure API Key Management

```typescript
class IntegrationNode extends oLaneTool {
  async _tool_store_api_key(request: oRequest) {
    const { service, apiKey } = request.params;

    // Encrypt API key
    const encrypted = await this.use(
      new oNodeAddress('o://encryption'),
      { method: 'encrypt', params: { value: apiKey } }
    );

    if (!encrypted.result.success) {
      throw new Error(`Encryption failed: ${encrypted.result.error}`);
    }

    // Store encrypted key
    await this.use(
      new oNodeAddress('o://storage'),
      {
        method: 'put',
        params: {
          key: `api-keys:${service}`,
          value: encrypted.result.data.value
        }
      }
    );

    return { stored: true };
  }

  private async getApiKey(service: string): Promise<string> {
    // Retrieve encrypted key
    const stored = await this.use(
      new oNodeAddress('o://storage'),
      { method: 'get', params: { key: `api-keys:${service}` } }
    );

    if (!stored.result.success) {
      throw new Error(`Storage retrieval failed: ${stored.result.error}`);
    }

    // Decrypt and return
    const decrypted = await this.use(
      new oNodeAddress('o://encryption'),
      { method: 'decrypt', params: { value: stored.result.data.value } }
    );

    if (!decrypted.result.success) {
      throw new Error(`Decryption failed: ${decrypted.result.error}`);
    }

    return decrypted.result.data.value;
  }
}
```

## API Reference {#api-reference}

### `initCommonTools(oNode: oLaneTool): Promise<Tool[]>`

Initializes all common tools as child nodes of the provided parent node.

**Parameters:**
- `oNode` (oLaneTool, required): Parent node to attach common tools to

**Returns:**
- `Promise<Tool[]>`: Array of initialized tool instances

**Initialized tools (5 total):**
1. `StorageTool` - Persistent data storage (`o://storage`)
2. `OSConfigStorageTool` - OS-level configuration storage (`o://os-config-storage`)
3. `EncryptionTool` - AES-256-GCM encryption/decryption (`o://encryption`)
4. `SearchTool` - Network-wide vector search (`o://search`)
5. `oApprovalTool` - Human-in-the-loop approval system (`o://approval`)

**Example:**

```typescript
import { initCommonTools } from '@olane/o-tools-common';
import { oLaneTool } from '@olane/o-lane';

class MyNode extends oLaneTool {
  async hookStartFinished(): Promise<void> {
    const tools = await initCommonTools(this);
    // tools[0] = StorageTool
    // tools[1] = OSConfigStorageTool
    // tools[2] = EncryptionTool
    // tools[3] = SearchTool
    // tools[4] = oApprovalTool

    console.log(`Initialized ${tools.length} common tools`);
    await super.hookStartFinished();
  }
}
```

### `EncryptionTool`

Tool class for encryption/decryption operations.

**Constructor:**

```typescript
new EncryptionTool(config: oNodeToolConfig)
```

**Config:**
```typescript
{
  name: string,              // Tool name
  parent: oNodeAddress,      // Parent node address
  leader: LeaderClient       // Leader client instance
}
```

### `SearchTool`

Tool class for network search operations.

**Constructor:**

```typescript
new SearchTool(config: oNodeToolConfig)
```

**Config:**
```typescript
{
  name: string,              // Tool name
  parent: oNodeAddress,      // Parent node address
  leader: LeaderClient       // Leader client instance
}
```

## Configuration {#configuration}

### Environment Variables

```bash
# Encryption key (required for EncryptionTool)
VAULT_KEY=your-secret-encryption-key

# Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Best Practices

<Warning>
  **Never commit encryption keys to version control!** Always use environment variables or secure secret management.
</Warning>

1. **Generate strong keys**: Use `EncryptionService.generateSecretKey()` or crypto library
2. **Rotate keys periodically**: Update `VAULT_KEY` on a schedule
3. **Use different keys per environment**: Development, staging, and production should have unique keys
4. **Store keys securely**: Use secret managers like AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault

## Troubleshooting {#troubleshooting}

### Error: "Encryption failed"

**Cause**: `VAULT_KEY` environment variable not set or invalid.

**Solution:**
```bash
# Generate a new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
echo "VAULT_KEY=<generated-key>" >> .env
```

### Error: "Decryption failed"

**Cause**: Encrypted data was created with a different key than current `VAULT_KEY`.

**Solution:**
- Ensure you're using the same `VAULT_KEY` that was used for encryption
- If key was rotated, decrypt old data with old key and re-encrypt with new key

### Error: "Cannot find module 'o://vector-store'"

**Cause**: Search tool requires a vector store node but none is running.

**Solution:**
```typescript
// Option 1: Don't initialize search tool
const storageTools = [
  new StorageTool({ name: 'storage', parent: this.address, leader: this.leader }),
  new EncryptionTool({ name: 'encryption', parent: this.address, leader: this.leader })
];

// Option 2: Implement vector store node
// See @olane/o-storage documentation for vector store setup
```

### Warning: "Peer dependency not met"

**Cause**: Missing required Olane packages.

**Solution:**
```bash
# Install all peer dependencies
pnpm add @olane/o-core@latest @olane/o-config@latest \
  @olane/o-protocol@latest @olane/o-tool@latest \
  @olane/o-lane@latest @olane/o-leader@latest \
  @olane/o-storage@latest
```

## Performance Considerations {#performance}

### Encryption Overhead

- **Encryption time**: ~1-2ms per operation for typical strings
- **Recommendation**: Batch encrypt when possible, cache decrypted values if reused

### Search Performance

- Search performance depends on vector store implementation and dataset size
- **Recommendation**: Set appropriate `limit` parameters (default 10)

### Storage

- Storage performance varies by backend (memory, disk, database)
- See `@olane/o-storage` documentation for optimization tips

## Architecture {#architecture}

Common tools are implemented as **child nodes** of your main node:

```
┌─────────────────────────────────────────┐
│  Your Node (oLaneTool)                  │
│  o://your-node                          │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Child Nodes (Common Tools)        │ │
│  │                                   │ │
│  │  o://storage                      │ │
│  │  o://os-config-storage            │ │
│  │  o://encryption                   │ │
│  │  o://search                       │ │
│  │  o://approval                     │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**How it works:**

1. `initCommonTools()` creates tool instances
2. Each tool is started independently
3. Tools are added as child nodes via `addChildNode()`
4. Your node can call tools using `this.use(address, params)`
5. Other nodes in the network can also discover and use these tools

## Package Details {#package-details}

**Current Version**: 0.7.2

**Repository**: [github.com/olane-labs/olane](https://github.com/olane-labs/olane)

**License**: ISC

**Status**: ⚠️ Experimental - APIs subject to change

## Limitations {#limitations}

<Warning>
  This is an **experimental package**. Expect breaking changes in future versions.
</Warning>

- **Encryption**: Uses single key for all data (no key rotation support yet)
- **Search**: Requires separate vector store implementation
- **Storage**: Limited to capabilities of `@olane/o-storage`
- **No selective exports**: All tools initialized together or manually

## Roadmap {#roadmap}

Planned improvements:

- [ ] Key rotation support for encryption
- [ ] Built-in vector store implementation
- [ ] Caching layer for frequently decrypted values
- [ ] Compression for encrypted data
- [ ] Batch operations for encryption
- [ ] More granular tool configuration
- [ ] Additional common tools (logging, monitoring, etc.)

## Related Resources {#related}

- **Package**: [o-tool Documentation](/packages/o-tool) - Base tool interface
- **Package**: [o-lane Documentation](/packages/o-lane) - Autonomous nodes
- **Package**: [o-storage Documentation](/packages/o-storage) - Storage capabilities
- **Package**: [o-leader Documentation](/packages/o-leader) - Service discovery
- **Concept**: [Tools vs Nodes](/docs/concepts/tools-nodes-applications) - Architecture patterns
- **Guide**: [Building Tool Nodes](/guides/building-nodes) - Node development

## Examples {#examples}

See complete examples in the [examples directory](/examples):

- **Secure Node**: Node with encrypted credential storage
- **Search Node**: Document search and retrieval
- **Hybrid Node**: Combined search, storage, and encryption

## Contributing

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/olane-labs/olane/issues).

## License

ISC © oLane Inc.

