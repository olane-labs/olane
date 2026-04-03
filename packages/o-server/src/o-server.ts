import { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import {
  ServerConfig,
  ServerInstance,
} from './interfaces/server-config.interface.js';
import { SuccessResponse } from './interfaces/response.interface.js';
import { errorHandler, OlaneError } from './middleware/error-handler.js';
import { authMiddleware } from './middleware/auth.js';
import { createJwtMiddleware } from './middleware/jwt-auth.js';
import { ServerLogger } from './utils/logger.js';
import {
  oAddress,
  oRequestContext,
  ORequestAuthContext,
  ORequestStore,
} from '@olane/o-core';
import { randomUUID } from 'crypto';
import { Server } from 'http';
import {
  validateAddress,
  validateMethod,
  sanitizeParams,
  validateRequest,
  useRequestSchema,
  streamRequestSchema,
} from './validation/index.js';

export function oServer(config: ServerConfig): ServerInstance {
  const {
    node,
    port = 3000,
    basePath = '/api/v1',
    cors: corsConfig,
    authenticate,
    jwtAuth,
    debug = false,
  } = config;

  const app: Express = express();
  const logger = new ServerLogger(debug);
  let server: Server | null = null;

  /**
   * Build auth context from a JWT-verified Express request.
   * Returns undefined if no JWT is present (e.g. JWT auth is disabled).
   */
  function buildAuthFromRequest(req: Request): ORequestAuthContext | undefined {
    if (!req.jwt) return undefined;

    // Extract raw token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    return {
      token,
      claims: req.jwt,
    };
  }

  /**
   * Remove any client-injected _auth from params (anti-spoofing).
   * Server-verified auth is injected separately.
   */
  function stripClientAuth(params: any): any {
    if (!params || typeof params !== 'object') return params;
    const { _auth, _trace, ...rest } = params;
    return rest;
  }

  /**
   * Deep-strip internal fields (_auth, _trace) from response data before
   * sending to HTTP client. Prevents leaking tokens and trace metadata.
   */
  function stripInternalFields(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object')
      return obj;
    if (Array.isArray(obj)) return obj.map(stripInternalFields);

    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === '_auth' || key === '_trace') continue;
      result[key] = stripInternalFields(obj[key]);
    }
    return result;
  }

  // Middleware
  app.use(express.json());

  if (corsConfig) {
    app.use(cors(corsConfig));
  }

  // JWT authentication (mandatory, except for health endpoint)
  if (jwtAuth) {
    const jwtMiddleware = createJwtMiddleware(jwtAuth);

    // Apply JWT middleware to all routes except health
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path === `${basePath}/health`) {
        return next(); // Skip JWT for health check
      }
      return jwtMiddleware(req, res, next);
    });
  } else if (authenticate) {
    // Deprecated: Legacy authentication support
    logger.log(
      '⚠️  WARNING: The "authenticate" parameter is deprecated. Please migrate to "jwtAuth".',
    );
    app.use(basePath, authMiddleware(authenticate));
  }

  // Health check endpoint
  app.get(`${basePath}/health`, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: Date.now(),
      },
    });
  });

  // Primary endpoint - POST /api/v1/use
  // This is the main entrypoint that wraps the node's 'use' method
  app.post(`${basePath}/use`, async (req: Request, res: Response, next) => {
    try {
      // Validate request schema
      const validated = validateRequest(req.body, useRequestSchema);
      const { address: addressStr, method, params, id } = validated;

      // Validate address
      validateAddress(addressStr);

      // Validate method
      validateMethod(method);

      // Strip client-injected _auth before sanitization (anti-spoofing)
      const strippedParams = stripClientAuth(params);

      // Sanitize params
      const sanitizedParams = sanitizeParams(strippedParams);

      // Build server-verified auth from JWT
      const auth = buildAuthFromRequest(req);

      // Inject _auth into params if JWT is present
      const finalParams = auth
        ? { ...sanitizedParams, _auth: auth }
        : sanitizedParams;

      logger.debugLog(
        `Calling use with address ${addressStr}, method: ${method}`,
      );

      const address = new oAddress(addressStr);

      // Generate a short request ID for tracing across the call chain
      const requestId = randomUUID().replace(/-/g, '').substring(0, 8);
      const store: ORequestStore = { requestId };
      if (auth) store.auth = auth;

      const result = await oRequestContext.run(store, () =>
        node.use(address, { method, params: finalParams, id }),
      );

      const response: SuccessResponse = {
        success: true,
        data: stripInternalFields(result.result),
      };

      res.json(response);
    } catch (error: any) {
      handleOlaneError(error, next);
    }
  });

  // Convenience endpoint for tool calls - POST /api/v1/:address/:method
  // This provides a more REST-like interface but still uses the node's 'use' method
  app.post(
    `${basePath}/:address/:method`,
    async (req: Request, res: Response, next) => {
      try {
        const { address: addressParam, method } = req.params;
        const params = req.body;

        // Construct full address
        const addressStr = `o://${addressParam}`;

        // Validate address
        validateAddress(addressStr);

        // Validate method
        validateMethod(method as string);

        // Strip client-injected _auth before sanitization (anti-spoofing)
        const strippedParams = stripClientAuth(params);

        // Sanitize params
        const sanitizedParams = sanitizeParams(strippedParams);

        // Build server-verified auth from JWT
        const auth = buildAuthFromRequest(req);

        // Inject _auth into params if JWT is present
        const finalParams = auth
          ? { ...sanitizedParams, _auth: auth }
          : sanitizedParams;

        logger.debugLog(
          `Calling method ${method} on ${addressParam} with params:`,
          sanitizedParams,
        );

        const address = new oAddress(addressStr);

        // Generate a short request ID for tracing across the call chain
        const requestId = randomUUID().replace(/-/g, '').substring(0, 8);
        const store: ORequestStore = { requestId };
        if (auth) store.auth = auth;

        const result = await oRequestContext.run(store, () =>
          node.use(address, { method: method as string, params: finalParams }),
        );

        const response: SuccessResponse = {
          success: true,
          data: stripInternalFields(result.result),
        };

        res.json(response);
      } catch (error: any) {
        handleOlaneError(error, next);
      }
    },
  );

  // Streaming endpoint - POST /api/v1/use/stream
  app.post(
    `${basePath}/use/stream`,
    async (req: Request, res: Response, next) => {
      try {
        // Validate request schema
        const validated = validateRequest(req.body, streamRequestSchema);
        const { address: addressStr, method, params } = validated;

        // Validate address
        validateAddress(addressStr);

        // Validate method
        validateMethod(method);

        // Strip client-injected _auth before sanitization (anti-spoofing)
        const strippedParams = stripClientAuth(params);

        // Sanitize params
        const sanitizedParams = sanitizeParams(strippedParams);

        // Build server-verified auth from JWT
        const auth = buildAuthFromRequest(req);

        // Inject _auth into params if JWT is present
        const finalParams = auth
          ? { ...sanitizedParams, _auth: auth }
          : sanitizedParams;

        logger.debugLog(
          `Streaming use call to ${addressStr}, method: ${method}`,
        );

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const address = new oAddress(addressStr);

        // Generate a short request ID for tracing across the call chain
        const requestId = randomUUID().replace(/-/g, '').substring(0, 8);
        const store: ORequestStore = { requestId };
        if (auth) store.auth = auth;

        try {
          // TODO: Implement actual streaming support when available
          // For now, execute and return result
          const result = await oRequestContext.run(store, () =>
            node.use(address, { method, params: finalParams }),
          );

          res.write(
            `data: ${JSON.stringify({
              type: 'complete',
              result: stripInternalFields(result.result),
            })}\n\n`,
          );

          res.end();
        } catch (error: any) {
          res.write(
            `data: ${JSON.stringify({
              type: 'error',
              error: {
                code: error.code || 'EXECUTION_ERROR',
                message: error.message,
              },
            })}\n\n`,
          );

          res.end();
        }
      } catch (error: any) {
        next(error);
      }
    },
  );

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Helper function to convert Olane errors to HTTP errors
  function handleOlaneError(error: any, next: NextFunction) {
    const olaneError: OlaneError = new Error(error.message || 'Unknown error');

    // Map common error scenarios
    if (error.code === 'NODE_NOT_FOUND') {
      olaneError.code = 'NODE_NOT_FOUND';
      olaneError.status = 404;
    } else if (error.code === 'TOOL_NOT_FOUND') {
      olaneError.code = 'TOOL_NOT_FOUND';
      olaneError.status = 404;
    } else if (error.code === 'INVALID_PARAMS') {
      olaneError.code = 'INVALID_PARAMS';
      olaneError.status = 400;
    } else if (error.code === 'TIMEOUT') {
      olaneError.code = 'TIMEOUT';
      olaneError.status = 504;
    } else if (error.message?.includes('not found')) {
      olaneError.code = 'NODE_NOT_FOUND';
      olaneError.status = 404;
    } else {
      olaneError.code = 'EXECUTION_ERROR';
      olaneError.status = 500;
    }

    // Only include stack traces and details in development mode
    olaneError.details =
      process.env.NODE_ENV === 'development'
        ? error.details || error.stack
        : undefined;
    next(olaneError);
  }

  // Server instance
  const instance: ServerInstance = {
    app,

    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          server = app.listen(port, () => {
            logger.log(`Server running on http://localhost:${port}${basePath}`);
            resolve();
          });

          server.on('error', reject);
        } catch (error) {
          reject(error);
        }
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }

        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            logger.log('Server stopped');
            resolve();
          }
        });
      });
    },
  };

  return instance;
}
