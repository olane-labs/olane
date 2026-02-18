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
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description:
          'Persistent model preference (e.g., claude-opus-4-20250514, gpt-4o). Stored in secure storage for future requests.',
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
      { name: 'userMessage', 
        type: 'string',
        value: 'string',
        description: 'The user message to send to the AI model',
        required: false
      },
      {
        name: 'stream',
        type: 'boolean',
        value: 'boolean',
        description: 'Whether to stream the response',
        required: false,
      },
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description:
          'Per-request model override (e.g., claude-opus-4-20250514, gpt-4o). Takes priority over configured model.',
        required: false,
      },
      {
        name: 'provider',
        type: 'string',
        value: 'string',
        description:
          'Per-request provider override (anthropic, openai, ollama, perplexity, grok, olane). Takes priority over configured provider.',
        required: false,
      },
    ],
  },
};
