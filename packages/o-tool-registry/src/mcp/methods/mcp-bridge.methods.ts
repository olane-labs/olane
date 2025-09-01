import { oMethod } from '@olane/o-protocol';

export const MCP_BRIDGE_METHODS: { [key: string]: oMethod } = {
  validate_url: {
    name: 'validate_url',
    description:
      'Validate if a URL is a valid MCP server or a link to something else.',
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
