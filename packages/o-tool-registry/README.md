# @olane/o-tool-registry

> ⚠️ **Deprecation Notice**: This package is being phased out. Tools should now be referenced and installed independently.

A collection of pre-built tools for Olane OS including OAuth authentication, text embeddings, NER (Named Entity Recognition), and vector storage.

[![npm version](https://img.shields.io/npm/v/@olane/o-tool-registry.svg)](https://www.npmjs.com/package/@olane/o-tool-registry)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Overview {#overview}

This package was originally designed as a convenient registry for commonly-used tools in Olane OS. However, we're transitioning to a model where **each tool can be referenced and installed independently** for better modularity and maintenance.

**Current Status**: 
- ✅ **Still functional** - All tools work as documented
- 🔄 **Being replaced** - Individual tool packages coming soon
- 📦 **Legacy support** - Will be maintained until migration is complete

## Migration Path {#migration}

If you're using `o-tool-registry`, you should plan to migrate to individual tool packages:

| Current Import | Future Package (Coming Soon) |
|---------------|------------------------------|
| `OAuthTool` | `@olane/o-tool-oauth` |
| `TextEmbeddingsTool` | `@olane/o-tool-embeddings` |
| `HuggingfaceTextEmbeddingsTool` | `@olane/o-tool-embeddings-hf` |
| `NERTool` | `@olane/o-tool-ner` |
| `VectorMemoryStorageTool` | `@olane/o-tool-vector-store` |
| `LangchainMemoryVectorStoreTool` | `@olane/o-tool-vector-store-langchain` |

> **Timeline**: Individual packages will be released in version 0.8.0. This package will be deprecated in version 1.0.0.

## Installation {#installation}

```bash
npm install @olane/o-tool-registry
```

**Peer Dependencies** (automatically installed):
```bash
npm install @olane/o-core @olane/o-tool @olane/o-lane @olane/o-intelligence @olane/o-mcp
```

## Quick Start {#quick-start}

### Using the Full Registry

Initialize all tools as child nodes of a parent node:

```typescript
import { oLaneTool } from '@olane/o-lane';
import { initRegistryTools } from '@olane/o-tool-registry';
import { oAddress } from '@olane/o-core';

// Create a parent node
const parentNode = new oLaneTool({
  name: 'my-application',
  address: new oAddress('o://my-app')
});

await parentNode.start();

// Initialize all registry tools as children
await initRegistryTools(parentNode);

// Now tools are available at:
// - o://my-app/ner
// - o://my-app/intelligence
// - o://my-app/embeddings-text
// - o://my-app/vector-store
// - o://my-app/mcp
```

### Using Individual Tools

Import and use specific tools independently:

```typescript
import { OAuthTool } from '@olane/o-tool-registry';
import { oAddress } from '@olane/o-core';

const oauthTool = new OAuthTool({
  name: 'oauth',
  address: new oAddress('o://auth/oauth')
});

await oauthTool.start();
```

## Available Tools {#tools}

### 1. OAuth Authentication Tool {#oauth-tool}

Generic OAuth 2.0 client for custom provider services with PKCE support.

**Address**: `o://oauth`

#### Features

- 🔐 **OAuth 2.0 Flow** - Full authorization code flow with PKCE
- 🔄 **Token Refresh** - Automatic token refresh handling
- 🔍 **Multi-Provider** - Support for multiple OAuth services
- 💾 **Token Storage** - Built-in token management

#### Quick Example

```typescript
import { OAuthTool } from '@olane/o-tool-registry';

const oauth = new OAuthTool({
  name: 'oauth',
  parent: myNode.address
});
await oauth.start();

// Configure OAuth provider
await oauth.use({
  method: 'configure',
  params: {
    serviceName: 'github',
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    redirectUri: 'http://localhost:3000/callback',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email'
  }
});

// Get authorization URL
const authUrl = await oauth.use({
  method: 'getAuthorizationUrl',
  params: {
    serviceName: 'github',
    state: 'random_state_string'
  }
});

console.log(authUrl.authorizationUrl);
// https://github.com/login/oauth/authorize?client_id=...
```

#### Available Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| **configure** | Configure OAuth provider | `serviceName`, `clientId`, `clientSecret`, `redirectUri`, `authorizationUrl`, `tokenUrl`, `userInfoUrl`, `scope` |
| **getAuthorizationUrl** | Generate authorization URL | `serviceName`, `state?`, `scope?` |
| **exchangeCode** | Exchange auth code for tokens | `serviceName`, `code`, `state?` |
| **refreshToken** | Refresh access token | `serviceName`, `refreshToken` |
| **getUserInfo** | Get user information | `serviceName`, `accessToken` |
| **validateToken** | Validate access token | `serviceName`, `accessToken` |
| **revokeToken** | Revoke access/refresh token | `serviceName`, `token`, `tokenType?` |
| **listServices** | List configured services | None |
| **getStoredTokens** | Get stored tokens | `serviceName?` |
| **clearTokens** | Clear stored tokens | `serviceName?` |

#### Complete OAuth Flow Example

```typescript
// Step 1: Configure provider
await oauth.use({
  method: 'configure',
  params: {
    serviceName: 'google',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/auth/callback',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid profile email'
  }
});

// Step 2: Get authorization URL
const { authorizationUrl } = await oauth.use({
  method: 'getAuthorizationUrl',
  params: {
    serviceName: 'google',
    state: crypto.randomUUID()
  }
});

// User visits authorizationUrl and is redirected back with code

// Step 3: Exchange code for tokens
const { tokens } = await oauth.use({
  method: 'exchangeCode',
  params: {
    serviceName: 'google',
    code: 'authorization_code_from_callback'
  }
});

console.log(tokens.access_token); // Use for API calls

// Step 4: Get user info
const { userInfo } = await oauth.use({
  method: 'getUserInfo',
  params: {
    serviceName: 'google',
    accessToken: tokens.access_token
  }
});

console.log(userInfo); // { email: "...", name: "...", ... }
```

#### Token Management

```typescript
// Check stored tokens
const { tokens } = await oauth.use({
  method: 'getStoredTokens',
  params: { serviceName: 'google' }
});

// Refresh expired token
if (tokens.expires_in < 300) { // Less than 5 minutes left
  const refreshed = await oauth.use({
    method: 'refreshToken',
    params: {
      serviceName: 'google',
      refreshToken: tokens.refresh_token
    }
  });
  console.log(refreshed.tokens.access_token);
}

// Clear tokens on logout
await oauth.use({
  method: 'clearTokens',
  params: { serviceName: 'google' }
});
```

---

### 2. Text Embeddings Tools {#embeddings}

Generate vector embeddings from text for semantic search and similarity operations.

**Address**: `o://embeddings-text`

#### Base Class: TextEmbeddingsTool

Abstract base class for text embedding implementations.

```typescript
import { TextEmbeddingsTool } from '@olane/o-tool-registry';

abstract class TextEmbeddingsTool extends oLaneTool {
  abstract _tool_embed_documents(request: oRequest): Promise<number[][]>;
  abstract _tool_embed_query(request: oRequest): Promise<number[]>;
}
```

#### Implementation: HuggingfaceTextEmbeddingsTool

Uses Hugging Face's `all-MiniLM-L6-v2` model for fast, local embeddings.

**Features**:
- 🚀 **Fast** - Optimized transformer model
- 🏠 **Local** - Runs entirely offline
- 📦 **384 dimensions** - Compact vector size
- 🎯 **Multi-lingual** - Supports 100+ languages

**Example**:

```typescript
import { HuggingfaceTextEmbeddingsTool } from '@olane/o-tool-registry';

const embeddings = new HuggingfaceTextEmbeddingsTool({
  name: 'embeddings-text',
  parent: myNode.address
});
await embeddings.start();

// Embed multiple documents
const docEmbeddings = await embeddings.use({
  method: 'embed_documents',
  params: {
    documents: [
      'Olane OS is a distributed operating system',
      'Tools are executable methods on nodes',
      'Vector embeddings enable semantic search'
    ]
  }
});

console.log(docEmbeddings.result); // [[0.1, -0.2, ...], [...], [...]]

// Embed a search query
const queryEmbedding = await embeddings.use({
  method: 'embed_query',
  params: {
    query: 'What is Olane OS?'
  }
});

console.log(queryEmbedding.result); // [0.05, -0.15, ...]
```

#### Available Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| **embed_documents** | Embed multiple documents | `documents: string[]` | `number[][]` |
| **embed_query** | Embed single query | `query: string` | `number[]` |

---

### 3. Named Entity Recognition (NER) Tool {#ner}

Extract named entities (people, organizations, locations, etc.) from text.

**Address**: `o://ner`

#### Example

```typescript
import { NERTool } from '@olane/o-tool-registry';

const ner = new NERTool({
  name: 'ner',
  parent: myNode.address,
  leader: leaderAddress
});
await ner.start();

// Extract entities
const result = await ner.use({
  method: 'extract',
  params: {
    text: 'Apple Inc. was founded by Steve Jobs in Cupertino, California on April 1, 1976.'
  }
});

console.log(result);
// {
//   entities: [
//     { text: 'Apple Inc.', type: 'ORGANIZATION' },
//     { text: 'Steve Jobs', type: 'PERSON' },
//     { text: 'Cupertino', type: 'LOCATION' },
//     { text: 'California', type: 'LOCATION' },
//     { text: 'April 1, 1976', type: 'DATE' }
//   ]
// }
```

#### Available Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| **extract** | Extract named entities | `text: string` | Entity list with types |

> **Note**: Uses `o-intelligence` for entity extraction via LLM prompting.

---

### 4. Vector Storage Tools {#vector-store}

Store and search document embeddings for semantic similarity search.

**Address**: `o://vector-store`

#### Base Class: VectorMemoryStorageTool

Abstract base class for vector store implementations.

```typescript
abstract class VectorMemoryStorageTool extends oLaneTool {
  abstract _tool_search_similar(request: oRequest): Promise<ToolResult>;
  abstract _tool_add_documents(request: oRequest): Promise<ToolResult>;
  abstract _tool_delete_documents(request: oRequest): Promise<ToolResult>;
  abstract _tool_update_documents(request: oRequest): Promise<ToolResult>;
}
```

#### Implementation: LangchainMemoryVectorStoreTool

In-memory vector store using LangChain.

**Features**:
- 💾 **In-Memory** - Fast, no external database
- 🔍 **Semantic Search** - Find similar documents
- 🔗 **Integrated** - Uses `o://embeddings-text` automatically
- 📄 **Document Metadata** - Store and retrieve metadata

**Example**:

```typescript
import { LangchainMemoryVectorStoreTool } from '@olane/o-tool-registry';

const vectorStore = new LangchainMemoryVectorStoreTool({
  name: 'vector-store',
  parent: myNode.address,
  leader: leaderAddress
});
await vectorStore.start();

// Add documents
await vectorStore.use({
  method: 'add_documents',
  params: {
    documents: [
      {
        pageContent: 'Olane OS is a distributed operating system for AI agents',
        metadata: { source: 'docs', page: 1 }
      },
      {
        pageContent: 'Tools are executable methods that agents can call',
        metadata: { source: 'docs', page: 2 }
      },
      {
        pageContent: 'Nodes are processes running on Olane OS',
        metadata: { source: 'docs', page: 3 }
      }
    ]
  }
});

// Search for similar documents
const results = await vectorStore.use({
  method: 'search_similar',
  params: {
    query: 'What are agents?',
    limit: 2
  }
});

console.log(results);
// [
//   {
//     pageContent: 'Olane OS is a distributed operating system for AI agents',
//     metadata: { source: 'docs', page: 1 }
//   },
//   {
//     pageContent: 'Tools are executable methods that agents can call',
//     metadata: { source: 'docs', page: 2 }
//   }
// ]
```

#### Available Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| **add_documents** | Add documents to store | `documents: Array<{pageContent: string, metadata?: any}>` | Document IDs |
| **search_similar** | Find similar documents | `query: string, limit?: number` | Document array |
| **delete_documents** | Remove documents | `ids: string[]` | ❌ Not implemented |
| **update_documents** | Update documents | `id: string, document: Document` | ❌ Not implemented |

> **Note**: Delete and update methods will be implemented in individual tool packages.

---

## Usage Patterns {#usage-patterns}

### Pattern 1: Full Registry Initialization

Best for quick prototypes and all-in-one applications.

```typescript
import { oLaneTool } from '@olane/o-lane';
import { initRegistryTools } from '@olane/o-tool-registry';

const app = new oLaneTool({
  name: 'my-app',
  address: new oAddress('o://app')
});

await app.start();
await initRegistryTools(app);

// All tools available as children:
// - o://app/ner
// - o://app/intelligence  
// - o://app/embeddings-text
// - o://app/vector-store
// - o://app/mcp
```

**Initialized Tools**:
- `NERTool` at `o://parent/ner`
- `IntelligenceTool` at `o://parent/intelligence`
- `HuggingfaceTextEmbeddingsTool` at `o://parent/embeddings-text`
- `LangchainMemoryVectorStoreTool` at `o://parent/vector-store`
- `McpBridgeTool` at `o://parent/mcp`

---

### Pattern 2: Selective Tool Import

Best for production - only import what you need.

```typescript
import { OAuthTool, HuggingfaceTextEmbeddingsTool } from '@olane/o-tool-registry';

// Only use OAuth and embeddings
const oauth = new OAuthTool({ name: 'oauth', parent: app.address });
const embeddings = new HuggingfaceTextEmbeddingsTool({ 
  name: 'embeddings', 
  parent: app.address 
});

await Promise.all([oauth.start(), embeddings.start()]);
```

---

### Pattern 3: Custom Tool Extension

Extend base classes for custom implementations.

```typescript
import { TextEmbeddingsTool } from '@olane/o-tool-registry';
import { oRequest } from '@olane/o-core';

class OpenAIEmbeddingsTool extends TextEmbeddingsTool {
  private apiKey: string;

  constructor(config) {
    super(config);
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async _tool_embed_documents(request: oRequest): Promise<number[][]> {
    const { documents } = request.params;
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: documents
      })
    });

    const data = await response.json();
    return data.data.map(item => item.embedding);
  }

  async _tool_embed_query(request: oRequest): Promise<number[]> {
    const embeddings = await this._tool_embed_documents({
      ...request,
      params: { documents: [request.params.query] }
    });
    return embeddings[0];
  }
}
```

---

## Complete Example: RAG Application {#rag-example}

Build a Retrieval-Augmented Generation system using the tool registry.

```typescript
import { oLaneTool } from '@olane/o-lane';
import { 
  HuggingfaceTextEmbeddingsTool,
  LangchainMemoryVectorStoreTool,
  initRegistryTools
} from '@olane/o-tool-registry';
import { oAddress } from '@olane/o-core';

// Create RAG application node
class RAGApplication extends oLaneTool {
  constructor() {
    super({
      name: 'rag-app',
      address: new oAddress('o://rag')
    });
  }

  async initialize() {
    await super.initialize();
    
    // Initialize all registry tools
    await initRegistryTools(this);
    
    // Load documents into vector store
    await this.loadDocuments();
  }

  async loadDocuments() {
    const documents = [
      {
        pageContent: 'Olane OS is a distributed operating system designed for AI agents.',
        metadata: { source: 'intro.md', section: 'overview' }
      },
      {
        pageContent: 'Tools are executable methods on nodes that agents can invoke.',
        metadata: { source: 'concepts.md', section: 'tools' }
      },
      {
        pageContent: 'Nodes are processes running on Olane OS with unique o:// addresses.',
        metadata: { source: 'concepts.md', section: 'nodes' }
      }
    ];

    await this.use(new oAddress('o://rag/vector-store'), {
      method: 'add_documents',
      params: { documents }
    });

    this.logger.info('Documents loaded into vector store');
  }

  async _tool_ask(request: oRequest) {
    const { question } = request.params;

    // Step 1: Search for relevant documents
    const searchResult = await this.use(
      new oAddress('o://rag/vector-store'),
      {
        method: 'search_similar',
        params: { query: question, limit: 3 }
      }
    );

    const context = searchResult.result
      .map(doc => doc.pageContent)
      .join('\n\n');

    // Step 2: Generate answer with context
    const answer = await this.use(
      new oAddress('o://rag/intelligence'),
      {
        method: 'prompt',
        params: {
          prompt: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based on the context above:`
        }
      }
    );

    return {
      question,
      answer: answer.result,
      sources: searchResult.result.map(doc => doc.metadata)
    };
  }
}

