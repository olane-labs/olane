/**
 * Generic async context primitive.
 *
 * `run()` establishes a store for the duration of `fn` (and any async work it
 * spawns).  `getStore()` retrieves the current store from anywhere inside that
 * call tree.
 *
 * Platform-specific implementations live in `o-context.node.ts` (AsyncLocalStorage)
 * and `o-context.browser.ts` (simple variable swap).
 */
export interface OContext<T> {
  run<R>(store: T, fn: () => R): R;
  getStore(): T | undefined;
}
