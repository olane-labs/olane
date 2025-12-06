import { oMethod } from '@olane/o-protocol';

export const SEARCH_PARAMS: { [key: string]: oMethod } = {
  vector: {
    name: 'vector',
    description:
      'Search for data using vector similarity within the Olane OS from a global view.',
    dependencies: [],
    parameters: [
      {
        name: 'query',
        type: 'string',
        value: 'string',
        description: 'The vector query to search for',
        required: true,
      },
    ],
  },
};
