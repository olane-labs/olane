import { LockManager } from '../utils/lock-manager.js';

/**
 * Method decorator that automatically acquires and releases a lock
 * when the decorated method is called. Ensures only one invocation
 * of the method executes at a time.
 *
 * @param lockName - Optional custom lock name. If not provided,
 *                   defaults to "ClassName:methodName"
 * @param timeoutMs - Optional timeout for lock acquisition in milliseconds
 *
 * @example
 * class MyNode extends oNode {
 *   protected lockManager = new LockManager();
 *
 *   @Synchronized('register:leader')
 *   async registerLeader(): Promise<void> {
 *     // This method is automatically synchronized
 *   }
 * }
 */
export function Synchronized(lockName?: string, timeoutMs?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // Generate lock name if not provided
    const finalLockName =
      lockName || `${target.constructor.name}:${propertyKey}`;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Ensure lockManager exists on the instance
      const lockManager = this.lockManager as LockManager | undefined;
      if (!lockManager) {
        throw new Error(
          `LockManager not initialized on instance. ` +
            `Ensure 'protected lockManager = new LockManager()' is declared in ${target.constructor.name}`,
        );
      }

      // Execute the method with automatic lock management
      return lockManager.withLock(
        finalLockName,
        async () => {
          return originalMethod.apply(this, args);
        },
        timeoutMs,
      );
    };

    return descriptor;
  };
}
