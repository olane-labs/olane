import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../interfaces/response.interface.js';

export interface OlaneError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

export function errorHandler(
  err: OlaneError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error('[o-server] Error:', err);

  const status = err.status || 500;
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An internal error occurred',
      details: process.env.NODE_ENV === 'development' ? err.details : undefined,
    },
  };

  res.status(status).json(errorResponse);
}
