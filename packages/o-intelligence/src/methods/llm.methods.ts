import { oMethod } from '@olane/o-protocol';

export const LLM_PARAMS: { [key: string]: oMethod } = {
  completion: {
    name: 'completion',
    description: 'The primary method for interacting with the service',
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
  embed_documents: {
    name: 'embed_documents',
    description: 'Generate embeddings for multiple documents',
    dependencies: [],
    parameters: [
      {
        name: 'input',
        type: 'array',
        value: 'string[]',
        description: 'Array of text strings to embed',
        required: true,
      },
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The embedding model to use',
        required: false,
      },
      {
        name: 'apiKey',
        type: 'string',
        value: 'string',
        description: 'OpenAI API key (optional, uses OPENAI_API_KEY env var if not provided)',
        required: false,
      },
      {
        name: 'dimensions',
        type: 'number',
        value: 'number',
        description: 'Number of dimensions for the embedding (only for text-embedding-3 models)',
        required: false,
      },
    ],
  },
  embed_query: {
    name: 'embed_query',
    description: 'Generate embedding for a single query string',
    dependencies: [],
    parameters: [
      {
        name: 'input',
        type: 'string',
        value: 'string',
        description: 'Text string to embed',
        required: true,
      },
      {
        name: 'model',
        type: 'string',
        value: 'string',
        description: 'The embedding model to use',
        required: false,
      },
      {
        name: 'apiKey',
        type: 'string',
        value: 'string',
        description: 'OpenAI API key (optional, uses OPENAI_API_KEY env var if not provided)',
        required: false,
      },
      {
        name: 'dimensions',
        type: 'number',
        value: 'number',
        description: 'Number of dimensions for the embedding (only for text-embedding-3 models)',
        required: false,
      },
    ],
  },
};
