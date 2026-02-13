# o-storage

A unified storage application for Olane OS that provides multiple storage backends with a consistent interface.

**TL;DR**: Store, retrieve, and manage data across memory, disk, secure encrypted storage, and AI-powered placeholder storage using a simple key-value interface with `o://` addresses.

## Quick Start {#quick-start}

```bash
# Install
pnpm install @olane/o-storage
```

```typescript
// Basic usage with disk storage
import { StorageTool } from '@olane/o-storage';
import { oAddress } from '@olane/o-core';

// Initialize storage application
const storage = new StorageTool({
  parent: null,
  leader: leaderAddress
});
await storage.start();

// Store data
await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: {
    key: 'user-config',
    value: JSON.stringify({ theme: 'dark', lang: 'en' })
  }
});

// Retrieve data
const result = await leader.use(new oAddress('o://disk/user-config'));
console.log(result.result.data);
// { value: '{"theme":"dark","lang":"en"}' }
```

## Overview {#overview}

`o-storage` is a **Level 3 Application** (multiple coordinated nodes) that provides a unified storage layer for Olane OS. It includes five specialized storage providers, each optimized for different use cases.

### What it does

- **Stores data** with multiple backend options (memory, disk, encrypted, AI-powered)
- **Retrieves data** using `o://` addresses or explicit method calls
- **Manages data** with put, get, delete, and has operations
- **Intelligently summarizes** large documents with placeholder storage
- **Routes requests** automatically to the appropriate storage provider

### Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  StorageTool (Application)                                           │
│  o://storage                                                         │
│  • Routes requests to providers                                      │
└──────────────────────────────────────────────────────────────────────┘
                              ⬇ manages
    ┌─────────────┬─────────────┬─────────────┬──────────────┬─────────────┐
    ⬇             ⬇             ⬇             ⬇              ⬇             ⬇
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐
│ Memory   │ │ Disk     │ │ Secure   │ │ Placeholder │ │ OS Config   │
│ o://     │ │ o://disk │ │ o://     │ │ o://        │ │ o://        │
│ memory   │ │          │ │ secure   │ │ placeholder │ │ os-config   │
│ Fast     │ │ Persist  │ │ Encrypt  │ │ AI-Powered  │ │ OS Settings │
└──────────┘ └──────────┘ └──────────┘ └─────────────┘ └─────────────┘
```

Each child node uses a simple `o://` address (e.g., `new oAddress('o://disk')`) with `parent: this.address` set to `o://storage`. The system creates nested address paths during registration. See the [CLAUDE.md](../../CLAUDE.md) guide for details on address construction patterns.

## Storage Providers {#storage-providers}

### Memory Storage (`o://memory`) {#memory-storage}

Fast, volatile storage for temporary data.

**Best for**: Caching, session data, temporary computations

**Characteristics**:
- ⚡ Fastest performance
- 💾 Lost on restart
- 🔓 No encryption
- 🎯 Simple key-value storage

```typescript
// Store in memory
await leader.use(new oAddress('o://memory'), {
  method: 'put',
  params: {
    key: 'session-token',
    value: 'abc123xyz'
  }
});

// Retrieve from memory
const result = await leader.use(new oAddress('o://memory/session-token'));
console.log(result.result.data.value); // 'abc123xyz'

// Check if exists
const exists = await leader.use(new oAddress('o://memory'), {
  method: 'has',
  params: { key: 'session-token' }
});
console.log(exists.result.data); // true

// Delete from memory
await leader.use(new oAddress('o://memory'), {
  method: 'delete',
  params: { key: 'session-token' }
});
```

---

### Disk Storage (`o://disk`) {#disk-storage}

Persistent storage on the local filesystem.

**Best for**: Application state, configuration files, persistent data

**Characteristics**:
- 💾 Persists across restarts
- 📁 Stored in `~/.olane/storage/` by default
- 📝 JSON format with metadata
- 🔓 No encryption

