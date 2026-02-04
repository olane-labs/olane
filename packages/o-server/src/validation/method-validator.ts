import { ValidationError } from './validation-error.js';

/**
 * List of method names that are blocked due to prototype pollution risks
 * These are checked case-insensitively
 */
const BLOCKED_METHODS = ['__proto__', 'constructor', 'prototype'];

/**
 * Validates method names to prevent prototype pollution and private method access
 *
 * Security checks:
 * - Private method blocking (methods starting with '_')
 * - Prototype pollution prevention (__proto__, constructor, prototype)
 * - Case-insensitive blocking
 *
 * @param method - The method name to validate
 * @throws {ValidationError} If validation fails
 */
export function validateMethod(method: string): void {
  if (!method || typeof method !== 'string') {
    throw new ValidationError(
      'Invalid method: must be a non-empty string',
      'INVALID_METHOD'
    );
  }

  // Block private methods (starting with underscore)
  if (method.startsWith('_')) {
    throw new ValidationError(
      'Invalid method: private methods not allowed',
      'INVALID_METHOD'
    );
  }

  // Block prototype pollution methods (case-insensitive)
  const lowerMethod = method.toLowerCase();
  const isBlocked = BLOCKED_METHODS.some(
    (blocked) => lowerMethod === blocked.toLowerCase()
  );

  if (isBlocked) {
    throw new ValidationError(
      'Invalid method: blocked method name',
      'INVALID_METHOD'
    );
  }

  // Block methods with control characters
  if (/[\x00-\x1F\x7F]/.test(method)) {
    throw new ValidationError(
      'Invalid method: control characters not allowed',
      'INVALID_METHOD'
    );
  }
}
