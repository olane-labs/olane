import { oMethod } from '@olane/o-protocol';

export const WEB_INTERPRETER_PARAMS: { [key: string]: oMethod } = {
  interpret: {
    name: 'interpret',
    description:
      'Interprets a webpage and returns AI-optimized content analysis',
    dependencies: [],
    parameters: [
      {
        name: 'url',
        type: 'string',
        value: 'string',
        description: 'The URL of the webpage to interpret',
        required: true,
      },
      {
        name: 'options',
        type: 'object',
        value: 'object',
        description: 'Optional configuration for webpage interpretation',
        required: false,
      },
    ],
  },
  extractText: {
    name: 'extractText',
    description: 'Extracts clean text content from a webpage',
    dependencies: [],
    parameters: [
      {
        name: 'url',
        type: 'string',
        value: 'string',
        description: 'The URL of the webpage to extract text from',
        required: true,
      },
      {
        name: 'options',
        type: 'object',
        value: 'object',
        description: 'Optional extraction configuration',
        required: false,
      },
    ],
  },
  analyze: {
    name: 'analyze',
    description: 'Analyzes webpage structure and metadata',
    dependencies: [],
    parameters: [
      {
        name: 'url',
        type: 'string',
        value: 'string',
        description: 'The URL of the webpage to analyze',
        required: true,
      },
      {
        name: 'options',
        type: 'object',
        value: 'object',
        description: 'Optional analysis configuration',
        required: false,
      },
    ],
  },
};