```typescript
// Store on disk
await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: {
    key: 'app-settings',
    value: JSON.stringify({
      theme: 'dark',
      notifications: true,
      version: '1.0.0'
    })
  }
});

// Retrieve from disk
const result = await leader.use(new oAddress('o://disk/app-settings'));
const settings = JSON.parse(result.result.data.value);
console.log(settings);
// { theme: 'dark', notifications: true, version: '1.0.0' }

// Custom storage directory
const diskStorage = new DiskStorageProvider({
  name: 'custom-disk',
  leader: leaderAddress,
  storageDir: '/custom/path/to/storage'
});
```

---

### Secure Storage (`o://secure`) {#secure-storage}

Encrypted persistent storage using `o://encryption` service.

**Best for**: API keys, passwords, sensitive user data, credentials

**Characteristics**:
- 🔒 Encrypted at rest
- 💾 Persists across restarts
- 📁 Stored in `~/.olane/storage/`
- 🔐 Requires `o://encryption` node

```typescript
// Store encrypted data
await leader.use(new oAddress('o://secure'), {
  method: 'put',
  params: {
    key: 'api-credentials',
    value: JSON.stringify({
      apiKey: 'sk_live_xxxxxxxxxxxxx',
      apiSecret: 'secret_xxxxxxxxxxxxx'
    })
  }
});

// Retrieve and decrypt automatically
const result = await leader.use(new oAddress('o://secure/api-credentials'));
const credentials = JSON.parse(result.result.data.value);
console.log(credentials);
// { apiKey: 'sk_live_xxxxxxxxxxxxx', apiSecret: 'secret_xxxxxxxxxxxxx' }
```

**Note**: Secure storage requires the `o://encryption` node to be running. The encryption/decryption happens automatically during put/get operations.

---

### Placeholder Storage (`o://placeholder`) {#placeholder-storage}

AI-powered storage that summarizes large documents to save context window space.

**Best for**: Large files, documents, code files that need summarization

**Characteristics**:
- 🤖 AI-powered summarization
- 💡 Intent-aware summaries
- 📝 Returns summary + original
- 🎯 Reduces context window usage

```typescript
// Store large document with intent
const largeDocument = `
  [50,000 characters of code/documentation]
`;

const result = await leader.use(new oAddress('o://placeholder'), {
  method: 'put',
  params: {
    key: 'large-codebase',
    value: largeDocument,
    intent: 'Find all API endpoints and their authentication requirements'
  }
});

console.log(result.result.data);
// {
//   value: "[original 50,000 character document]",
//   intent: "Find all API endpoints...",
//   summary: "This is a Node.js Express application with 15 API endpoints...",
//   instructions: "To save on context window size, I have summarized...",
//   address: "o://placeholder/large-codebase"
// }

// Later, retrieve the original if needed
const original = await leader.use(
  new oAddress('o://placeholder/large-codebase')
);
```

**How it works**:

1. **Store with intent**: Provide optional `intent` parameter describing what you need from the document
2. **AI summarizes**: Uses `o://intelligence` to create an intent-aligned summary
3. **Returns both**: Get original value + summary + instructions
4. **Reference address**: Use address in agents without re-uploading large content

**Use Case Example**:

```typescript
// Agent needs to copy a large file
const fileContent = await fs.readFile('bigfile.txt', 'utf-8');

const stored = await leader.use(new oAddress('o://placeholder'), {
  method: 'put',
  params: {
    key: 'source-file',
    value: fileContent,
    intent: 'Copy this file to a new location with a different name'
  }
});

// Agent can now reference the summary instead of full content
// Summary: "This is a 50KB text file containing server configuration..."
// Agent knows it's a config file without loading all 50KB into context
```

## API Reference {#api-reference}

### Storage Operations {#storage-operations}

All storage providers support these four core operations:

#### `put` {#put}

Store data under a key.

**Parameters**:
- `key` (string, required): Unique identifier for the data
- `value` (string, required): Data to store (serialize objects as JSON)
- `intent` (string, optional): Only for placeholder storage - describes what you need from the data

