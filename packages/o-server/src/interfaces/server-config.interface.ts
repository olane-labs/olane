import { oCore } from '@olane/o-core';
import { Request } from 'express';
import { CorsOptions } from 'cors';
import { Algorithm } from 'jsonwebtoken';

export interface AuthUser {
  userId?: string;
  [key: string]: any;
}

export type AuthenticateFunction = (req: Request) => Promise<AuthUser>;

/**
 * JWT authentication configuration
 */
export interface JwtAuthConfig {
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
  algorithms?: Algorithm[];

  /** Clock tolerance in seconds for exp/nbf validation - default 0 */
  clockTolerance?: number;
}

export interface ServerConfig {
  /** Node instance (any oCore-based node with 'use' method) */
  node: oCore;

  /** Server port (default: 3000) */
  port?: number;

  /** Base path for API routes (default: '/api/v1') */
  basePath?: string;

  /** CORS configuration */
  cors?: CorsOptions;

  /**
   * @deprecated Use jwtAuth instead. Authentication middleware will be removed in future versions.
   * JWT authentication is now mandatory (except for /health endpoint).
   */
  authenticate?: AuthenticateFunction;

  /**
   * JWT authentication configuration.
   * When provided, JWT verification will be enforced on all routes except /health.
   *
   * @example
   * ```typescript
   * // RS256 with public key
   * jwtAuth: {
   *   method: 'publicKey',
   *   publicKeyPath: '/path/to/public-key.pem',
   *   issuer: 'https://auth.example.com',
   *   audience: 'https://api.example.com'
   * }
   *
   * // HS256 with secret
   * jwtAuth: {
   *   method: 'secret',
   *   secret: 'your-secret-key',
   *   clockTolerance: 5
   * }
   * ```
   */
  jwtAuth?: JwtAuthConfig;

  /** Enable debug logging */
  debug?: boolean;
}

export interface ServerInstance {
  /** Express app instance */
  app: any;

  /** Start the server */
  start(): Promise<void>;

  /** Stop the server */
  stop(): Promise<void>;
}
