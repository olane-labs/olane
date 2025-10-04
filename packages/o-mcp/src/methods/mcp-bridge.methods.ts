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
      'Add a local MCP server to the bridge using command and arguments. If a command line argument is provided, use this method.',
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
