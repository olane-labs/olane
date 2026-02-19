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
}

// Runtime detection: use native AsyncLocalStorage if available (Node, Deno, Bun, CF Workers).
// Falls back to a simple variable for browsers/React Native where concurrent
// multi-user requests don't happen.
// Uses synchronous require() instead of top-level await import() for Hermes compatibility.
let nativeALS: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('node:async_hooks');
  nativeALS = new mod.AsyncLocalStorage();
} catch {
  // Not available — browser or React Native runtime
}

// Browser fallback state
let currentStore: ORequestStore | undefined;

export const oRequestContext = {
  run<T>(store: ORequestStore, fn: () => T): T {
    if (nativeALS) {
      return nativeALS.run(store, fn);
    }
    // Browser fallback: simple variable swap (safe for single-user environments)
    const prev = currentStore;
    currentStore = store;
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => { currentStore = prev; }) as T;
      }
      currentStore = prev;
      return result;
    } catch (e) {
      currentStore = prev;
      throw e;
    }
  },

  getStore(): ORequestStore | undefined {
    if (nativeALS) {
      return nativeALS.getStore();
    }
    return currentStore;
  },

  getAuth(): ORequestAuthContext | undefined {
    return oRequestContext.getStore()?.auth;
  },

  getTokenManager(): oTokenManager | undefined {
    return oRequestContext.getStore()?.tokenManager;
  },
};
