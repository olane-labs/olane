import { oMethod } from '@olane/o-protocol';

export const VECTOR_STORE_PARAMS: { [key: string]: oMethod } = {
  add_documents: {
    name: 'add_documents',
    description: 'Add documents to the store',
    dependencies: [],
    parameters: [
      {
        name: 'documents',
        type: 'array',
        value: '{pageContent: string, metadata: object}',
        description: 'The documents to add',
      },
    ],
  },
  delete_documents: {
    name: 'delete_documents',
    description: 'Delete documents from the store',
    dependencies: [],
    parameters: [
      {
        name: 'documents',
        type: 'array',
        value: 'object[]',
        description: 'The documents to update',
      },
    ],
  },
  search_similar: {
    name: 'search_similar',
    description: 'Search for similar documents in the store',
    dependencies: [],
    parameters: [
      {
        name: 'query',
        type: 'string',
        value: 'string',
        description: 'The query to search for',
      },
      {
        name: 'limit',
        type: 'number',
        value: 'number',
        description: 'The limit of documents to return',
      },
    ],
  },
  update_documents: {
    name: 'update_documents',
    description: 'Update documents in the store',
    dependencies: [],
    parameters: [
      {
        name: 'documents',
        type: 'array',
        value: 'object[]',
        description: 'The documents to update',
      },
    ],
  },
};
