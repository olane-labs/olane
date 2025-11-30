/**
 * @olane/o-test - Testing utilities for O-Network nodes
 *
 * Provides comprehensive testing utilities, builders, and fixtures
 * to eliminate boilerplate in O-Network package tests.
 */

// Core test environment
export { TestEnvironment } from './test-environment.js';
export type {
  TestNodeConfig,
  LeaderNodeOptions,
  ToolWithLeaderResult,
} from './test-environment.js';

// Test builders
export {
  SimpleNodeBuilder,
  LeaderChildBuilder,
  ManagerWorkerBuilder,
} from './builders/index.js';
export type { LeaderConfig, ManagerWorkerResult } from './builders/index.js';

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

export type { ToolResponse } from './utils/assertions.js';

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

// Example tool (for reference/templates)
export * from './example-tool.tool.js';
export * from './methods/example.methods.js';
