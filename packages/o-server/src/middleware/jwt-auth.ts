import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { OlaneError } from './error-handler.js';

/**
 * JWT verification configuration
 */
export interface JwtConfig {
  /** JWT verification method: 'publicKey' (RS256) or 'secret' (HS256) */
  method: 'publicKey' | 'secret';

  /** Secret key for HS256 verification (required if method='secret') */
  secret?: string;

  /** Path to public key PEM file for RS256 verification (required if method='publicKey') */
  publicKeyPath?: string;

  /** Expected issuer (iss claim) - optional */
  issuer?: string;

  /** Expected audience (aud claim) - optional */
  audience?: string;

  /** Allowed algorithms - defaults to ['RS256'] for publicKey, ['HS256'] for secret */
  algorithms?: jwt.Algorithm[];

  /** Clock tolerance in seconds for exp/nbf validation - default 0 */
  clockTolerance?: number;
}

/**
 * JWT token payload added to Express request
 */
export interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [key: string]: any;
}

// Extend Express Request type to include JWT payload
declare global {
  namespace Express {
    interface Request {
      jwt?: JwtPayload;
    }
  }
}

/**
 * Creates JWT authentication middleware
 *
 * @param config - JWT configuration
 * @returns Express middleware function
 *
 * @throws {OlaneError} MISSING_TOKEN - No Authorization header present
 * @throws {OlaneError} INVALID_TOKEN_FORMAT - Malformed token (not "Bearer <token>")
 * @throws {OlaneError} TOKEN_EXPIRED - Token exp claim in the past
 * @throws {OlaneError} TOKEN_NOT_ACTIVE - Token nbf claim in the future
 * @throws {OlaneError} INVALID_TOKEN - Signature verification failed or invalid structure
 */
export function createJwtMiddleware(config: JwtConfig) {
  // Validate configuration
  if (!config.method) {
    throw new Error('JWT method is required (publicKey or secret)');
  }

  if (config.method === 'secret' && !config.secret) {
    throw new Error('JWT secret is required when method is "secret"');
  }

  if (config.method === 'publicKey' && !config.publicKeyPath) {
    throw new Error('JWT publicKeyPath is required when method is "publicKey"');
  }

  // Load verification key
  let verificationKey: string | Buffer;
  if (config.method === 'publicKey') {
    try {
      verificationKey = readFileSync(config.publicKeyPath!, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to read public key file: ${error.message}`);
    }
  } else {
    verificationKey = config.secret!;
  }

  // Set default algorithms based on method
  const algorithms = config.algorithms || (config.method === 'publicKey' ? ['RS256'] : ['HS256']);

  // Build verify options
  const verifyOptions: jwt.VerifyOptions = {
    algorithms,
    clockTolerance: config.clockTolerance || 0,
  };

  if (config.issuer) {
    verifyOptions.issuer = config.issuer;
  }

  if (config.audience) {
    verifyOptions.audience = config.audience;
  }

  // Return middleware function
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        const error: OlaneError = new Error('No authorization token provided');
        error.code = 'MISSING_TOKEN';
        error.status = 401;
        throw error;
      }

      // Validate Bearer format
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        const error: OlaneError = new Error('Invalid authorization format. Expected: Bearer <token>');
        error.code = 'INVALID_TOKEN_FORMAT';
        error.status = 401;
        throw error;
      }

      const token = parts[1];

      // Verify token
      try {
        const decoded = jwt.verify(token, verificationKey, verifyOptions) as JwtPayload;

        // Additional validation for standard claims
        const now = Math.floor(Date.now() / 1000);

        // Check expiration (if not already checked by jwt.verify)
        if (decoded.exp && decoded.exp <= now - (config.clockTolerance || 0)) {
          const error: OlaneError = new Error('Token has expired');
          error.code = 'TOKEN_EXPIRED';
          error.status = 401;
          throw error;
        }

        // Check not before
        if (decoded.nbf && decoded.nbf > now + (config.clockTolerance || 0)) {
          const error: OlaneError = new Error('Token is not yet valid');
          error.code = 'TOKEN_NOT_ACTIVE';
          error.status = 401;
          throw error;
        }

        // Check subject exists
        if (!decoded.sub) {
          const error: OlaneError = new Error('Token missing required claim: sub');
          error.code = 'INVALID_TOKEN';
          error.status = 401;
          throw error;
        }

        // Attach decoded payload to request
        req.jwt = decoded;

        // Also attach to req.user for backward compatibility
        if (!req.user) {
          req.user = {
            userId: decoded.sub,
            ...decoded,
          };
        }

        next();
      } catch (error: any) {
        // Handle jwt.verify errors
        if (error.name === 'TokenExpiredError') {
          const err: OlaneError = new Error('Token has expired');
          err.code = 'TOKEN_EXPIRED';
          err.status = 401;
          throw err;
        }

        if (error.name === 'NotBeforeError') {
          const err: OlaneError = new Error('Token is not yet valid');
          err.code = 'TOKEN_NOT_ACTIVE';
          err.status = 401;
          throw err;
        }

        if (error.name === 'JsonWebTokenError') {
          const err: OlaneError = new Error(`Invalid token: ${error.message}`);
          err.code = 'INVALID_TOKEN';
          err.status = 401;
          throw err;
        }

        // Re-throw if already an OlaneError
        if (error.code) {
          throw error;
        }

        // Generic invalid token error
        const err: OlaneError = new Error('Token verification failed');
        err.code = 'INVALID_TOKEN';
        err.status = 401;
        throw err;
      }
    } catch (error: any) {
      // Pass error to error handler
      next(error);
    }
  };
}
