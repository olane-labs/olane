import { oMethod } from '@olane/o-protocol';

export const REGISTRY_PARAMS: { [key: string]: oMethod } = {
  commit: {
    name: 'commit',
    description: 'Commit a node to the registry',
    dependencies: [],
    parameters: [
      {
        name: 'peerId',
        type: 'string',
        value: 'string',
        description: 'The peerId to commit',
        required: true,
      },
      {
        name: 'address',
        type: 'string',
        value: 'string',
        description: 'The address to commit',
      },
      {
        name: 'protocols',
        type: 'array',
        value: 'string[]',
        description: 'The protocols to commit',
      },
      {
        name: 'transports',
        type: 'array',
        value: 'string[]',
        description: 'The transports to commit',
      },
      {
        name: 'staticAddress',
        type: 'string',
        value: 'string',
        description: 'The static address to commit',
      },
    ],
  },
  search: {
    name: 'search',
    description: 'Search for a node in the registry using simple query logic.',
    dependencies: [],
    parameters: [
      {
        name: 'staticAddress',
        type: 'string',
        value: 'string',
        description: 'The static address to search for',
        required: false,
      },
      {
        name: 'protocols',
        type: 'array',
        value: 'string[]',
        description: 'The protocols to search for',
        required: false,
      },
      {
        name: 'address',
        type: 'string',
        value: 'string',
        description: 'The address to search for',
        required: false,
      },
    ],
  },
  find_all: {
    name: 'find_all',
    description: 'Find all nodes in the registry',
    dependencies: [],
    parameters: [],
  },
};