**Returns**: 
```typescript
{
  success: boolean;
  error?: string; // Only present if success is false
}
```

**Example**:
```typescript
const result = await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: {
    key: 'user-123',
    value: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
  }
});
```

---

#### `get` {#get}

Retrieve data by key.

**Parameters**:
- `key` (string, required): Key to retrieve

**Returns**: 
```typescript
{
  value: string | null; // null if key doesn't exist
}
```

**Example**:
```typescript
// Method 1: Address with key
const result = await leader.use(new oAddress('o://disk/user-123'));
console.log(result.result.data.value);

// Method 2: Explicit get method
const result2 = await leader.use(new oAddress('o://disk'), {
  method: 'get',
  params: { key: 'user-123' }
});
console.log(result2.result.data.value);
```

---

#### `delete` {#delete}

Remove data by key.

**Parameters**:
- `key` (string, required): Key to delete

**Returns**: 
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example**:
```typescript
await leader.use(new oAddress('o://memory'), {
  method: 'delete',
  params: { key: 'temporary-data' }
});
```

---

#### `has` {#has}

Check if a key exists.

**Parameters**:
- `key` (string, required): Key to check

**Returns**:
```typescript
{
  exists: boolean; // true if key exists, false otherwise
}
```

**Example**:
```typescript
const result = await leader.use(new oAddress('o://disk'), {
  method: 'has',
  params: { key: 'user-123' }
});

if (result.result.data.exists) {
  console.log('Key exists!');
}
```

## Storage Provider Classes {#storage-provider-classes}

### `StorageTool` {#storagetool}

Main application class that manages all storage providers.

```typescript
import { StorageTool } from '@olane/o-storage';

const storage = new StorageTool({
  parent: parentAddress,
  leader: leaderAddress
});

await storage.start();
// Automatically initializes:
// - o://memory (MemoryStorageProvider)
// - o://disk (DiskStorageProvider)
// - o://secure (SecureStorageProvider)
// - o://placeholder (PlaceholderTool)
// - o://os-config (OSConfigStorageTool)
```

---

### `MemoryStorageProvider` {#memorystorageprovider}

In-memory storage provider.

```typescript
import { MemoryStorageProvider } from '@olane/o-storage';
import { oAddress } from '@olane/o-core';

const memory = new MemoryStorageProvider({
  name: 'custom-memory',
  leader: leaderAddress,
  address: new oAddress('o://custom-memory')
});

await memory.start();
```

---

### `DiskStorageProvider` {#diskstorageprovider}

Filesystem-based storage provider.

**Configuration**:
```typescript
interface DiskStorageConfig {
  name: string;
  leader: oAddress;
  address?: oAddress;
  storageDir?: string; // Default: ~/.olane/storage
}
```

**Example**:
```typescript
import { DiskStorageProvider } from '@olane/o-storage';

const disk = new DiskStorageProvider({
  name: 'my-disk',
  leader: leaderAddress,
  storageDir: '/path/to/custom/storage'
});

await disk.start();
```

**File Format**:
```json
{
  "value": "your-data-here",
  "timestamp": "2024-10-06T12:00:00.000Z",
  "key": "user-123"
}
```

---

### `SecureStorageProvider` {#securestorageprovider}

Encrypted disk storage provider (extends `DiskStorageProvider`).

**Requirements**:
- Requires `o://encryption` node to be running
- Uses same configuration as `DiskStorageProvider`

```typescript
import { SecureStorageProvider } from '@olane/o-storage';

const secure = new SecureStorageProvider({
  name: 'secure-vault',
  leader: leaderAddress,
  storageDir: '/secure/path'
});

await secure.start();
```

---

### `PlaceholderTool` {#placeholdertool}

AI-powered storage with summarization (extends `MemoryStorageProvider`).

**Requirements**:
- Requires `o://intelligence` node to be running
- Uses `o-lane` capability loop for AI processing

```typescript
import { PlaceholderTool } from '@olane/o-storage';

const placeholder = new PlaceholderTool({
  name: 'smart-storage',
  leader: leaderAddress
});

await placeholder.start();
```

