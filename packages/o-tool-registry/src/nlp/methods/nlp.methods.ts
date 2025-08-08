import { oMethod } from '@olane/o-protocol';

export const NLP_PARAMS: { [key: string]: oMethod } = {
  extract: {
    name: 'extract',
    description: 'Extract',
    dependencies: [],
    parameters: [
      {
        name: 'text',
        type: 'string',
        value: 'string',
        description: 'The text to extract from',
      },
    ],
  },
};
