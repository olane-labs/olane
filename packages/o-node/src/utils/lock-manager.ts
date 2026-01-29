/**
 * Promise-based lock manager for handling concurrent access to critical sections
 * Supports named locks for fine-grained concurrency control
 */
export class LockManager {
  private locks: Map<string, Promise<void>> = new Map();
  private lockStates: Map<string, boolean> = new Map();
  private resolvers: Map<string, () => void> = new Map();

  /**
   * Acquire a named lock, waiting if necessary
   * @param lockName - Unique identifier for the lock
   * @param timeoutMs - Optional timeout in milliseconds
   * @throws Error if timeout is reached
   */
  async acquire(lockName: string, timeoutMs?: number): Promise<void> {
    // Wait for any existing lock to be released
    while (this.lockStates.get(lockName)) {
      const currentLock = this.locks.get(lockName);
      if (currentLock) {
        if (timeoutMs) {
          await Promise.race([
            currentLock,
            new Promise<void>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Lock timeout: ${lockName}`)),
                timeoutMs,
              ),
            ),
          ]);
        } else {
          await currentLock;
        }
      }
    }

    // Acquire the lock
    this.lockStates.set(lockName, true);
    const lockPromise = new Promise<void>((resolve) => {
      this.resolvers.set(lockName, resolve);
    });
    this.locks.set(lockName, lockPromise);
  }

  /**
   * Release a named lock
   * @param lockName - Unique identifier for the lock to release
   */
  release(lockName: string): void {
    const resolver = this.resolvers.get(lockName);
    if (resolver) {
      resolver();
      this.resolvers.delete(lockName);
    }
    this.lockStates.set(lockName, false);
  }

  /**
   * Execute a function with automatic lock acquisition/release
   * @param lockName - Unique identifier for the lock
   * @param fn - Async function to execute while holding the lock
   * @param timeoutMs - Optional timeout for lock acquisition
   * @returns The result of the function execution
   */
  async withLock<T>(
    lockName: string,
    fn: () => Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    await this.acquire(lockName, timeoutMs);
    try {
      return await fn();
    } finally {
      this.release(lockName);
    }
  }

  /**
   * Check if a lock is currently held
   * @param lockName - Unique identifier for the lock
   * @returns true if the lock is currently held
   */
  isLocked(lockName: string): boolean {
    return this.lockStates.get(lockName) ?? false;
  }

  /**
   * Clear all locks (for teardown/reset)
   * Resolves any pending waiters
   */
  clearAll(): void {
    // Resolve any pending waiters
    for (const lockName of this.lockStates.keys()) {
      this.release(lockName);
    }
    this.locks.clear();
    this.lockStates.clear();
    this.resolvers.clear();
  }

  /**
   * Get statistics about current lock states (useful for debugging)
   * @returns Object containing lock statistics
   */
  getStats(): {
    totalLocks: number;
    activeLocks: number;
    lockNames: string[];
  } {
    const activeLocks = Array.from(this.lockStates.entries()).filter(
      ([_, isLocked]) => isLocked,
    );

    return {
      totalLocks: this.lockStates.size,
      activeLocks: activeLocks.length,
      lockNames: activeLocks.map(([name]) => name),
    };
  }
}
