import { EventEmitter } from 'events';
import type { Connection } from '@libp2p/interface';
import { oObject, oRequest, oError, oErrorCodes } from '@olane/o-core';
import type { Stream } from '@olane/o-config';
import { oNodeConnectionStream } from './o-node-connection-stream.js';
import { StreamHandler } from './stream-handler.js';

export interface StreamPoolManagerConfig {
  /**
   * Pool size (total number of streams to maintain)
   * Default: 10 (1 dedicated reader + 9 request-response)
   */
  poolSize?: number;

  /**
   * Index of the dedicated reader stream in the pool
   * Default: 0
   */
  readerStreamIndex?: number;

  /**
   * Health check interval in milliseconds
   * Default: 30000 (30 seconds)
   */
  healthCheckIntervalMs?: number;

  /**
   * Stream handler for managing stream communication
   */
  streamHandler: StreamHandler;

  /**
   * P2P connection for creating streams
   */
  p2pConnection: Connection;

  /**
   * Request handler for incoming requests on the dedicated reader
   */
  requestHandler?: (request: oRequest, stream: Stream) => Promise<any>;

  /**
   * Function to create a new stream
   */
  createStream: () => Promise<oNodeConnectionStream>;
}

export interface StreamPoolStats {
  totalStreams: number;
  healthyStreams: number;
  readerStreamHealth: 'healthy' | 'unhealthy' | 'not-initialized';
  requestResponseStreams: number;
  failureCount: number;
  lastHealthCheck: number;
}

/**
 * StreamPoolManager manages a pool of reusable streams with automatic recovery.
 *
 * Architecture:
 * - Stream[0]: Dedicated reader for incoming requests (background loop)
 * - Streams[1-N]: Round-robin pool for outgoing request-response cycles
 *
 * Features:
 * - Automatic stream pool initialization
 * - Dedicated reader with automatic restart on failure
 * - Health monitoring with periodic validation
 * - Automatic stream replacement when failures detected
 * - Event emission for monitoring and observability
 */
export class StreamPoolManager extends oObject {
  private streams: oNodeConnectionStream[] = [];
  private readonly POOL_SIZE: number;
  private readonly READER_STREAM_INDEX: number;
  private readonly HEALTH_CHECK_INTERVAL_MS: number;

  private dedicatedReaderStream?: oNodeConnectionStream;
  private backgroundReaderActive: boolean = false;
  private currentStreamIndex: number = 1; // Start from 1 (skip reader)

  private healthCheckTimer?: NodeJS.Timeout;
  private failureCount: number = 0;
  private lastHealthCheck: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();

  private config: StreamPoolManagerConfig;
  private isInitialized: boolean = false;
  private isClosing: boolean = false;

  constructor(config: StreamPoolManagerConfig) {
    super();
    this.config = config;
    this.POOL_SIZE = config.poolSize || 10;
    this.READER_STREAM_INDEX = config.readerStreamIndex ?? 0;
    this.HEALTH_CHECK_INTERVAL_MS = config.healthCheckIntervalMs || 30000;

    if (this.POOL_SIZE < 2) {
      throw new Error(
        'Pool size must be at least 2 (1 reader + 1 request-response)',
      );
    }
  }

