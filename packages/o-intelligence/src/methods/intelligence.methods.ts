import { oMethod } from '@olane/o-protocol';

export const INTELLIGENCE_PARAMS: { [key: string]: oMethod } = {
  configure: {
    name: 'configure',
    description: 'Configure',
    dependencies: [],
    parameters: [
      {
        name: 'modelProvider',
        type: 'string',
        value: 'string',
        description:
          'The model provider to use (anthropic, openai, ollama, perplexity, grok, olane)',
        required: false,
      },
      {
        name: 'hostingProvider',
        type: 'string',
        value: 'string',
        description: 'The hosting provider to use (olane, local)',
        required: false,
      },
    ],
  },
  prompt: {
    name: 'prompt',
    description: 'Generate a response using AI based on a prompt',
    dependencies: [],
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        value: 'string',
        description: 'The prompt to send to the AI model',
      },
    ],
  },
};
