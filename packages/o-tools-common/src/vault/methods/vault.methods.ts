import { oMethod } from '@olane/o-protocol';

export const VAULT_PARAMS: { [key: string]: oMethod } = {
  get: {
    name: 'get',
    description: 'Retrieve data from the vault',
    dependencies: [],
    parameters: [
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to retrieve',
        required: true,
      },
    ],
  },
  store: {
    name: 'store',
    description: 'Store data in the vault',
    dependencies: [],
    parameters: [
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to store',
        required: true,
      },
      {
        name: 'value',
        type: 'string',
        value: 'string',
        description: 'The value to store',
        required: true,
      },
    ],
  },
};
