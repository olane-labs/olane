import { oMethod } from '@olane/o-protocol';

export const AGENT_METHODS: { [key: string]: oMethod } = {
  intent: {
    name: 'intent',
    description: 'Agent handler for resolving an intent.',
    parameters: [
      {
        name: 'intent',
        type: 'string',
        value: 'string',
        description: 'The intent to resolve.',
        required: true,
      },
    ],
    dependencies: [],
  },
  question_answer: {
    name: 'question_answer',
    description: 'Agent handler for answering a question.',
    parameters: [
      {
        name: 'question',
        type: 'string',
        value: 'string',
        description: 'The question to answer.',
        required: true,
      },
    ],
    dependencies: [],
  },
};
