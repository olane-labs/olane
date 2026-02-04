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
import { ServerLogger } from './utils/logger.js';
import { oAddress } from '@olane/o-core';
import { Server } from 'http';

export function oServer(config: ServerConfig): ServerInstance {
  const {
    node,
    port = 3000,
    basePath = '/api/v1',
    cors: corsConfig,
    authenticate,
    debug = false,
  } = config;

  const app: Express = express();
  const logger = new ServerLogger(debug);
  let server: Server | null = null;

  // Middleware
  app.use(express.json());

  if (corsConfig) {
    app.use(cors(corsConfig));
  }

  // Optional authentication
  if (authenticate) {
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
      const { address: addressStr, method, params, id } = req.body;

      if (!addressStr) {
        const error: OlaneError = new Error('Address is required');
        error.code = 'INVALID_PARAMS';
        error.status = 400;
        throw error;
      }

      logger.debugLog(
        `Calling use with address ${addressStr}, method: ${method}`,
      );

      const address = new oAddress(addressStr);
      const result = await node.use(address, {
        method,
        params,
        id,
      });

      const response: SuccessResponse = {
        success: true,
        data: result.result,
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

        logger.debugLog(
          `Calling method ${method} on ${addressParam} with params:`,
          params,
        );

        const address = new oAddress(`o://${addressParam}`);
        const result = await node.use(address, {
          method,
          params,
        });

        const response: SuccessResponse = {
          success: true,
          data: result.result,
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
        const { address: addressStr, method, params } = req.body;

        if (!addressStr) {
          const error: OlaneError = new Error('Address is required');
          error.code = 'INVALID_PARAMS';
          error.status = 400;
          throw error;
        }

        logger.debugLog(
          `Streaming use call to ${addressStr}, method: ${method}`,
        );

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const address = new oAddress(addressStr);

        try {
          // TODO: Implement actual streaming support when available
          // For now, execute and return result
          const result = await node.use(address, {
            method,
            params,
          });

          res.write(
            `data: ${JSON.stringify({
              type: 'complete',
              result: result.result,
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
