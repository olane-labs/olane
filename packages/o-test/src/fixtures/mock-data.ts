/**
 * Mock data fixtures for testing
 *
 * Provides consistent test data across packages
 */

/**
 * Mock user data
 */
export const MOCK_USERS = {
  basic: {
    userId: 'user-test-001',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    active: true,
  },
  admin: {
    userId: 'user-admin-001',
    username: 'adminuser',
    email: 'admin@example.com',
    role: 'admin',
    active: true,
  },
  inactive: {
    userId: 'user-inactive-001',
    username: 'inactive',
    email: 'inactive@example.com',
    role: 'user',
    active: false,
  },
};

/**
 * Mock task data
 */
export const MOCK_TASKS = {
  pending: {
    taskId: 'task-001',
    title: 'Pending Task',
    description: 'A task in pending state',
    status: 'pending',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
  },
  active: {
    taskId: 'task-002',
    title: 'Active Task',
    description: 'A task in active state',
    status: 'active',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 600000,
  },
  completed: {
    taskId: 'task-003',
    title: 'Completed Task',
    description: 'A task in completed state',
    status: 'completed',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
};

/**
 * Mock session data
 */
export const MOCK_SESSIONS = {
  valid: {
    sessionId: 'session-valid-001',
    userId: 'user-test-001',
    createdAt: Date.now() - 1800000,
    expiresAt: Date.now() + 1800000,
    active: true,
  },
  expired: {
    sessionId: 'session-expired-001',
    userId: 'user-test-002',
    createdAt: Date.now() - 7200000,
    expiresAt: Date.now() - 1800000,
    active: false,
  },
};

/**
 * Mock configuration data
 */
export const MOCK_CONFIGS = {
  simple: {
    apiKey: 'test-api-key-123',
    endpoint: 'http://localhost:3000',
    timeout: 5000,
  },
  advanced: {
    apiKey: 'test-api-key-advanced',
    endpoint: 'https://api.test.example.com',
    timeout: 10000,
    retries: 3,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
  },
};

/**
 * Mock addresses
 */
export const MOCK_ADDRESSES = {
  leader: 'o://test-leader',
  node: 'o://test-node',
  tool: 'o://test-tool',
  service: 'o://test-service',
  worker: 'o://test-worker',
};

/**
 * Mock error messages
 */
export const MOCK_ERRORS = {
  required: 'Parameter is required',
  notFound: 'Resource not found',
  unauthorized: 'Unauthorized access',
  invalidType: 'Invalid parameter type',
  timeout: 'Operation timed out',
  networkError: 'Network connection failed',
};

/**
 * Invalid parameter sets for validation testing
 */
export const INVALID_PARAMS = {
  missing: {},
  nullParam: { param: null },
  undefinedParam: { param: undefined },
  emptyString: { param: '' },
  wrongType: { stringParam: 123, numberParam: 'text' },
  negativeNumber: { count: -1, timeout: -500 },
  emptyArray: { items: [] },
  invalidEnum: { status: 'invalid-status' },
};

/**
 * Valid parameter sets for testing
 */
export const VALID_PARAMS = {
  simple: {
    param1: 'value1',
    param2: 'value2',
  },
  withTypes: {
    stringParam: 'test',
    numberParam: 42,
    booleanParam: true,
    arrayParam: [1, 2, 3],
    objectParam: { key: 'value' },
  },
  userId: {
    userId: MOCK_USERS.basic.userId,
  },
  taskId: {
    taskId: MOCK_TASKS.pending.taskId,
  },
  sessionId: {
    sessionId: MOCK_SESSIONS.valid.sessionId,
  },
};

/**
 * Mock streaming chunks
 */
export const MOCK_STREAM_CHUNKS = {
  simple: [
    { index: 0, message: 'chunk 1' },
    { index: 1, message: 'chunk 2' },
    { index: 2, message: 'chunk 3' },
  ],
  withProgress: [
    { progress: 0, status: 'starting' },
    { progress: 25, status: 'processing' },
    { progress: 50, status: 'half-done' },
    { progress: 75, status: 'almost-there' },
    { progress: 100, status: 'complete' },
  ],
  withErrors: [
    { index: 0, success: true, data: 'chunk 1' },
    { index: 1, success: true, data: 'chunk 2' },
    { index: 2, success: false, error: 'Failed' },
  ],
};
