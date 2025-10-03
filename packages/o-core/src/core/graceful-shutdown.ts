import { Logger } from '../utils/logger.js';

export interface CleanupFunction {
  (): Promise<void> | void;
}

export interface GracefulShutdownOptions {
  timeout?: number; // Timeout in milliseconds for cleanup operations
  logger?: Logger;
  onTimeout?: () => void;
}

/**
 * Sets up signal handlers for graceful shutdown
 * @param cleanup Cleanup function to run on shutdown
 * @param options Configuration options for graceful shutdown
 */
export function setupGracefulShutdown(
  cleanup: CleanupFunction,
  options: GracefulShutdownOptions = {},
): void {
  const {
    timeout = 30000, // 30 seconds default timeout
    logger = new Logger('GracefulShutdown'),
    onTimeout,
  } = options;

  let isShuttingDown = false;

  const performCleanup = async (signal: string) => {
    if (isShuttingDown) {
      logger.debug('Shutdown already in progress, skipping...');
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, initiating graceful shutdown...`);

    try {
      // Set up timeout for cleanup operations
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Cleanup timeout after ${timeout}ms`));
        }, timeout);
      });

      // Perform cleanup with timeout
      await Promise.race([Promise.resolve(cleanup()), timeoutPromise]);

      logger.info('Graceful shutdown completed successfully');
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);

      if (onTimeout) {
        onTimeout();
      }
    } finally {
      logger.info('Process exiting');
      process.exit(0);
    }
  };

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => performCleanup('SIGINT'));

  // Handle SIGTERM (termination signal)
  process.on('SIGTERM', () => performCleanup('SIGTERM'));

  // Handle SIGUSR2 (Node.js restart signal)
  process.on('SIGUSR2', () => performCleanup('SIGUSR2'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    performCleanup('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    performCleanup('unhandledRejection');
  });

  // Handle process exit (synchronous cleanup)
  process.on('exit', (code) => {
    logger.info(`Process exiting with code: ${code}`);
  });
}

/**
 * Creates a cleanup function that stops multiple resources
 * @param resources Array of resources with stop methods
 * @param logger Logger instance for logging
 */
export function createMultiResourceCleanup(
  resources: Array<{ stop(): Promise<void> | void; address?: string }>,
  logger: Logger = new Logger('MultiResourceCleanup'),
): CleanupFunction {
  return async () => {
    logger.info(`Stopping ${resources.length} resources...`);

    const stopPromises = resources.map(async (resource) => {
      try {
        const resourceName = resource.address || resource.constructor.name;
        logger.debug(`Stopping resource: ${resourceName}`);
        await Promise.resolve(resource.stop());
        logger.debug(`Successfully stopped resource: ${resourceName}`);
      } catch (error) {
        const resourceName = resource.address || resource.constructor.name;
        logger.error(`Error stopping resource ${resourceName}:`, error);
      }
    });

    await Promise.allSettled(stopPromises);
    logger.info('All resources stopped');
  };
}