// Start the application
const rag = new RAGApplication();
await rag.start();

// Ask questions
const response = await rag.use({
  method: 'ask',
  params: {
    question: 'What are tools in Olane OS?'
  }
});

console.log(response);
// {
//   question: 'What are tools in Olane OS?',
//   answer: 'Tools are executable methods on nodes that agents can invoke...',
//   sources: [{ source: 'concepts.md', section: 'tools' }]
// }
```

---

## API Reference {#api}

### initRegistryTools(parentNode: oLaneTool)

Initialize all registry tools as child nodes of a parent.

**Parameters:**
- `parentNode` (oLaneTool, required): Parent node to attach tools to

**Returns:** `Promise<void>`

**Behavior:**
- Creates 5 child nodes (NER, Intelligence, Embeddings, Vector Store, MCP)
- Starts all tools automatically
- Registers tools with parent's hierarchy

**Example:**
```typescript
await initRegistryTools(myNode);
// Tools now available at:
// - o://my-node/ner
// - o://my-node/intelligence
// - o://my-node/embeddings-text
// - o://my-node/vector-store
// - o://my-node/mcp
```

---

## Architecture {#architecture}

### Tool Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  Parent Node (Your Application)                     │
│  o://my-app                                         │
└─────────────────────────────────────────────────────┘
                     ⬇ initRegistryTools()
        ┌────────────┼────────────┬──────────┐
        ⬇            ⬇            ⬇          ⬇
┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐
│ NER Tool     │ │ Embeddings│ │ Vector    │ │ Intelligence│
│ o://app/ner  │ │ o://app/  │ │ Store     │ │ o://app/   │
│              │ │ embeddings│ │ o://app/  │ │ intelligence│
└──────────────┘ └──────────┘ │ vector-   │ └────────────┘
                               │ store     │
                               └───────────┘
```

