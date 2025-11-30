/**
 * Wait for a condition to become true
 *
 * @param condition - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
 * @param intervalMs - Check interval in milliseconds (default: 100)
 * @returns Promise that resolves when condition is met or rejects on timeout
 *
 * @example
 * ```typescript
 * await waitFor(() => tool.isReady, 10000);
 * await waitFor(() => counter > 5, 3000, 50);
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        `Timeout: Condition not met after ${timeoutMs}ms`
      );
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

/**
 * Wait for an async condition to become true
 *
 * @param condition - Async function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
 * @param intervalMs - Check interval in milliseconds (default: 100)
 * @returns Promise that resolves when condition is met or rejects on timeout
 *
 * @example
 * ```typescript
 * await waitForAsync(async () => await db.isConnected(), 10000);
 * ```
 */
export async function waitForAsync(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (!(await condition())) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        `Timeout: Async condition not met after ${timeoutMs}ms`
      );
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * ```
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
