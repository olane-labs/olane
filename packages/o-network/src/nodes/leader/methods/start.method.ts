import { oMethod } from '@olane/o-protocol';

export const START_METHOD: oMethod = {
  name: 'start',
  description: 'Start a task',
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
      name: 'userInput',
      type: 'string',
      value: 'string',
      description: 'The user input to the task',
      required: false,
    },
  ],
};