### Tool Dependencies

```
┌────────────────────────────────────────┐
│  LangchainMemoryVectorStoreTool        │
│  (stores documents)                    │
└────────────────────────────────────────┘
                ⬇ uses for embeddings
┌────────────────────────────────────────┐
│  HuggingfaceTextEmbeddingsTool         │
│  (generates vectors)                   │
└────────────────────────────────────────┘
```

```
┌────────────────────────────────────────┐
│  NERTool                               │
│  (extracts entities)                   │
└────────────────────────────────────────┘
                ⬇ uses for LLM
┌────────────────────────────────────────┐
│  IntelligenceTool                      │
│  (from @olane/o-intelligence)          │
└────────────────────────────────────────┘
```

---

## Troubleshooting {#troubleshooting}

### Error: "Cannot find module '@huggingface/transformers'"

**Cause**: Missing peer dependencies.

**Solution**: Install all peer dependencies:
```bash
npm install @huggingface/transformers @langchain/community @langchain/core langchain
```

---

### Error: "OAuth configuration not found for service: xyz"

**Cause**: Service not configured before use.

**Solution**: Configure the service first:
```typescript
await oauth.use({
  method: 'configure',
  params: {
    serviceName: 'xyz',
    clientId: '...',
    clientSecret: '...',
    // ... other config
  }
});
```

