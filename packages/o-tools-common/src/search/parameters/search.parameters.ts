import { oMethod } from '@olane/o-protocol';

export const SEARCH_PARAMS: { [key: string]: oMethod } = {
  search: {
    name: 'search',
    description: 'Search for data',
    dependencies: [],
    parameters: [
      {
        name: 'query',
        type: 'string',
        value: 'string',
        description: 'The query to search for',
        required: true,
      },
    ],
  },
};