### `OSConfigStorageTool` (`o://os-config`) {#osconfigstoragetool}

OS instance configuration storage that delegates to a configurable storage backend.

**Best for**: OS instance configuration, lane management, metadata tracking

**Characteristics**:
- Delegates to `o://disk` or `o://memory` (configurable)
- Manages OS instance configurations with key prefix `os-config:`
- Supports lane CID management for OS startup configuration
- Supports metadata storage per OS instance

**Configuration**:
```typescript
interface OSConfigStorageConfig {
  storageBackend?: 'disk' | 'memory' | string; // Default: 'disk'
}
```

Can also be configured via the `OS_CONFIG_STORAGE` environment variable.

**Methods:**

| Method | Parameters | Description |
|--------|-----------|-------------|
| `save_config` | `osName` (string), `config` (object) | Save OS instance configuration |
| `load_config` | `osName` (string) | Load OS instance configuration |
| `list_configs` | (none) | List all OS instance configurations |
| `delete_config` | `osName` (string) | Delete OS instance configuration |
| `add_lane_to_config` | `osName` (string), `cid` (string) | Add a lane CID to OS startup config |
| `remove_lane_from_config` | `osName` (string), `cid` (string) | Remove a lane CID from OS startup config |
| `get_lanes` | `osName` (string) | Get all lane CIDs for an OS instance |
| `update_metadata` | `osName` (string), `metadata` (object) | Update metadata for an OS instance |
| `get_metadata` | `osName` (string) | Get metadata for an OS instance |

**Example:**
```typescript
// Save OS configuration
await leader.use(new oAddress('o://os-config'), {
  method: 'save_config',
  params: {
    osName: 'my-os-instance',
    config: {
      oNetworkConfig: { lanes: [] },
      metadata: { createdAt: Date.now() }
    }
  }
});

// Add a lane to the OS instance
await leader.use(new oAddress('o://os-config'), {
  method: 'add_lane_to_config',
  params: {
    osName: 'my-os-instance',
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
  }
});

// Get lanes for an OS instance
const result = await leader.use(new oAddress('o://os-config'), {
  method: 'get_lanes',
  params: { osName: 'my-os-instance' }
});
console.log(result.result.data.lanes);

// Load configuration
const config = await leader.use(new oAddress('o://os-config'), {
  method: 'load_config',
  params: { osName: 'my-os-instance' }
});
console.log(config.result.data);
```

---

## Common Use Cases {#common-use-cases}

### Use Case 1: Configuration Management {#config-management}

Store and retrieve application configuration.

```typescript
// Store configuration
const config = {
  theme: 'dark',
  language: 'en',
  features: {
    betaFeatures: true,
    analytics: false
  }
};

await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: {
    key: 'app-config',
    value: JSON.stringify(config)
  }
});

// Retrieve configuration
const result = await leader.use(new oAddress('o://disk/app-config'));
const loadedConfig = JSON.parse(result.result.data.value);

// Update configuration
loadedConfig.theme = 'light';
await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: {
    key: 'app-config',
    value: JSON.stringify(loadedConfig)
  }
});
```

---

### Use Case 2: Secure Credential Storage {#secure-credentials}

Store API keys and sensitive data encrypted.

```typescript
// Store credentials securely
await leader.use(new oAddress('o://secure'), {
  method: 'put',
  params: {
    key: 'stripe-keys',
    value: JSON.stringify({
      publishableKey: 'pk_live_xxxx',
      secretKey: 'sk_live_xxxx',
      webhookSecret: 'whsec_xxxx'
    })
  }
});

// Retrieve when needed (auto-decrypted)
const result = await leader.use(new oAddress('o://secure/stripe-keys'));
const keys = JSON.parse(result.result.data.value);

// Use in your application
const stripe = new Stripe(keys.secretKey);
```

---

### Use Case 3: Caching with Memory Storage {#caching}

Fast temporary storage for computed values.