  /**
   * Initialize the stream pool and start the dedicated reader
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('Stream pool already initialized');
      return;
    }

    this.logger.info('Initializing stream pool', {
      poolSize: this.POOL_SIZE,
      readerIndex: this.READER_STREAM_INDEX,
    });

    try {
      // Spawn all streams in parallel
      const streamPromises: Promise<oNodeConnectionStream>[] = [];
      for (let i = 0; i < this.POOL_SIZE; i++) {
        streamPromises.push(this.config.createStream());
      }

      this.streams = await Promise.all(streamPromises);

      // Set stream types
      for (let i = 0; i < this.streams.length; i++) {
        const stream = this.streams[i];
        if (i === this.READER_STREAM_INDEX) {
          (stream.config as any).streamType = 'dedicated-reader';
        } else {
          (stream.config as any).streamType = 'request-response';
        }
      }

      // Initialize dedicated reader
      await this.initializeBackgroundReader();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      this.emit('pool-initialized', { poolSize: this.streams.length });
      this.logger.info('Stream pool initialized successfully', {
        totalStreams: this.streams.length,
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize stream pool:', error);
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `Failed to initialize stream pool: ${error.message}`,
      );
    }
  }

  /**
   * Get a stream for outgoing request-response cycles using round-robin selection
   */
  async getStream(): Promise<oNodeConnectionStream> {
    if (!this.isInitialized) {
      throw new oError(
        oErrorCodes.INVALID_STATE,
        'Stream pool not initialized. Call initialize() first.',
      );
    }

    if (this.streams.length < this.POOL_SIZE) {
      this.logger.warn('Stream pool not at full capacity', {
        current: this.streams.length,
        expected: this.POOL_SIZE,
      });
    }

    // Round-robin selection from request-response pool (skip reader stream)
    const requestResponsePoolSize = this.POOL_SIZE - 1;
    const selectedIndex =
      ((this.currentStreamIndex - 1) % requestResponsePoolSize) + 1;

    this.currentStreamIndex =
      selectedIndex === this.POOL_SIZE - 1 ? 1 : selectedIndex + 1;

    const selectedStream = this.streams[selectedIndex];

    // Validate stream health before returning
    if (!selectedStream.isValid) {
      this.logger.warn('Selected stream is not valid, attempting recovery', {
        index: selectedIndex,
      });
      await this.replaceStream(selectedIndex);
      return this.streams[selectedIndex];
    }

    return selectedStream;
  }

