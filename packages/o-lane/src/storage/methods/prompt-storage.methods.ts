import { oMethod } from '@olane/o-protocol';

/**
 * Method definitions for prompt-specific storage operations
 * Extends standard storage with promptId namespace isolation
 */
export const PROMPT_STORAGE_METHODS: { [key: string]: oMethod } = {
  put: {
    name: 'put',
    description:
      'Store data in a prompt-specific namespace. Data is isolated per promptId.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier for namespace isolation',
        required: true,
      },
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'Key to store the data under within the prompt namespace',
        required: true,
      },
      {
        name: 'value',
        type: 'string',
        value: 'string',
        description: 'The data to store',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Store user preference in a conversation',
        intent: 'Store the user name Alice for conversation 123',
        params: {
          promptId: 'conversation-123',
          key: 'user_name',
          value: 'Alice',
        },
        expectedResult: {
          success: true,
        },
      },
    ],
    performance: {
      estimatedDuration: 10,
      maxDuration: 1000,
      idempotent: true,
      cacheable: false,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'write',
      description: 'Store data in isolated prompt namespace',
    },
  },

  get: {
    name: 'get',
    description:
      'Retrieve data from a prompt-specific namespace. Returns null if key not found.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier',
        required: true,
      },
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to retrieve from the prompt namespace',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Retrieve stored user preference',
        intent: 'Get the user name from conversation 123',
        params: {
          promptId: 'conversation-123',
          key: 'user_name',
        },
        expectedResult: {
          value: 'Alice',
        },
      },
    ],
    performance: {
      estimatedDuration: 5,
      maxDuration: 500,
      idempotent: true,
      cacheable: true,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'read',
      description: 'Read data from isolated prompt namespace',
    },
  },

  delete: {
    name: 'delete',
    description: 'Delete a specific key from a prompt namespace.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier',
        required: true,
      },
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to delete from the prompt namespace',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Delete a stored value',
        intent: 'Delete the user name from conversation 123',
        params: {
          promptId: 'conversation-123',
          key: 'user_name',
        },
        expectedResult: {
          success: true,
        },
      },
    ],
    performance: {
      estimatedDuration: 10,
      maxDuration: 1000,
      idempotent: true,
      cacheable: false,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'write',
      description: 'Delete data from isolated prompt namespace',
    },
  },

  has: {
    name: 'has',
    description: 'Check if a key exists in a prompt namespace.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier',
        required: true,
      },
      {
        name: 'key',
        type: 'string',
        value: 'string',
        description: 'The key to check in the prompt namespace',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Check if a key exists',
        intent: 'Check if user name exists in conversation 123',
        params: {
          promptId: 'conversation-123',
          key: 'user_name',
        },
        expectedResult: {
          success: true,
        },
      },
    ],
    performance: {
      estimatedDuration: 5,
      maxDuration: 500,
      idempotent: true,
      cacheable: true,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'read',
      description: 'Check key existence in isolated prompt namespace',
    },
  },

  list_prompts: {
    name: 'list_prompts',
    description:
      'List all prompt IDs that have active storage. Returns an array of prompt identifiers.',
    dependencies: [],
    parameters: [],
    examples: [
      {
        description: 'List all prompts with storage',
        intent: 'Show all conversations that have stored data',
        params: {},
        expectedResult: {
          promptIds: ['conversation-123', 'conversation-456'],
          count: 2,
        },
      },
    ],
    performance: {
      estimatedDuration: 10,
      maxDuration: 1000,
      idempotent: true,
      cacheable: true,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'read',
      description: 'List all prompt namespaces',
    },
  },

  clear_prompt: {
    name: 'clear_prompt',
    description:
      'Clear all data for a specific prompt namespace. This removes all keys and values.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier to clear',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Clear all data for a conversation',
        intent: 'Delete all stored data for conversation 123',
        params: {
          promptId: 'conversation-123',
        },
        expectedResult: {
          success: true,
          keysDeleted: 5,
        },
      },
    ],
    performance: {
      estimatedDuration: 20,
      maxDuration: 2000,
      idempotent: true,
      cacheable: false,
    },
    approvalMetadata: {
      riskLevel: 'medium',
      category: 'write',
      description: 'Clear entire prompt namespace',
    },
  },

  get_prompt_keys: {
    name: 'get_prompt_keys',
    description:
      'Get all keys stored in a specific prompt namespace. Returns an array of key names.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Get all keys for a conversation',
        intent: 'List all data keys stored for conversation 123',
        params: {
          promptId: 'conversation-123',
        },
        expectedResult: {
          keys: ['user_name', 'user_email', 'preferences'],
          count: 3,
        },
      },
    ],
    performance: {
      estimatedDuration: 10,
      maxDuration: 1000,
      idempotent: true,
      cacheable: true,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'read',
      description: 'List keys in prompt namespace',
    },
  },

  get_prompt_stats: {
    name: 'get_prompt_stats',
    description:
      'Get statistics for a specific prompt namespace including key count and last accessed time.',
    dependencies: [],
    parameters: [
      {
        name: 'promptId',
        type: 'string',
        value: 'string',
        description: 'Unique prompt/conversation identifier',
        required: true,
      },
    ],
    examples: [
      {
        description: 'Get stats for a conversation',
        intent: 'Show storage statistics for conversation 123',
        params: {
          promptId: 'conversation-123',
        },
        expectedResult: {
          promptId: 'conversation-123',
          keyCount: 3,
          lastAccessed: 1638360000000,
          exists: true,
        },
      },
    ],
    performance: {
      estimatedDuration: 10,
      maxDuration: 1000,
      idempotent: true,
      cacheable: true,
    },
    approvalMetadata: {
      riskLevel: 'low',
      category: 'read',
      description: 'Get prompt namespace statistics',
    },
  },
};
