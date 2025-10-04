import { oMethod } from '@olane/o-protocol';

export const MCP_BRIDGE_METHODS: { [key: string]: oMethod } = {
  validate_url: {
    name: 'validate_url',
    description: 'Validate the URL of an MCP server',
    dependencies: [],
    parameters: [
      {
        name: 'mcpServerUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server to validate',
        required: true,
      },
    ],
  },
  add_remote_server: {
    name: 'add_remote_server',
    description: 'Add a MCP server that is hosted on a remote server',
    dependencies: [],
    parameters: [
      {
        name: 'mcpServerUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server to use',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        value: 'string',
        description:
          'The name for the MCP server. Generate this in lowercase snake_case if not provided.',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        value: 'string',
        description:
          'The description for the MCP server. Generate this if not provided.',
        required: false,
      },
      {
        name: 'headers',
        type: 'object',
        value: 'Record<string, string>',
        description: 'The headers to send to the MCP server',
        required: false,
      },
    ],
  },
  search: {
    name: 'search',
    description: 'Search for MCP servers',
    dependencies: [],
    parameters: [
      {
        name: 'name',
        type: 'string',
        value: 'string',
        description: 'The mcp server name to search for',
        required: false,
      },
      {
        name: 'provider',
        type: 'string',
        value: 'string',
        description:
          'Who the MCP server is provided by. This is inferred from the user intent.',
        required: false,
      },
      {
        name: 'functionality',
        type: 'string',
        value: 'string',
        description: 'Description of the functionality of the MCP server',
        required: false,
      },
    ],
  },
  add_local_server: {
    name: 'add_local_server',
    description:
      'Add a local MCP server to the bridge using command and arguments',
    dependencies: [],
    parameters: [
      {
        name: 'command',
        type: 'string',
        value: 'string',
        description: 'The command to execute for the local MCP server',
        required: true,
      },
      {
        name: 'args',
        type: 'array',
        value: 'string[]',
        description: 'The arguments to pass to the command',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        value: 'string',
        description: 'The name for the MCP server',
        required: true,
      },
    ],
  },
  add_oauth_server: {
    name: 'add_oauth_server',
    description: 'Add an OAuth-protected MCP server to the network',
    dependencies: [],
    parameters: [
      {
        name: 'mcpServerUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the OAuth-protected MCP server',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        value: 'string',
        description:
          'Name for the MCP server (lowercase snake_case). Generate if not provided.',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        value: 'string',
        description: 'Description of the MCP server. Generate if not provided.',
        required: false,
      },
      {
        name: 'clientName',
        type: 'string',
        value: 'string',
        description:
          'OAuth client name for dynamic registration (defaults to server name)',
        required: false,
      },
      {
        name: 'scope',
        type: 'string',
        value: 'string',
        description: 'OAuth scopes to request',
        required: false,
      },
      {
        name: 'staticClientInfo',
        type: 'object',
        value: 'object',
        description:
          'Pre-registered OAuth client credentials (client_id, client_secret, authorization_endpoint, token_endpoint)',
        required: false,
      },
      {
        name: 'useDynamicRegistration',
        type: 'boolean',
        value: 'boolean',
        description: 'Use RFC 7591 dynamic client registration (default: true)',
        required: false,
      },
      {
        name: 'callbackPort',
        type: 'number',
        value: 'number',
        description: 'Port for OAuth callback server (default: 3334)',
        required: false,
      },
    ],
  },
};
