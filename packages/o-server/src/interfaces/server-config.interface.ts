import { oCore } from '@olane/o-core';
import { Request } from 'express';
import { CorsOptions } from 'cors';

export interface AuthUser {
  userId?: string;
  [key: string]: any;
}

export type AuthenticateFunction = (req: Request) => Promise<AuthUser>;

export interface ServerConfig {
  /** Node instance (any oCore-based node with 'use' method) */
  node: oCore;

  /** Server port (default: 3000) */
  port?: number;

  /** Base path for API routes (default: '/api/v1') */
  basePath?: string;

  /** CORS configuration */
  cors?: CorsOptions;

  /** Authentication middleware */
  authenticate?: AuthenticateFunction;

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
