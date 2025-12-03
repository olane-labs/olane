/**
 * Assertion helpers for O-Network testing
 *
 * Provides type-safe, expressive assertions for common test scenarios
 */

import { NodeState, oResponse } from '@olane/o-core';

/**
 * Assert that a tool response indicates success
 *
 * @param response - Tool method response (oResponse)
 * @param message - Optional custom error message
 * @throws Error if response is not successful
 *
 * @example
 * ```typescript
 * const response = await tool.use(address, { method: 'test', params: {} });
 * assertSuccess(response);
 * ```
 */
export function assertSuccess(
  response: oResponse,
  message?: string
): asserts response is oResponse & { result: { success: true } } {
  if (!response.result.success) {
    const errorMsg = message || `Expected success but got error: ${response.result.error}`;
    throw new Error(errorMsg);
  }
}

/**
 * Assert that a tool response indicates failure
 *
 * @param response - Tool method response (oResponse)
 * @param expectedError - Optional substring to match in error message
 * @throws Error if response is successful or error doesn't match
 *
 * @example
 * ```typescript
 * const response = await tool.use(address, { method: 'test', params: {} });
 * assertError(response, 'required');
 * ```
 */
export function assertError(
  response: oResponse,
  expectedError?: string
): asserts response is oResponse & { result: { success: false } } {
  if (response.result.success) {
    throw new Error('Expected error but got success');
  }

  const errorMessage = typeof response.result.error === 'string'
    ? response.result.error
    : response.result.error?.message || JSON.stringify(response.result.error);

  if (expectedError && !errorMessage?.includes(expectedError)) {
    throw new Error(
      `Expected error to include "${expectedError}" but got: ${errorMessage}`
    );
  }
}

/**
 * Assert that a node is in running state
 *
 * @param node - Node instance
 * @param message - Optional custom error message
 * @throws Error if node is not running
 *
 * @example
 * ```typescript
 * assertRunning(tool);
 * ```
 */
export function assertRunning(
  node: any,
  message?: string
): void {
  if (node.state !== NodeState.RUNNING) {
    const errorMsg = message || `Expected node to be RUNNING but got ${node.state}`;
    throw new Error(errorMsg);
  }
}

/**
 * Assert that a node is in stopped state
 *
 * @param node - Node instance
 * @param message - Optional custom error message
 * @throws Error if node is not stopped
 *
 * @example
 * ```typescript
 * await tool.stop();
 * assertStopped(tool);
 * ```
 */
export function assertStopped(
  node: any,
  message?: string
): void {
  if (node.state !== NodeState.STOPPED) {
    const errorMsg = message || `Expected node to be STOPPED but got ${node.state}`;
    throw new Error(errorMsg);
  }
}

/**
 * Assert that response has data
 *
 * @param response - Tool method response (oResponse)
 * @param message - Optional custom error message
 * @throws Error if response doesn't have data
 *
 * @example
 * ```typescript
 * const response = await tool.use(address, { method: 'get_data', params: {} });
 * assertHasData(response);
 * const data = response.result.data;
 * ```
 */
export function assertHasData(
  response: oResponse,
  message?: string
): asserts response is oResponse & { result: { data: any } } {
  if (!response.result?.data) {
    const errorMsg = message || 'Expected response to have result.data';
    throw new Error(errorMsg);
  }
}

/**
 * Assert that a value is defined (not null or undefined)
 *
 * @param value - Value to check
 * @param name - Name of the value for error message
 * @throws Error if value is null or undefined
 *
 * @example
 * ```typescript
 * assertDefined(user, 'user');
 * // Now TypeScript knows user is not null/undefined
 * ```
 */
export function assertDefined<T>(
  value: T,
  name: string = 'value'
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${name} to be defined but got ${value}`);
  }
}

/**
 * Assert that an array has expected length
 *
 * @param array - Array to check
 * @param expectedLength - Expected length
 * @param message - Optional custom error message
 * @throws Error if length doesn't match
 *
 * @example
 * ```typescript
 * assertArrayLength(items, 5);
 * ```
 */
export function assertArrayLength(
  array: any[],
  expectedLength: number,
  message?: string
): void {
  if (array.length !== expectedLength) {
    const errorMsg = message ||
      `Expected array length ${expectedLength} but got ${array.length}`;
    throw new Error(errorMsg);
  }
}

/**
 * Assert that an object has a property
 *
 * @param obj - Object to check
 * @param property - Property name
 * @param message - Optional custom error message
 * @throws Error if property doesn't exist
 *
 * @example
 * ```typescript
 * assertHasProperty(response.result.data, 'userId');
 * ```
 */
export function assertHasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  property: K,
  message?: string
): asserts obj is T & Record<K, unknown> {
  if (!(property in obj)) {
    const errorMsg = message ||
      `Expected object to have property "${String(property)}"`;
    throw new Error(errorMsg);
  }
}

/**
 * Assert that a value matches one of the expected values
 *
 * @param value - Value to check
 * @param expectedValues - Array of expected values
 * @param message - Optional custom error message
 * @throws Error if value doesn't match any expected value
 *
 * @example
 * ```typescript
 * assertOneOf(status, ['pending', 'active', 'completed']);
 * ```
 */
export function assertOneOf<T>(
  value: T,
  expectedValues: T[],
  message?: string
): void {
  if (!expectedValues.includes(value)) {
    const errorMsg = message ||
      `Expected one of [${expectedValues.join(', ')}] but got ${value}`;
    throw new Error(errorMsg);
  }
}

/**
 * Create a custom assertion
 *
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 * @throws Error if condition is false
 *
 * @example
 * ```typescript
 * assert(user.age >= 18, 'User must be 18 or older');
 * ```
 */
export function assert(
  condition: boolean,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
