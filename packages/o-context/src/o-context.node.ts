import { AsyncLocalStorage } from 'node:async_hooks';
import type { OContext } from './o-context.js';

export type { OContext } from './o-context.js';

/**
 * Create an `OContext<T>` backed by Node.js `AsyncLocalStorage`.
 *
 * Each async call tree started via `run()` gets its own isolated store,
 * making this safe for concurrent requests on a server.
 */
export function createOContext<T>(): OContext<T> {
  const als = new AsyncLocalStorage<T>();

  return {
    run<R>(store: T, fn: () => R): R {
      return als.run(store, fn);
    },
    getStore(): T | undefined {
      return als.getStore();
    },
  };
}