```typescript
// Check cache first
const cached = await leader.use(new oAddress('o://memory'), {
  method: 'has',
  params: { key: 'expensive-computation' }
});

if (cached.result.data.exists) {
  // Use cached value
  const result = await leader.use(
    new oAddress('o://memory/expensive-computation')
  );
  return JSON.parse(result.result.data.value);
} else {
  // Compute and cache
  const computed = performExpensiveComputation();
  await leader.use(new oAddress('o://memory'), {
    method: 'put',
    params: {
      key: 'expensive-computation',
      value: JSON.stringify(computed)
    }
  });
  return computed;
}
```

---

### Use Case 4: Large Document Processing {#large-documents}

Process large files with AI-powered summarization.

```typescript
// Read large codebase file
const sourceCode = await fs.readFile('src/app.ts', 'utf-8');
// Assume sourceCode is 100KB

// Store with intent
const response = await leader.use(new oAddress('o://placeholder'), {
  method: 'put',
  params: {
    key: 'source-app',
    value: sourceCode,
    intent: 'Refactor the authentication logic to use JWT tokens'
  }
});

const stored = response.result.data;
console.log(stored.summary);
// "This TypeScript application uses Express.js with session-based authentication.
// The authentication logic is in the AuthController class (lines 45-123).
// Current implementation uses cookies and express-session middleware..."

// Agent can now work with summary instead of full 100KB
// Only retrieve full content if absolutely necessary
```

---

### Use Case 5: Multi-Provider Data Management {#multi-provider}

Use different providers for different data types.

```typescript
class DataManager {
  constructor(private leader: oAddress) {}

  // Temporary data -> Memory
  async cacheSessionData(userId: string, data: any) {
    await this.leader.use(new oAddress('o://memory'), {
      method: 'put',
      params: {
        key: `session-${userId}`,
        value: JSON.stringify(data)
      }
    });
  }

  // User preferences -> Disk
  async saveUserPreferences(userId: string, prefs: any) {
    await this.leader.use(new oAddress('o://disk'), {
      method: 'put',
      params: {
        key: `prefs-${userId}`,
        value: JSON.stringify(prefs)
      }
    });
  }

  // Credentials -> Secure
  async saveUserCredentials(userId: string, credentials: any) {
    await this.leader.use(new oAddress('o://secure'), {
      method: 'put',
      params: {
        key: `creds-${userId}`,
        value: JSON.stringify(credentials)
      }
    });
  }

  // Large documents -> Placeholder
  async saveDocument(docId: string, content: string, intent: string) {
    return await this.leader.use(new oAddress('o://placeholder'), {
      method: 'put',
      params: {
        key: docId,
        value: content,
        intent
      }
    });
  }
}
```

## Integration Examples {#integration-examples}

### With o-node {#integration-o-node}

Use storage in a custom node.

```typescript
import { oNodeTool } from '@olane/o-node';
import { oAddress } from '@olane/o-core';

class MyCustomNode extends oNodeTool {
  async _tool_save_config(request: oRequest) {
    const { configData } = request.params;

    // Store configuration using disk storage
    const response = await this.use(new oAddress('o://disk'), {
      method: 'put',
      params: {
        key: 'my-node-config',
        value: JSON.stringify(configData)
      }
    });

    if (!response.result.success) {
      throw new Error(`Failed to save config: ${response.result.error}`);
    }

    // Return raw data - base class wraps it
    return { saved: true };
  }

  async _tool_load_config(request: oRequest) {
    // Retrieve configuration (response.result.data contains the storage value)
    const result = await this.use(new oAddress('o://disk/my-node-config'));

    if (!result.result.success) {
      throw new Error(`Failed to load config: ${result.result.error}`);
    }

    return JSON.parse(result.result.data.value);
  }
}
```

---

### With o-lane {#integration-o-lane}

Use storage in an intelligent node.

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

