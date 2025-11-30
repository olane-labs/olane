/**
 * Mock factories for common test data
 *
 * Provides factory functions for creating consistent test data
 */

/**
 * Generate a random ID
 *
 * @param prefix - Optional prefix for the ID
 * @returns Random ID string
 *
 * @example
 * ```typescript
 * const userId = generateId('user'); // "user-1234567890-abc"
 * ```
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create a mock user object
 *
 * @param overrides - Properties to override
 * @returns Mock user object
 *
 * @example
 * ```typescript
 * const user = createMockUser({ email: 'custom@example.com' });
 * ```
 */
export function createMockUser(overrides: Partial<{
  userId: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
}> = {}) {
  const userId = overrides.userId || generateId('user');

  return {
    userId,
    username: overrides.username || `user${userId.slice(-8)}`,
    email: overrides.email || `${userId}@test.example.com`,
    role: overrides.role || 'user',
    active: overrides.active !== undefined ? overrides.active : true,
  };
}

/**
 * Create a mock task object
 *
 * @param overrides - Properties to override
 * @returns Mock task object
 *
 * @example
 * ```typescript
 * const task = createMockTask({ status: 'completed' });
 * ```
 */
export function createMockTask(overrides: Partial<{
  taskId: string;
  title: string;
  description: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}> = {}) {
  const taskId = overrides.taskId || generateId('task');
  const now = Date.now();

  return {
    taskId,
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A test task for unit testing',
    status: overrides.status || 'pending',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

/**
 * Create a mock session object
 *
 * @param overrides - Properties to override
 * @returns Mock session object
 *
 * @example
 * ```typescript
 * const session = createMockSession({ userId: 'user-123' });
 * ```
 */
export function createMockSession(overrides: Partial<{
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  active: boolean;
}> = {}) {
  const sessionId = overrides.sessionId || generateId('session');
  const now = Date.now();
  const oneHour = 3600000;

  return {
    sessionId,
    userId: overrides.userId || generateId('user'),
    createdAt: overrides.createdAt || now,
    expiresAt: overrides.expiresAt || now + oneHour,
    active: overrides.active !== undefined ? overrides.active : true,
  };
}

/**
 * Create mock request parameters
 *
 * @param params - Parameters to include
 * @returns Mock oRequest-compatible object
 *
 * @example
 * ```typescript
 * const request = createMockRequest({ userId: 'user-123' });
 * ```
 */
export function createMockRequest(params: Record<string, any> = {}) {
  return {
    method: 'test_method',
    params,
    timestamp: Date.now(),
  };
}

/**
 * Create mock tool response (success)
 *
 * @param data - Response data
 * @returns Mock successful response
 *
 * @example
 * ```typescript
 * const response = createMockSuccessResponse({ userId: 'user-123' });
 * ```
 */
export function createMockSuccessResponse(data: any = {}) {
  return {
    success: true,
    result: {
      data,
    },
  };
}

/**
 * Create mock tool response (error)
 *
 * @param error - Error message
 * @returns Mock error response
 *
 * @example
 * ```typescript
 * const response = createMockErrorResponse('User not found');
 * ```
 */
export function createMockErrorResponse(error: string = 'Test error') {
  return {
    success: false,
    error,
  };
}

/**
 * Common invalid parameter sets for validation testing
 */
export const INVALID_PARAMS = {
  empty: {},
  nullValue: { param: null },
  undefinedValue: { param: undefined },
  wrongTypeString: { param: 'should-be-number' },
  wrongTypeNumber: { param: 123 },
  wrongTypeBoolean: { param: true },
  emptyString: { param: '' },
  emptyArray: { param: [] },
  emptyObject: { param: {} },
};

/**
 * Common valid parameter sets
 */
export const VALID_PARAMS = {
  basic: { param1: 'value1', param2: 'value2' },
  withNumbers: { count: 5, timeout: 1000 },
  withBoolean: { enabled: true, verified: false },
  withArray: { items: ['item1', 'item2', 'item3'] },
  withObject: { config: { key: 'value', nested: { deep: true } } },
};

/**
 * Generate an array of mock items
 *
 * @param factory - Factory function to create each item
 * @param count - Number of items to generate
 * @returns Array of mock items
 *
 * @example
 * ```typescript
 * const users = generateMockArray(() => createMockUser(), 10);
 * ```
 */
export function generateMockArray<T>(
  factory: (index: number) => T,
  count: number
): T[] {
  return Array.from({ length: count }, (_, i) => factory(i));
}
