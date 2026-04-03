import { createOContext } from '@olane/o-context';
import type { oTokenManager } from '../auth/o-token-manager.js';

export interface ORequestAuthContext {
  token: string;
  claims: {
    sub?: string;
    iss?: string;
    aud?: string | string[];
    exp?: number;
    [key: string]: any;
  };
}

export interface ORequestStore {
  auth?: ORequestAuthContext;
  tokenManager?: oTokenManager;
  requestId?: string;
}

const ctx = createOContext<ORequestStore>();

export const oRequestContext = {
  run<T>(store: ORequestStore, fn: () => T): T {
    return ctx.run(store, fn);
  },

  getStore(): ORequestStore | undefined {
    return ctx.getStore();
  },

  getAuth(): ORequestAuthContext | undefined {
    return oRequestContext.getStore()?.auth;
  },

  getTokenManager(): oTokenManager | undefined {
    return oRequestContext.getStore()?.tokenManager;
  },

  getRequestId(): string | undefined {
    return oRequestContext.getStore()?.requestId;
  },
};