class IntelligentDataNode extends oLaneTool {
  async _tool_analyze_document(request: oRequest) {
    const { documentContent, analysisGoal } = request.params;

    // Store document with intent using placeholder
    const response = await this.use(new oAddress('o://placeholder'), {
      method: 'put',
      params: {
        key: `doc-${Date.now()}`,
        value: documentContent,
        intent: analysisGoal
      }
    });

    if (!response.result.success) {
      throw new Error(`Failed to store document: ${response.result.error}`);
    }

    const stored = response.result.data;

    // Return summary for further processing
    return {
      summary: stored.summary,
      address: stored.address,
      instructions: stored.instructions
    };
  }
}
```

---

### Standalone Usage {#standalone-usage}

Use storage providers independently.

```typescript
import { MemoryStorageProvider } from '@olane/o-storage';
import { oLeaderNode } from '@olane/o-leader';
import { oAddress } from '@olane/o-core';

// Setup
const leader = new oLeaderNode({
  parent: null,
  leader: null
});
await leader.start();

// Create standalone memory storage
const memory = new MemoryStorageProvider({
  name: 'cache',
  leader: leader.address
});
await memory.start();

// Use directly
await leader.use(new oAddress('o://memory'), {
  method: 'put',
  params: { key: 'test', value: 'data' }
});

const result = await leader.use(new oAddress('o://memory/test'));
console.log(result.result.data.value); // 'data'
```

## Response Structure {#response-structure}

When calling storage methods via `node.use()`, responses follow the standard Olane response pattern:

```typescript
const response = await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: { key: 'my-key', value: 'my-value' }
});

// Always access data via response.result
if (response.result.success) {
  const data = response.result.data;
  console.log(data);  // { success: true } for put operations
} else {
  console.error(response.result.error);
}

// For get operations:
const getResponse = await leader.use(new oAddress('o://disk/my-key'));
if (getResponse.result.success) {
  console.log(getResponse.result.data.value);  // 'my-value'
}

// Full response shape:
// {
//   jsonrpc: "2.0",
//   id: "request-id",
//   result: {
//     success: boolean,
//     data: any,          // Present on success
//     error?: string      // Present on failure
//   }
// }
```

> **Important**: Always check `response.result.success` before accessing `response.result.data`. Do not access `response.success` or `response.data` directly -- these properties do not exist at the top level of the response object.

## Troubleshooting {#troubleshooting}

### Error: "Failed to store data: EACCES: permission denied" {#error-eacces}

**Problem**: Disk storage can't write to storage directory.

**Solution**:
```bash
# Check permissions on default storage directory
ls -la ~/.olane/

# Fix permissions
chmod 755 ~/.olane
chmod 755 ~/.olane/storage

# Or specify custom directory with write permissions
const disk = new DiskStorageProvider({
  name: 'disk',
  leader: leaderAddress,
  storageDir: '/path/with/write/permissions'
});
```

---

### Error: "Cannot find node with address o://encryption" {#error-no-encryption}

**Problem**: Secure storage requires `o://encryption` node.

**Solution**:
```typescript
// Ensure encryption node is running before using secure storage
import { EncryptionTool } from '@olane/o-encryption';

const encryption = new EncryptionTool({
  parent: leaderAddress,
  leader: leaderAddress
});
await encryption.start();

// Now secure storage will work
const result = await leader.use(new oAddress('o://secure'), {
  method: 'put',
  params: { key: 'secret', value: 'data' }
});
```

---

### Error: "Cannot find node with address o://intelligence" {#error-no-intelligence}

**Problem**: Placeholder storage requires `o://intelligence` node.

**Solution**:
```typescript
// Ensure intelligence node is running before using placeholder storage
import { IntelligenceTool } from '@olane/o-intelligence';

const intelligence = new IntelligenceTool({
  parent: leaderAddress,
  leader: leaderAddress
});
await intelligence.start();

// Now placeholder storage will work
const result = await leader.use(new oAddress('o://placeholder'), {
  method: 'put',
  params: {
    key: 'doc',
    value: largeDocument,
    intent: 'Summarize key points'
  }
});
```

---

