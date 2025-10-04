import { Request, Response, NextFunction } from 'express';
import {
  AuthenticateFunction,
  AuthUser,
} from '../interfaces/server-config.interface.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(authenticate: AuthenticateFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authenticate(req);
      req.user = user;
      next();
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message || 'Authentication failed',
        },
      });
    }
  };
}
