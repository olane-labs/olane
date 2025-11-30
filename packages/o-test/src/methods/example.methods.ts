import { oMethod } from '@olane/o-protocol';

/**
 * Method definitions for the Example Tool
 * These methods are discoverable by AI agents and define the tool's capabilities
 */
export const EXAMPLE_METHODS: { [key: string]: oMethod } = {
  example_method: {
    name: 'example_method',
    description:
      'Process a message and return a result. This is a simple example method demonstrating basic tool functionality.',
    parameters: [
      {
        name: 'message',
        type: 'string',
        description: 'The message to process',
        required: true,
      },
      {
        name: 'metadata',
        type: 'object',
        description: 'Optional metadata to include with the request',
        required: false,
      },
    ],
    dependencies: [],
  },
  process_data: {
    name: 'process_data',
    description:
      'Process and transform data according to specified options. Supports multiple output formats and validation.',
    parameters: [
      {
        name: 'data',
        type: 'string | object',
        description: 'The data to process (can be string or object)',
        required: true,
      },
      {
        name: 'options',
        type: 'object',
        description: 'Processing options including format and validation settings',
        required: false,
      },
    ],
    dependencies: [],
  },
  get_status: {
    name: 'get_status',
    description:
      'Get the current status of the tool including configuration and runtime information.',
    parameters: [],
    dependencies: [],
  },
};
