import { OlaneError } from '../middleware/error-handler.js';

/**
 * Custom error class for validation failures
 * Extends Error and implements OlaneError interface for consistency
 */
export class ValidationError extends Error implements OlaneError {
  code: string;
  status: number;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.status = 400; // All validation errors are 400 Bad Request
  }
}
