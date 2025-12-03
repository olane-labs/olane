/**
 * @olane/o-test - Generic testing utilities for O-Network
 *
 * Provides generic testing utilities, assertions, mocks, and fixtures.
 * Node-specific utilities (TestEnvironment, builders) have been moved to @olane/o-node/test/helpers
 */

// Utilities
export {
  waitFor,
  waitForAsync,
  sleep,
  ChunkCapture,
  // Assertions
  assertSuccess,
  assertError,
  assertRunning,
  assertStopped,
  assertHasData,
  assertDefined,
  assertArrayLength,
  assertHasProperty,
  assertOneOf,
  assert,
  // Mock factories
  generateId,
  createMockUser,
  createMockTask,
  createMockSession,
  createMockRequest,
  createMockSuccessResponse,
  createMockErrorResponse,
  generateMockArray,
} from './utils/index.js';

export {
  INVALID_PARAMS,
  VALID_PARAMS,
} from './utils/mock-factories.js';

// Fixtures
export {
  MOCK_USERS,
  MOCK_TASKS,
  MOCK_SESSIONS,
  MOCK_CONFIGS,
  MOCK_ADDRESSES,
  MOCK_ERRORS,
  MOCK_STREAM_CHUNKS,
  TEST_METHOD_SIMPLE,
  TEST_METHOD_COMPLEX,
  TEST_METHOD_VALIDATION,
  TEST_METHODS,
  getTestMethod,
  createTestMethod,
} from './fixtures/index.js';

// Re-export invalid/valid params from fixtures
export { INVALID_PARAMS as FIXTURE_INVALID_PARAMS } from './fixtures/mock-data.js';
export { VALID_PARAMS as FIXTURE_VALID_PARAMS } from './fixtures/mock-data.js';

// Note: example-tool.tool.ts and example.methods.ts are available in the src directory
// as reference implementations, but are not exported to avoid dependencies on o-node/o-lane
