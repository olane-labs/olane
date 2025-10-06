# @olane/o-mcp

Bridge Model Context Protocol (MCP) servers into Olane OS tool nodes.

## TL;DR {#tldr}

`o-mcp` connects MCP servers to Olane networks as discoverable tool nodes, enabling agents (human or AI) to use MCP capabilities through natural language intents.

```typescript
import { McpBridgeTool } from '@olane/o-mcp';
import { oAddress } from '@olane/o-core';

// Create MCP bridge node
const mcpBridge = new McpBridgeTool({
  address: new oAddress('o://mcp-bridge')
});

await mcpBridge.start();

// Add remote MCP server
await mcpBridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://mcp.example.com',
    name: 'github_mcp',
    description: 'GitHub integration via MCP'
  }
});

// Now agents can discover and use GitHub tools
// The MCP server becomes: o://github_mcp
```

---

## What is o-mcp? {#what-is-o-mcp}

**o-mcp** is a bridge package that connects [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers to Olane OS networks. It transforms MCP servers into Olane **tool nodes**, making them discoverable and usable by agents through natural language.

### Key Capabilities

- **Add MCP Servers**: Connect remote (HTTP) or local (stdio) MCP servers
- **Automatic Discovery**: MCP tools become searchable in the network registry
- **Intent Wrapping**: Adds Olane intent metadata to all MCP requests
- **Agent-Agnostic**: Human and AI agents use the same interface
- **Search Integration**: Find and validate MCP servers using AI search

### Why Use o-mcp?

<CardGroup cols={2}>
  <Card title="Unified Interface" icon="plug" color="#0D9373">
    Use MCP servers alongside native Olane tools through the same `o://` addressing
  </Card>
  <Card title="Network Discovery" icon="magnifying-glass" color="#0D9373">
    MCP tools indexed in vector store for semantic search
  </Card>
  <Card title="Intent Preservation" icon="brain" color="#0D9373">
    Maintains execution context across MCP boundaries
  </Card>
  <Card title="Instant Integration" icon="rocket" color="#0D9373">
    Add existing MCP servers without code changes
  </Card>
</CardGroup>

---

## Quick Start {#quick-start}

### Installation

```bash
npm install @olane/o-mcp
```

### Basic Usage

```typescript
import { McpBridgeTool } from '@olane/o-mcp';
import { oAddress } from '@olane/o-core';

// 1. Create MCP bridge
const bridge = new McpBridgeTool({
  address: new oAddress('o://mcp-bridge')
});

await bridge.start();

// 2. Add a remote MCP server
await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://api.example.com/mcp',
    name: 'example_mcp',
    description: 'Example MCP server'
  }
});

// 3. Use the MCP tools
const result = await bridge.use(new oAddress('o://example_mcp'), {
  method: 'some_mcp_tool',
  params: { input: 'data' }
});
```

---

## How It Works {#how-it-works}

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Agent (Human or AI)                                    │
│  Sends intent or direct tool call                       │
└─────────────────────────────────────────────────────────┘
                        ⬇
┌─────────────────────────────────────────────────────────┐
│  McpBridgeTool (o://mcp-bridge)                         │
│  • Discovers MCP servers                                │
│  • Adds servers to network                              │
│  • Manages MCP connections                              │
└─────────────────────────────────────────────────────────┘
                        ⬇ creates
┌─────────────────────────────────────────────────────────┐
│  McpTool (o://server_name)                              │
│  • Wraps individual MCP server                          │
│  • Exposes MCP tools as Olane tools                     │
│  • Adds intent metadata to requests                     │
└─────────────────────────────────────────────────────────┘
                        ⬇ connects to
┌─────────────────────────────────────────────────────────┐
│  External MCP Server                                    │
│  • Standard MCP implementation                          │
│  • Unmodified third-party server                        │
└─────────────────────────────────────────────────────────┘
```

### The Bridge Process

1. **Discovery**: Agent searches for or adds MCP server URL
2. **Connection**: Bridge connects to MCP server (HTTP or stdio)
3. **Tool Extraction**: Bridge reads MCP server's tool list
4. **Wrapping**: Each MCP tool becomes an Olane tool method (`_tool_*`)
5. **Registration**: New tool node registered with network leader
6. **Indexing**: Tools indexed in vector store for discovery
7. **Usage**: Agents can now discover and use MCP tools via `o://` addresses

---

## API Reference {#api-reference}

### McpBridgeTool {#mcpbridgetool}

Complex node (uses `o-lane`) that discovers and adds MCP servers to the network.

#### Constructor

```typescript
new McpBridgeTool(config: oNodeConfig)
```

**Parameters:**
- `config` (oNodeConfig): Node configuration
  - `address` (oAddress, optional): Bridge address (default: `o://mcp`)
  - `leader` (oAddress, optional): Leader node address
  - `...rest`: Standard oNodeConfig options

**Example:**
```typescript
import { McpBridgeTool } from '@olane/o-mcp';
import { oAddress } from '@olane/o-core';

const bridge = new McpBridgeTool({
  address: new oAddress('o://mcp-bridge'),
  leader: new oAddress('o://leader')
});
```

---

#### Tool: add_remote_server {#tool-add-remote-server}

Add a remote MCP server hosted over HTTP/SSE.

**Parameters:**
- `mcpServerUrl` (string, required): URL of the MCP server
- `name` (string, required): Name for the tool node (lowercase snake_case)
- `description` (string, optional): Human-readable description
- `headers` (object, optional): HTTP headers (e.g., authorization)

**Returns:**
- `message` (string): Success message with tool count

**Example:**
```typescript
// Add GitHub MCP server with authentication
await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://github-mcp.example.com',
    name: 'github',
    description: 'GitHub repository management',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
});

// Server now available at o://github
```

---

#### Tool: add_local_server {#tool-add-local-server}

Add a local MCP server that runs as a child process via stdio.

**Parameters:**
- `command` (string, required): Command to execute
- `args` (string[], required): Command arguments
- `name` (string, required): Name for the tool node

**Returns:**
- `message` (string): Success message
- `_save` (boolean): Indicates configuration should be saved

**Example:**
```typescript
// Add local MCP server (e.g., filesystem MCP)
await bridge.use({
  method: 'add_local_server',
  params: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/files'],
    name: 'filesystem'
  }
});

// Server now available at o://filesystem
```

---

#### Tool: search {#tool-search}

Search for MCP servers using AI-powered search.

**Parameters:**
- `name` (string, optional): MCP server name
- `provider` (string, optional): Provider/creator name
- `functionality` (string, optional): Description of functionality

**Returns:**
- `result` (string): Search results with connection information

**Example:**
```typescript
// Search for Slack MCP server
const result = await bridge.use({
  method: 'search',
  params: {
    provider: 'Slack',
    functionality: 'Send messages and manage channels'
  }
});

console.log(result.result);
// Returns instructions on how to connect to Slack MCP
```

---

#### Tool: validate_url {#tool-validate-url}

Validate whether a URL points to a valid MCP server.

**Parameters:**
- `mcpServerUrl` (string, required): URL to validate

**Returns:**
- `result` (string): Validation result and description

**Example:**
```typescript
const validation = await bridge.use({
  method: 'validate_url',
  params: {
    mcpServerUrl: 'https://example.com/mcp'
  }
});

console.log(validation.result);
// "Yes, this is a valid MCP server providing..."
```

---

### McpTool {#mcptool}

Wraps an individual MCP server as an Olane tool node.

**Note**: You typically don't instantiate this directly - `McpBridgeTool` creates it for you.

#### Constructor

```typescript
new McpTool(config: oNodeToolConfig & { 
  address: oAddress; 
  mcpClient: Client 
})
```

**Parameters:**
- `config.address` (oAddress, required): Node address
- `config.mcpClient` (Client, required): Connected MCP client
- `config.name` (string, optional): Display name
- `config.description` (string, optional): Description
- `config.leader` (oAddress, optional): Leader node
- `config.parent` (oAddress, optional): Parent node address

#### Dynamic Tools

`McpTool` automatically creates `_tool_*` methods for each tool exposed by the MCP server.

**Example:**
```typescript
// If MCP server has tools: 'create_issue', 'list_repos'
// McpTool will expose:
// - _tool_create_issue(request)
// - _tool_list_repos(request)

// Use via standard Olane interface
const issues = await mcpTool.use({
  method: 'list_repos',
  params: { owner: 'olane-labs' }
});
```

---

### oClient & oServer {#oclient-oserver}

Extended MCP client and server implementations that add **intent wrapping**.

#### oClient

```typescript
import { oClient } from '@olane/o-mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new oClient(
  { name: 'my-client', version: '1.0.0' },
  { intent: 'Analyze user behavior patterns' }
);

const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.example.com')
);

await client.connect(transport);

// All requests will include:
// { params: { _meta: { intent: 'Analyze user behavior patterns' } } }
```

**Intent Options:**
- **Static**: `intent: 'Fixed intent string'`
- **Dynamic**: `intent: () => getCurrentIntent()`

#### oServer

```typescript
import { oServer } from '@olane/o-mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new oServer(
  { name: 'my-server', version: '1.0.0' },
  { requireIntent: true } // Reject requests without intent
);

const transport = new StdioServerTransport();
await server.connect(transport);

// Server will enforce intent presence on all requests
```

---

## Common Use Cases {#common-use-cases}

### Use Case 1: Add GitHub MCP Server {#use-case-github}

```typescript
import { McpBridgeTool } from '@olane/o-mcp';
import { oAddress } from '@olane/o-core';

const bridge = new McpBridgeTool({
  address: new oAddress('o://mcp')
});

await bridge.start();

// Add GitHub MCP with authentication
await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://github-mcp.example.com/mcp',
    name: 'github',
    description: 'GitHub repository and issue management',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
    }
  }
});

// Now use GitHub tools
const repos = await bridge.use(new oAddress('o://github'), {
  method: 'list_repositories',
  params: { organization: 'olane-labs' }
});

console.log(repos);
```

---

### Use Case 2: Local Filesystem MCP {#use-case-filesystem}

```typescript
// Add filesystem MCP server as local child process
await bridge.use({
  method: 'add_local_server',
  params: {
    command: 'npx',
    args: [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      '/Users/you/Documents'
    ],
    name: 'documents'
  }
});

// Use filesystem tools
const files = await bridge.use(new oAddress('o://documents'), {
  method: 'list_directory',
  params: { path: '/Users/you/Documents/projects' }
});

const content = await bridge.use(new oAddress('o://documents'), {
  method: 'read_file',
  params: { path: '/Users/you/Documents/notes.txt' }
});
```

---

### Use Case 3: Intent-Driven MCP Discovery {#use-case-intent-driven}

```typescript
import { oLaneTool } from '@olane/o-lane';
import { oAddress } from '@olane/o-core';

// Agent sends high-level intent to bridge
const result = await bridge.use({
  method: 'intent',
  params: {
    intent: 'I need to analyze my GitHub repositories. Find and add the GitHub MCP server.'
  }
});

// Bridge will:
// 1. Search for GitHub MCP using the search tool
// 2. Validate the URL
// 3. Add the MCP server to the network
// 4. Return confirmation

// Then agent can use GitHub tools
const analysis = await bridge.use(new oAddress('o://github'), {
  method: 'analyze_repository',
  params: { repo: 'olane-labs/olane' }
});
```

---

### Use Case 4: Custom Intent Wrapping {#use-case-custom-intent}

```typescript
import { oClient } from '@olane/o-mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Dynamic intent based on current execution context
let currentTask = 'Onboarding new user';

const client = new oClient(
  { name: 'custom-client', version: '1.0.0' },
  { 
    // Intent function called for each request
    intent: () => `Current task: ${currentTask}` 
  }
);

const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.example.com')
);

await client.connect(transport);

// Call MCP tools with dynamic intent
await client.callTool({
  name: 'create_user_profile',
  arguments: { name: 'John Doe' }
});
// Request includes: _meta.intent = "Current task: Onboarding new user"

// Change intent for subsequent requests
currentTask = 'User profile management';

await client.callTool({
  name: 'update_user_settings',
  arguments: { userId: '123', theme: 'dark' }
});
// Request includes: _meta.intent = "Current task: User profile management"
```

---

## Troubleshooting {#troubleshooting}

### Error: "MCP server already added"

**Problem**: Attempting to add the same MCP server URL twice.

**Solution**: Each MCP server URL can only be added once per bridge instance. Use a different name or restart the bridge.

```typescript
// Check if server was already added
const children = bridge.hierarchyManager.getChildren();
const isAdded = children.some(c => c.toString() === 'o://github');

if (!isAdded) {
  await bridge.use({
    method: 'add_remote_server',
    params: { mcpServerUrl: '...', name: 'github' }
  });
}
```

---

### Error: "Missing required _meta.intent"

**Problem**: MCP server configured with `requireIntent: true` but client not sending intent.

**Solution**: Use `oClient` instead of standard MCP `Client`:

```typescript
// ❌ Wrong - no intent
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
const client = new Client({ name: 'my-client', version: '1.0.0' });

// ✅ Correct - includes intent
import { oClient } from '@olane/o-mcp';
const client = new oClient(
  { name: 'my-client', version: '1.0.0' },
  { intent: 'My current task' }
);
```

---

### Error: Connection timeout to MCP server

**Problem**: Cannot connect to remote MCP server URL.

**Solution**: 
1. Verify URL is correct and server is running
2. Check network connectivity
3. Validate authentication headers if required

```typescript
// Use validate_url to test connection first
const validation = await bridge.use({
  method: 'validate_url',
  params: { mcpServerUrl: 'https://mcp.example.com' }
});

console.log(validation.result);
// If validation fails, check URL and network
```

---

### MCP tools not appearing in network

**Problem**: Added MCP server but tools not discoverable.

**Solution**: Ensure indexing completed:

```typescript
// After adding MCP server, trigger indexing
await bridge.use(new oAddress('o://mcp_server_name'), {
  method: 'index_network',
  params: {}
});

// Verify tools are indexed
const whoami = await bridge.use(new oAddress('o://mcp_server_name'), {
  method: 'whoami',
  params: {}
});

console.log(whoami.tools); // Should list all MCP tools
```

---

## Package Combinations {#package-combinations}

`o-mcp` is typically used with:

| Package | Purpose | When to Include |
|---------|---------|-----------------|
| **@olane/o-core** | Addressing and routing | Always (peer dependency) |
| **@olane/o-node** | P2P networking | Always (peer dependency) |
| **@olane/o-tool** | Tool system | Always (peer dependency) |
| **@olane/o-lane** | Intent-driven execution | Always (used by McpBridgeTool) |
| **@olane/o-leader** | Network coordination | For production networks |
| **@olane/o-intelligence** | AI agents for intent processing | For autonomous MCP usage |
| **@modelcontextprotocol/sdk** | MCP protocol implementation | Always (peer dependency) |

### Minimal Setup

```json
{
  "dependencies": {
    "@olane/o-mcp": "^0.7.2",
    "@olane/o-core": "^0.7.2",
    "@olane/o-node": "^0.7.2",
    "@olane/o-tool": "^0.7.2",
    "@olane/o-lane": "^0.7.2",
    "@modelcontextprotocol/sdk": "^1.18.1"
  }
}
```

---

## Architecture Notes {#architecture-notes}

### Node Type

`McpBridgeTool` is a **complex node** - it uses `o-lane` capability loops to handle high-level intents autonomously.

**What this means:**
- Accepts natural language intents (e.g., "Add GitHub MCP server")
- Autonomously decides which tools to use (search, validate, add)
- Coordinates multi-step operations
- Ideal for agents that don't know exact MCP server details

**Alternative**: For direct control, call specific tools (`add_remote_server`, etc.) instead of using intents.

---

### Tool Node Hierarchy

When you add an MCP server, it becomes a **child node** of the bridge:

```
o://mcp-bridge (McpBridgeTool)
├── o://github (McpTool wrapping GitHub MCP)
├── o://slack (McpTool wrapping Slack MCP)
└── o://filesystem (McpTool wrapping Filesystem MCP)
```

Each child node (`McpTool`) is a complete Olane tool node with:
- Its own `o://` address
- Discoverable tools in the network
- Standard Olane tool interface

---

### Intent Metadata Flow

The intent wrapping system preserves execution context across MCP boundaries:

```
┌─────────────────────────────────────────────────┐
│ Agent Intent: "Analyze Q4 sales using GitHub"  │
└─────────────────────────────────────────────────┘
                    ⬇
┌─────────────────────────────────────────────────┐
│ oLane: Execute with context                    │
│ _meta.intent = "Analyze Q4 sales using GitHub" │
└─────────────────────────────────────────────────┘
                    ⬇
┌─────────────────────────────────────────────────┐
│ McpTool: Call MCP server                       │
│ Adds intent to MCP request parameters          │
└─────────────────────────────────────────────────┘
                    ⬇
┌─────────────────────────────────────────────────┐
│ MCP Server: Receives request                   │
│ params._meta.intent = "Analyze Q4..."          │
│ Can use intent for logging, routing, etc.      │
└─────────────────────────────────────────────────┘
```

This enables:
- **Audit trails**: Track why tools were called
- **Context-aware responses**: MCP servers can adapt to intent
- **Error debugging**: Understand execution context when failures occur

---

## Real-World Examples {#real-world-examples}

### Example 1: Multi-MCP Research Assistant

```typescript
import { McpBridgeTool } from '@olane/o-mcp';
import { oAddress } from '@olane/o-core';

// Setup bridge
const bridge = new McpBridgeTool({
  address: new oAddress('o://research-mcp')
});

await bridge.start();

// Add multiple research-related MCPs
await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://arxiv-mcp.example.com',
    name: 'arxiv',
    description: 'Academic paper search and retrieval'
  }
});

await bridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://wikipedia-mcp.example.com',
    name: 'wikipedia',
    description: 'Wikipedia article search and summaries'
  }
});

await bridge.use({
  method: 'add_local_server',
  params: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/papers'],
    name: 'research_files'
  }
});

// Agent can now coordinate research across all sources
const result = await bridge.use({
  method: 'intent',
  params: {
    intent: 'Research quantum computing papers from 2024, summarize key findings, and save to research_files'
  }
});

// Bridge autonomously:
// 1. Searches arxiv for quantum computing papers
// 2. Gets Wikipedia context on quantum computing
// 3. Synthesizes findings
// 4. Saves summary using filesystem MCP
```

---

### Example 2: Development Workflow Automation

```typescript
// Add development-related MCPs
const devBridge = new McpBridgeTool({
  address: new oAddress('o://dev-tools')
});

await devBridge.start();

// GitHub for repository management
await devBridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://github-mcp.example.com',
    name: 'github',
    headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
  }
});

// Slack for notifications
await devBridge.use({
  method: 'add_remote_server',
  params: {
    mcpServerUrl: 'https://slack-mcp.example.com',
    name: 'slack',
    headers: { 'Authorization': `Bearer ${SLACK_TOKEN}` }
  }
});

// Local filesystem for logs
await devBridge.use({
  method: 'add_local_server',
  params: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/var/logs'],
    name: 'logs'
  }
});

// Automated workflow
const workflow = await devBridge.use({
  method: 'intent',
  params: {
    intent: 'Check for failed CI builds in our GitHub org, read error logs, and send summary to #dev-alerts Slack channel'
  }
});

// Bridge coordinates across all MCPs to complete the workflow
```

---

## Related Resources {#related-resources}

### Olane Packages
- **[@olane/o-core](/packages/o-core)** - Core abstractions and addressing
- **[@olane/o-node](/packages/o-node)** - P2P networking implementation
- **[@olane/o-tool](/packages/o-tool)** - Tool system and conventions
- **[@olane/o-lane](/packages/o-lane)** - Intent-driven execution loops
- **[@olane/o-leader](/packages/o-leader)** - Network coordination

### Concepts
- **[Tools, Nodes, Applications](/concepts/tools-nodes-applications)** - Architectural levels
- **[Simple vs Complex Nodes](/concepts/tool-nodes/overview)** - Node types explained
- **[Building Tool Nodes](/guides/building-tool-nodes)** - Create custom nodes

### External Resources
- **[Model Context Protocol](https://modelcontextprotocol.io)** - MCP specification
- **[MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)** - Official SDK
- **[MCP Server Examples](https://github.com/modelcontextprotocol/servers)** - Reference implementations

---

## Next Steps {#next-steps}

<CardGroup cols={2}>
  <Card title="Build Your First Node" icon="hammer" href="/guides/quickstart">
    Learn Olane fundamentals
  </Card>
  <Card title="Explore MCP Servers" icon="server" href="https://github.com/modelcontextprotocol/servers">
    Find existing MCP servers
  </Card>
  <Card title="Package Combinations" icon="box" href="/packages/package-combinations">
    Choose the right packages
  </Card>
  <Card title="o-lane Documentation" icon="brain" href="/packages/o-lane">
    Learn intent-driven execution
  </Card>
</CardGroup>

---

## License {#license}

ISC © oLane Inc.

## Contributing {#contributing}

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## Support {#support}

- **Issues**: [GitHub Issues](https://github.com/olane-labs/olane/issues)
- **Discussions**: [GitHub Discussions](https://github.com/olane-labs/olane/discussions)
- **Discord**: [Join our community](https://discord.gg/olane)
