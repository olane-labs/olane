import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../interfaces/response.interface.js';

export interface OlaneError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Map of error codes to production-safe error messages
 * These messages are generic and don't leak sensitive information
 */
const PRODUCTION_ERROR_MESSAGES: Record<string, string> = {
  NODE_NOT_FOUND: 'The requested resource was not found',
  TOOL_NOT_FOUND: 'The requested tool was not found',
  INVALID_PARAMS: 'Invalid parameters provided',
  TIMEOUT: 'The request timed out',
  EXECUTION_ERROR: 'An error occurred while processing your request',
  INTERNAL_ERROR: 'An internal error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
};

/**
 * Sanitizes error message for production use
 * Removes sensitive information and returns a generic message
 */
export function sanitizeErrorMessage(code: string, originalMessage: string): string {
  // In production, use generic messages from the map
  if (process.env.NODE_ENV !== 'development') {
    return PRODUCTION_ERROR_MESSAGES[code] || PRODUCTION_ERROR_MESSAGES.INTERNAL_ERROR;
  }

  // In development, return the original message
  return originalMessage;
}

/**
 * Global error handler middleware
 * Sanitizes errors for production and provides detailed errors in development
 */
export function errorHandler(
  err: OlaneError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Log the full error server-side (never sent to client)
  console.error('[o-server] Error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    details: err.details,
  });

  const status = err.status || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: sanitizeErrorMessage(errorCode, err.message || 'An internal error occurred'),
      details: process.env.NODE_ENV === 'development' ? err.details : undefined,
    },
  };

  res.status(status).json(errorResponse);
}
