import { oMethod } from '@olane/o-protocol';

export const TEXT_EMBEDDINGS_PARAMS: { [key: string]: oMethod } = {
  embed_documents: {
    name: 'embed_documents',
    description: 'Embed documents',
    dependencies: [],
    parameters: [
      {
        name: 'documents',
        type: 'array',
        value: 'string[]',
        description: 'The documents to embed',
        required: true,
      },
    ],
  },
  embed_query: {
    name: 'embed_query',
    description: 'Embed a query',
    dependencies: [],
    parameters: [
      {
        name: 'query',
        type: 'string',
        value: 'string',
        description: 'The query to embed',
      },
    ],
  },
};
