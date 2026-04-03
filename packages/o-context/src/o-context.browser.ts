import type { OContext } from './o-context.js';

export type { OContext } from './o-context.js';

/**
 * Create an `OContext<T>` using a simple variable swap.
 *
 * Safe for single-user environments (browsers, React Native) where there are
 * no concurrent requests.  Contains zero `node:` imports so bundlers like
 * Metro will never try to resolve Node-only modules.
 */
export function createOContext<T>(): OContext<T> {
  let currentStore: T | undefined;

  return {
    run<R>(store: T, fn: () => R): R {
      const prev = currentStore;
      currentStore = store;
      try {
        const result = fn();
        if (result instanceof Promise) {
          return result.finally(() => {
            currentStore = prev;
          }) as R;
        }
        currentStore = prev;
        return result;
      } catch (e) {
        currentStore = prev;
        throw e;
      }
    },
    getStore(): T | undefined {
      return currentStore;
    },
  };
}