---

### Error: "No user info URL configured for service"

**Cause**: OAuth provider doesn't have `userInfoUrl` set.

**Solution**: Either configure it or pass it explicitly:
```typescript
// Option 1: Configure in setup
await oauth.use({
  method: 'configure',
  params: {
    serviceName: 'github',
    userInfoUrl: 'https://api.github.com/user',
    // ...
  }
});

// Option 2: Pass per-request
await oauth.use({
  method: 'getUserInfo',
  params: {
    serviceName: 'github',
    accessToken: '...',
    userInfoUrl: 'https://api.github.com/user'
  }
});
```

---

### Vector Store Returns Empty Results

**Cause**: Documents not added or embeddings not generated.

**Solution**: Ensure documents are added before searching:
```typescript
// First, add documents
await vectorStore.use({
  method: 'add_documents',
  params: {
    documents: [
      { pageContent: 'Some text', metadata: {} }
    ]
  }
});

// Then search
const results = await vectorStore.use({
  method: 'search_similar',
  params: { query: 'Some text', limit: 5 }
});
```

---

### Slow Embedding Generation

**Cause**: First run downloads Hugging Face model (~90MB).

**Solution**: Model is cached after first use. For production:
```typescript
// Pre-load during initialization
const embeddings = new HuggingfaceTextEmbeddingsTool({ ... });
await embeddings.start();

// First call downloads model (slow)
await embeddings.use({
  method: 'embed_query',
  params: { query: 'warmup' }
});

// Subsequent calls are fast
```

