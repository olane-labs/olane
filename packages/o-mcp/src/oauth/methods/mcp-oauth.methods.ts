import { oMethod } from '@olane/o-protocol';

export const MCP_OAUTH_METHODS: { [key: string]: oMethod } = {
  authenticate_server: {
    name: 'authenticate_server',
    description:
      'Authenticate with an OAuth-protected MCP server using dynamic client registration or static credentials',
    dependencies: [],
    parameters: [
      {
        name: 'serverUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the OAuth-protected MCP server',
        required: true,
      },
      {
        name: 'clientName',
        type: 'string',
        value: 'string',
        description:
          'Client name for dynamic registration (defaults to server name)',
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
          'Pre-registered OAuth client credentials (client_id, client_secret, etc.)',
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
  refresh_tokens: {
    name: 'refresh_tokens',
    description: 'Refresh OAuth tokens for an MCP server',
    dependencies: [],
    parameters: [
      {
        name: 'serverUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server',
        required: true,
      },
    ],
  },
  check_tokens: {
    name: 'check_tokens',
    description: 'Check OAuth token status for an MCP server',
    dependencies: [],
    parameters: [
      {
        name: 'serverUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server',
        required: true,
      },
    ],
  },
  clear_tokens: {
    name: 'clear_tokens',
    description: 'Clear OAuth tokens and client info for an MCP server',
    dependencies: [],
    parameters: [
      {
        name: 'serverUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server',
        required: true,
      },
    ],
  },
  list_authenticated_servers: {
    name: 'list_authenticated_servers',
    description: 'List all MCP servers that have been authenticated',
    dependencies: [],
    parameters: [],
  },
};
