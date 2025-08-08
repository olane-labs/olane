import { oMethod } from '@olane/o-protocol';

export const MCP_BRIDGE_METHODS: { [key: string]: oMethod } = {
  add_remote_server_with_api_key: {
    name: 'add_remote_server_with_api_key',
    description: 'Add a MCP server that requires an API key to the bridge',
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
        name: 'apiKey',
        type: 'string',
        value: 'string',
        description: 'The API key to use for the MCP server',
        required: true,
      },
    ],
  },
  add_remote_server_with_oauth: {
    name: 'add_remote_server_with_oauth',
    description:
      'Add a MCP server that requires an OAuth authentication token to the bridge',
    dependencies: [],
    parameters: [
      {
        name: 'mcpServerUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server to use',
        required: true,
      },
    ],
  },
  add_remote_server: {
    name: 'add_remoteserver',
    description:
      'Add a MCP server that does not require authentication to the bridge',
    dependencies: [],
    parameters: [
      {
        name: 'mcpServerUrl',
        type: 'string',
        value: 'string',
        description: 'The URL of the MCP server to use',
        required: true,
      },
    ],
  },
};