---

## Migration Guide {#migration-guide}

### From Bundled Registry to Individual Packages

When individual packages are released (version 0.8.0+), follow this guide:

#### Before (v0.7.x)

```typescript
import { 
  OAuthTool,
  HuggingfaceTextEmbeddingsTool,
  NERTool 
} from '@olane/o-tool-registry';
```

#### After (v0.8.0+)

```typescript
import { OAuthTool } from '@olane/o-tool-oauth';
import { HuggingfaceEmbeddingsTool } from '@olane/o-tool-embeddings-hf';
import { NERTool } from '@olane/o-tool-ner';
```

#### Update package.json

**Remove**:
```json
{
  "dependencies": {
    "@olane/o-tool-registry": "^0.7.2"
  }
}
```

**Replace with**:
```json
{
  "dependencies": {
    "@olane/o-tool-oauth": "^0.8.0",
    "@olane/o-tool-embeddings-hf": "^0.8.0",
    "@olane/o-tool-ner": "^0.8.0"
  }
}
```

#### No Code Changes Required

All tool APIs remain the same - only import paths change.

---

## Package Information {#package-info}

### Dependencies

**Core Olane Packages** (peer dependencies):
- `@olane/o-core` - Core primitives
- `@olane/o-tool` - Tool framework
- `@olane/o-lane` - Agent capability loop
- `@olane/o-intelligence` - LLM integration
- `@olane/o-mcp` - MCP bridge

