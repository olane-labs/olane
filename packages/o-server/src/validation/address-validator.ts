import { ValidationError } from './validation-error.js';

/**
 * Validates address strings to prevent path traversal and injection attacks
 *
 * Security checks:
 * - Path traversal prevention (../, ..\\, URL-encoded variants)
 * - o:// protocol format validation
 * - Control character blocking (null bytes, newlines, etc.)
 *
 * @param address - The address string to validate
 * @throws {ValidationError} If validation fails
 */
export function validateAddress(address: string): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(
      'Invalid address: must be a non-empty string',
      'INVALID_ADDRESS'
    );
  }

  // Block path traversal - literal patterns
  if (address.includes('../') || address.includes('..\\')) {
    throw new ValidationError(
      'Invalid address: path traversal detected',
      'INVALID_ADDRESS'
    );
  }

  // Block path traversal - URL-encoded variants
  // %2e = '.', so %2e%2e = '..'
  const lowerAddress = address.toLowerCase();
  if (lowerAddress.includes('%2e%2e') || lowerAddress.includes('%252e')) {
    throw new ValidationError(
      'Invalid address: path traversal detected',
      'INVALID_ADDRESS'
    );
  }

  // Validate o:// format
  if (!address.startsWith('o://')) {
    throw new ValidationError(
      'Invalid address: must start with o://',
      'INVALID_ADDRESS'
    );
  }

  // Block control characters (0x00-0x1F and 0x7F)
  // These include null bytes, newlines, tabs, etc.
  if (/[\x00-\x1F\x7F]/.test(address)) {
    throw new ValidationError(
      'Invalid address: control characters not allowed',
      'INVALID_ADDRESS'
    );
  }

  // Block other dangerous patterns
  if (address.includes('\\')) {
    throw new ValidationError(
      'Invalid address: backslashes not allowed',
      'INVALID_ADDRESS'
    );
  }
}
