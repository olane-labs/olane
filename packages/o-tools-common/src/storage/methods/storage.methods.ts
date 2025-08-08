import { oMethod } from '@olane/o-protocol';

export const STORAGE_PARAMS: { [key: string]: oMethod } = {
  put: {
    name: 'put',
    description: 'Store data on disk',
    dependencies: [],
    parameters: [
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'Store data on disk',
        required: true,
      },
      {
        name: 'value',
        type: 'string',
        value: 'string',
        description: 'The data to store',
        required: true,
      },
    ],
  },
  get: {
    name: 'get',
    description: 'Retrieve data from disk',
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
  delete: {
    name: 'delete',
    description: 'Delete data from disk',
    dependencies: [],
    parameters: [
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to delete',
        required: true,
      },
    ],
  },
  has: {
    name: 'has',
    description: 'Check if data exists on disk',
    dependencies: [],
    parameters: [
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to check',
        required: true,
      },
    ],
  },
};
