import { oMethod } from '@olane/o-protocol';

export const START_METHOD: oMethod = {
  name: 'intent',
  description: 'Resolve the intent of the task',
  dependencies: [],
  parameters: [
    {
      name: 'intent',
      type: 'string',
      value: 'string',
      description: 'The intent of the task',
      required: true,
    },
    {
      name: 'context',
      type: 'string',
      value: 'string',
      description: 'The user input to the task',
      required: false,
    },
  ],
};
