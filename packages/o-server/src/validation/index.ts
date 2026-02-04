/**
 * Input Validation & Sanitization Module
 *
 * Provides comprehensive security validation for o-server endpoints:
 * - Address validation (path traversal, format, control chars)
 * - Method validation (private methods, prototype pollution)
 * - Parameter sanitization (recursive dangerous property removal)
 * - Request schema validation (Zod-based type safety)
 *
 * Part of Phase 1 Security - Wave 2 (Input Validation)
 */

export { ValidationError } from './validation-error.js';
export { validateAddress } from './address-validator.js';
export { validateMethod } from './method-validator.js';
export { sanitizeParams } from './params-sanitizer.js';
export {
  validateRequest,
  useRequestSchema,
  convenienceRequestSchema,
  streamRequestSchema,
} from './request-validator.js';