### Issue: Memory storage data lost on restart {#memory-data-lost}

**Problem**: Data stored in memory storage disappears after restart.

**Solution**: This is expected behavior. Memory storage is volatile.

```typescript
// For persistent data, use disk storage instead
await leader.use(new oAddress('o://disk'), {
  method: 'put',
  params: { key: 'persistent-data', value: data }
});

// Or implement your own persistence pattern
class PersistentCache {
  async set(key: string, value: string) {
    // Store in memory for speed
    await leader.use(new oAddress('o://memory'), {
      method: 'put',
      params: { key, value }
    });
    
    // Also persist to disk
    await leader.use(new oAddress('o://disk'), {
      method: 'put',
      params: { key: `cache-${key}`, value }
    });
  }
  
  async get(key: string) {
    // Try memory first
    const memResult = await leader.use(new oAddress('o://memory'), {
      method: 'has',
      params: { key }
    });
    
    if (memResult.result.data.exists) {
      return await leader.use(new oAddress('o://memory/') + key);
    }
    
    // Fall back to disk
    return await leader.use(new oAddress('o://disk/cache-') + key);
  }
}
```

---

### Issue: Placeholder storage using too many tokens {#placeholder-tokens}

**Problem**: AI summarization costs too many tokens for large documents.

**Solution**: Documents are truncated to 50,000 characters automatically.

```typescript
// For very large documents, pre-process them
const largeDoc = await fs.readFile('huge-file.txt', 'utf-8');

if (largeDoc.length > 50000) {
  // Option 1: Store relevant section only
  const relevantSection = extractRelevantSection(largeDoc);
  await leader.use(new oAddress('o://placeholder'), {
    method: 'put',
    params: {
      key: 'doc-section',
      value: relevantSection,
      intent: 'Find API endpoints'
    }
  });
  
  // Option 2: Use regular disk storage for full content
  await leader.use(new oAddress('o://disk'), {
    method: 'put',
    params: {
      key: 'full-doc',
      value: largeDoc
    }
  });
  
  // Store summary separately
  const summary = manualSummary(largeDoc);
  await leader.use(new oAddress('o://memory'), {
    method: 'put',
    params: {
      key: 'doc-summary',
      value: summary
    }
  });
}
```

## Package Information {#package-info}

**Package Name**: `@olane/o-storage`  
**Version**: 0.7.2  
**License**: ISC  
**Repository**: [github.com/olane-labs/olane](https://github.com/olane-labs/olane)

### Dependencies {#dependencies}

**Peer Dependencies** (required):
- `@olane/o-core` - Core types and utilities
- `@olane/o-protocol` - Protocol definitions
- `@olane/o-tool` - Tool base classes
- `@olane/o-node` - Node functionality
- `@olane/o-lane` - Intelligence capabilities
- `@olane/o-config` - Configuration management

**Optional Runtime Dependencies**:
- `@olane/o-encryption` - Required for `SecureStorageProvider`
- `@olane/o-intelligence` - Required for `PlaceholderTool`

### Installation {#installation}

```bash
# Install storage package
pnpm add @olane/o-storage

# Install peer dependencies
pnpm add @olane/o-core @olane/o-protocol @olane/o-tool @olane/o-node @olane/o-lane @olane/o-config

# Optional: For secure storage
pnpm add @olane/o-encryption

# Optional: For placeholder storage
pnpm add @olane/o-intelligence
```

## Related {#related}

- **Package**: [o-core](/packages/o-core) - Core addressing and request types
- **Package**: [o-node](/packages/o-node) - Node creation and management
- **Package**: [o-lane](/packages/o-lane) - Intelligence and capability loops
- **Package**: [o-leader](/packages/o-leader) - Service discovery and coordination
- **Package**: [o-intelligence](/packages/o-intelligence) - AI integration for placeholder storage
- **Concept**: [Tools, Nodes, and Applications](/concepts/tools-nodes-applications) - Understanding architectural levels
- **Guide**: [Building Applications](/concepts/applications) - Multi-node coordination patterns

