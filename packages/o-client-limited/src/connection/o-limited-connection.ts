import { oNodeConnection, StreamPoolManager } from '@olane/o-node';
import type { oNodeConnectionConfig } from '@olane/o-node';

/**
 * oLimitedConnection extends oNodeConnection with stream reuse and pool management.
 *
 * This is optimized for limited connections where creating new streams is expensive
 * (mobile clients, browsers, resource-constrained environments).
 *
 * Stream Pool Architecture (10 streams total):
 * - Stream 0: Dedicated background reader for incoming requests
 * - Streams 1-9: Round-robin pool for outgoing request-response cycles
 *
 * Features:
 * - Automatic recovery when dedicated reader fails
 * - Health monitoring of all pooled streams
 * - Automatic stream replacement on failure
 * - Event emission for monitoring (reader-failed, stream-replaced, etc.)
 *
 * Default Behavior:
 * - Uses 'reuse' stream policy by default
 * - Automatically initializes pool manager on first stream request
 */
export class oLimitedConnection extends oNodeConnection {
  private streamPoolManager?: StreamPoolManager;
  private poolInitialized = false;

  constructor(config: oNodeConnectionConfig) {
    const reusePolicy = config.reusePolicy ?? 'reuse';
    super({
      ...config,
      reusePolicy: reusePolicy,
    });
    this.reusePolicy = reusePolicy;
  }

  /**
   * Initialize the stream pool manager
   */
  private async initializePoolManager(): Promise<void> {
    if (this.poolInitialized || this.streamPoolManager) {
      return;
    }

    this.logger.debug('Initializing stream pool manager');

    this.streamPoolManager = new StreamPoolManager({
      poolSize: 10,
      readerStreamIndex: 0,
      healthCheckIntervalMs: 30000,
      streamHandler: this.streamHandler,
      p2pConnection: this.p2pConnection,
      requestHandler: this.config.requestHandler,
      createStream: async () => {
        return await super.getOrCreateStream();
      },
    });

    // Set up event listeners for monitoring
    this.streamPoolManager.on('reader-failed', (data: any) => {
      this.logger.warn('Stream pool reader failed', data);
    });

    this.streamPoolManager.on('reader-recovered', (data: any) => {
      this.logger.info('Stream pool reader recovered', data);
    });

    this.streamPoolManager.on('stream-replaced', (data: any) => {
      this.logger.info('Stream replaced in pool', data);
    });

    await this.streamPoolManager.initialize();
    this.poolInitialized = true;

    this.logger.info('Stream pool manager initialized successfully');
  }

  async getOrCreateStream(): Promise<any> {
    if (this.reusePolicy === 'reuse') {
      // Initialize pool manager on first call
      if (!this.poolInitialized) {
        await this.initializePoolManager();
      }

      // Delegate to pool manager for stream selection
      return await this.streamPoolManager!.getStream();
    }

    // Fallback to default behavior if reuse is not enabled
    return super.getOrCreateStream();
  }

  /**
   * Get stream pool statistics
   */
  getPoolStats() {
    return this.streamPoolManager?.getStats();
  }

  /**
   * Override close to cleanup pool manager
   */
  async close(): Promise<void> {
    this.logger.debug('Closing connection and stream pool manager');

    if (this.streamPoolManager) {
      await this.streamPoolManager.close();
      this.streamPoolManager = undefined;
    }

    this.poolInitialized = false;

    await super.close();
  }
}