  /**
   * Get statistics about the stream pool
   */
  getStats(): StreamPoolStats {
    const healthyStreams = this.streams.filter((s) => s.isValid).length;
    const requestResponseStreams = this.streams.filter(
      (s) => s.isRequestResponse,
    ).length;

    let readerStreamHealth: 'healthy' | 'unhealthy' | 'not-initialized' =
      'not-initialized';
    if (this.dedicatedReaderStream) {
      readerStreamHealth = this.dedicatedReaderStream.isValid
        ? 'healthy'
        : 'unhealthy';
    }

    return {
      totalStreams: this.streams.length,
      healthyStreams,
      readerStreamHealth,
      requestResponseStreams,
      failureCount: this.failureCount,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Close the stream pool and cleanup resources
   */
  async close(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;
    this.logger.info('Closing stream pool', {
      totalStreams: this.streams.length,
    });

    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    // Mark background reader as inactive
    this.backgroundReaderActive = false;

    // Close all streams (though they may not actually close due to reuse policy)
    await Promise.all(this.streams.map((s) => s.close()));

    this.streams = [];
    this.dedicatedReaderStream = undefined;
    this.isInitialized = false;
    this.isClosing = false;

    this.emit('pool-closed');
    this.logger.info('Stream pool closed');
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    this.eventEmitter.emit(event, data);
  }

  /**
   * Initialize the background reader on the dedicated stream
   */
  private async initializeBackgroundReader(): Promise<void> {
    if (this.backgroundReaderActive) {
      this.logger.debug('Background reader already active');
      return;
    }

    const readerStream = this.streams[this.READER_STREAM_INDEX];
    if (!readerStream) {
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        'Reader stream not found in pool',
      );
    }

    if (!readerStream.isValid) {
      this.logger.warn('Reader stream is not valid, replacing it');
      await this.replaceStream(this.READER_STREAM_INDEX);
      return this.initializeBackgroundReader();
    }

    this.dedicatedReaderStream = readerStream;
    this.backgroundReaderActive = true;

    this.logger.info('Starting background reader', {
      streamId: readerStream.p2pStream.id,
    });

    // Get the raw p2p stream
    const p2pStream = readerStream.p2pStream;

    // Start the persistent read loop in the background
    this.config.streamHandler
      .handleIncomingStream(
        p2pStream,
        this.config.p2pConnection,
        async (request: oRequest, s: Stream) => {
          this.logger.debug(
            'Background reader received request:',
            request.method,
          );

          if (this.config.requestHandler) {
            return await this.config.requestHandler(request, s);
          }

          throw new Error(
            'No request handler configured for incoming requests',
          );
        },
      )
      .catch((error: any) => {
        this.logger.warn(
          'Background reader exited:',
          error?.message || 'stream closed',
        );
        this.backgroundReaderActive = false;
        this.failureCount++;
        this.emit('reader-failed', {
          error: error?.message,
          failureCount: this.failureCount,
        });

        // Attempt automatic recovery
        this.handleReaderFailure().catch((recoveryError) => {
          this.logger.error(
            'Failed to recover from reader failure:',
            recoveryError,
          );
        });
      });

    this.emit('reader-started', { streamId: readerStream.p2pStream.id });
  }

  /**
   * Handle dedicated reader failure with automatic recovery
   */
  private async handleReaderFailure(): Promise<void> {
    if (this.isClosing) {
      this.logger.debug('Pool is closing, skipping reader recovery');
      return;
    }

    this.logger.warn('Attempting to recover from reader failure');

    try {
      // Replace the failed reader stream
      await this.replaceStream(this.READER_STREAM_INDEX);

      // Reinitialize the background reader
      await this.initializeBackgroundReader();

      this.logger.info('Successfully recovered from reader failure');
      this.emit('reader-recovered', { failureCount: this.failureCount });
    } catch (error: any) {
      this.logger.error('Failed to recover from reader failure:', error);
      this.emit('recovery-failed', {
        error: error.message,
        failureCount: this.failureCount,
      });
      throw error;
    }
  }

  /**
   * Replace a stream at the given index
   */
  private async replaceStream(index: number): Promise<void> {
    this.logger.info('Replacing stream', { index });

    try {
      const oldStream = this.streams[index];
      const streamType = oldStream?.streamType || 'general';

      // Create new stream
      const newStream = await this.config.createStream();
      (newStream.config as any).streamType = streamType;

      // Replace in pool
      this.streams[index] = newStream;

      // Close old stream (if it exists and is valid)
      if (oldStream) {
        try {
          await oldStream.close();
        } catch (error: any) {
          this.logger.debug('Error closing old stream:', error.message);
        }
      }

      this.emit('stream-replaced', { index, streamType });
      this.logger.info('Stream replaced successfully', { index, streamType });
    } catch (error: any) {
      this.logger.error('Failed to replace stream:', error);
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `Failed to replace stream at index ${index}: ${error.message}`,
      );
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      return;
    }

    this.logger.debug('Starting health monitoring', {
      intervalMs: this.HEALTH_CHECK_INTERVAL_MS,
    });

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch((error) => {
        this.logger.error('Health check failed:', error);
      });
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Perform health check on all streams
   */
  private async performHealthCheck(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    this.lastHealthCheck = Date.now();
    const stats = this.getStats();

    this.logger.debug('Performing health check', stats);

    // Check dedicated reader
    if (!this.backgroundReaderActive && this.isInitialized) {
      this.logger.warn('Background reader is not active, attempting restart');
      try {
        await this.handleReaderFailure();
      } catch (error: any) {
        this.logger.error('Failed to restart background reader:', error);
      }
    }

    // Check request-response streams
    for (let i = 1; i < this.streams.length; i++) {
      const stream = this.streams[i];
      if (!stream.isValid) {
        this.logger.warn('Unhealthy stream detected', { index: i });
        try {
          await this.replaceStream(i);
        } catch (error: any) {
          this.logger.error('Failed to replace unhealthy stream:', error);
        }
      }
    }

    this.emit('health-check-completed', stats);
  }
}
