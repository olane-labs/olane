import { oMethod } from '@olane/o-protocol';
import { STORAGE_PARAMS } from './storage.methods.js';

export const PLACEHOLDER_STORAGE_PARAMS: { [key: string]: oMethod } = {
  ...STORAGE_PARAMS,
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
      {
        name: 'intent',
        type: 'string',
        value: 'string',
        description: 'The intent of the data',
        required: false,
      },
    ],
  },
};
