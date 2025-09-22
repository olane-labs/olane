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
      },
      {
        name: 'hostingProvider',
        type: 'string',
        value: 'string',
        description: 'The hosting provider to use (olane, local)',
      },
    ],
  },
  completion: {
    name: 'completion',
    description: 'Completion',
    dependencies: [],
    parameters: [
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The model to use for generation',
        required: false,
      },
      {
        name: 'messages',
        type: 'array',
        value: 'string[]',
        description: 'The messages to use for generation',
      },
      {
        name: 'options',
        type: 'object',
        value: 'object',
        description: 'The options to use for generation',
        required: false,
      },
    ],
  },
  generate: {
    name: 'generate',
    description: 'Generate',
    dependencies: [],
    parameters: [
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The model to use for generation',
      },
    ],
  },
  list_models: {
    name: 'list_models',
    description: 'List models',
    dependencies: [],
    parameters: [],
  },
  pull_model: {
    name: 'pull_model',
    description: 'Pull model',
    dependencies: [],
    parameters: [
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The model to pull',
      },
      {
        name: 'insecure',
        type: 'boolean',
        value: 'boolean',
        description: 'Whether to allow insecure connections',
      },
    ],
  },
  delete_model: {
    name: 'delete_model',
    description: 'Delete model',
    dependencies: [],
    parameters: [
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The model to delete',
      },
    ],
  },
  model_info: {
    name: 'model_info',
    description: 'Model info',
    dependencies: [],
    parameters: [
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The model to get info for',
      },
    ],
  },
  status: {
    name: 'status',
    description: 'Status',
    dependencies: [],
    parameters: [],
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
  search: {
    name: 'search',
    description: 'Search for information using AI search capabilities',
    dependencies: [],
    parameters: [
      {
        name: 'query',
        type: 'string',
        value: 'string',
        description: 'The search query to execute',
      },
      {
        name: 'focus',
        type: 'string',
        value: 'string',
        description: 'The focus area for the search',
        required: false,
      },
    ],
  },
};
