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
    name: 'add_remote_server',
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
};