**External Libraries**:
- `@huggingface/transformers` - Embedding models
- `@langchain/community` - LangChain integrations
- `@langchain/core` - LangChain core
- `langchain` - Vector store implementations

### Repository

**GitHub**: [olane-labs/olane](https://github.com/olane-labs/olane)  
**Package**: `packages/o-tool-registry`

### License

ISC License - see LICENSE file for details.

---

## Related Packages {#related}

| Package | Description | Documentation |
|---------|-------------|---------------|
| **[@olane/o-tool](/packages/o-tool)** | Base tool framework | Tool architecture |
| **[@olane/o-lane](/packages/o-lane)** | Agent capability loop | Complex nodes |
| **[@olane/o-intelligence](/packages/o-intelligence)** | LLM integration | AI capabilities |
| **[@olane/o-mcp](/packages/o-mcp)** | MCP protocol bridge | MCP integration |
| **[@olane/o-node](/packages/o-node)** | Node framework | Network tools |

---

## Support {#support}

- **Documentation**: [olane.dev](https://olane.dev)
- **Issues**: [GitHub Issues](https://github.com/olane-labs/olane/issues)
- **Discussions**: [GitHub Discussions](https://github.com/olane-labs/olane/discussions)

---

## Version History {#versions}

| Version | Status | Notes |
|---------|--------|-------|
| **0.7.2** | ✅ Current | Last bundled release |
| **0.8.0** | 🔜 Planned | Individual packages |
| **1.0.0** | 🔜 Future | Registry deprecated |

---

**Next Steps**:
- Read [Tool Concepts](/concepts/tools-nodes-applications) to understand tool architecture
- Learn about [Simple vs Complex Nodes](/concepts/tool-nodes/overview)
- Build your first [Tool Node](/guides/building-tool-nodes)
- Explore [Package Combinations](/packages/package-combinations)

