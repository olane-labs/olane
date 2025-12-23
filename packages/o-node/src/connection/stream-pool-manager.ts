import { EventEmitter } from 'events';
import { oObject, oRequest, oError, oErrorCodes } from '@olane/o-core';
import type { Stream } from '@olane/o-config';
import { oNodeConnectionStream } from './o-node-connection-stream.js';
import {
  StreamPoolEvent,
  StreamPoolEventData,
} from './stream-pool-manager.events.js';
import type {
  StreamPoolManagerConfig,
  StreamPoolStats,
} from './interfaces/stream-pool-manager.config.js';

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
 * - Event-based stream monitoring (listens to 'close' events)
 * - Automatic stream replacement when failures detected
 * - Event emission for monitoring and observability
 */
export class StreamPoolManager extends oObject {
  private streams: oNodeConnectionStream[] = [];
  private readonly POOL_SIZE: number;
  private readonly READER_STREAM_INDEX: number;

  private dedicatedReaderStream?: oNodeConnectionStream;
  private currentStreamIndex: number = 1; // Start from 1 (skip reader)

  private failureCount: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();
  private streamEventHandlers: Map<string, (event: any) => void> = new Map();

  private config: StreamPoolManagerConfig;
  private isInitialized: boolean = false;
  private isClosing: boolean = false;

  constructor(config: StreamPoolManagerConfig) {
    super();
    this.config = config;
    this.POOL_SIZE = config.poolSize || 10;
    this.READER_STREAM_INDEX = config.readerStreamIndex ?? 0;

    if (this.POOL_SIZE < 2) {
      throw new Error(
        'Pool size must be at least 2 (1 reader + 1 request-response)',
      );
    }
  }

  get backgroundReaderActive() {
    return this.dedicatedReaderStream?.isValid || false;
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

      // Set stream types and attach event listeners
      for (let i = 0; i < this.streams.length; i++) {
        const stream = this.streams[i];
        if (i === this.READER_STREAM_INDEX) {
          (stream.config as any).streamType = 'dedicated-reader';
        } else {
          (stream.config as any).streamType = 'request-response';
        }

        // Attach event listeners for monitoring
        this.attachStreamListeners(stream, i);
      }

      // Initialize dedicated reader
      await this.initializeBackgroundReader();

      this.isInitialized = true;
      this.emit(StreamPoolEvent.PoolInitialized, {
        poolSize: this.streams.length,
      });
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

    // Remove all event listeners from streams
    for (const stream of this.streams) {
      this.removeStreamListeners(stream);
    }

    // Close all streams (though they may not actually close due to reuse policy)
    await Promise.all(this.streams.map((s) => s.close()));

    this.streams = [];
    this.dedicatedReaderStream = undefined;
    this.streamEventHandlers.clear();
    this.isInitialized = false;
    this.isClosing = false;

    this.emit(StreamPoolEvent.PoolClosed);
    this.logger.info('Stream pool closed');
  }

  /**
   * Add event listener
   */
  on<K extends StreamPoolEvent>(
    event: K | string,
    listener: (data: StreamPoolEventData[K]) => void,
  ): void {
    this.eventEmitter.on(event as string, listener);
  }

  /**
   * Remove event listener
   */
  off<K extends StreamPoolEvent>(
    event: K | string,
    listener: (data: StreamPoolEventData[K]) => void,
  ): void {
    this.eventEmitter.off(event as string, listener);
  }

  /**
   * Emit event
   */
  private emit<K extends StreamPoolEvent>(
    event: K,
    data?: StreamPoolEventData[K],
  ): void {
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
        this.failureCount++;
        this.emit(StreamPoolEvent.ReaderFailed, {
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

    this.emit(StreamPoolEvent.ReaderStarted, {
      streamId: readerStream.p2pStream.id,
    });
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
      this.emit(StreamPoolEvent.ReaderRecovered, {
        failureCount: this.failureCount,
      });
    } catch (error: any) {
      this.logger.error('Failed to recover from reader failure:', error);
      this.emit(StreamPoolEvent.RecoveryFailed, {
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

      // Remove event listeners from old stream
      if (oldStream) {
        this.removeStreamListeners(oldStream);
      }

      // Create new stream
      const newStream = await this.config.createStream();
      (newStream.config as any).streamType = streamType;

      // Replace in pool
      this.streams[index] = newStream;

      // Attach event listeners to new stream
      this.attachStreamListeners(newStream, index);

      // Close old stream (if it exists and is valid)
      if (oldStream) {
        try {
          await oldStream.close();
        } catch (error: any) {
          this.logger.debug('Error closing old stream:', error.message);
        }
      }

      this.emit(StreamPoolEvent.StreamReplaced, { index, streamType });
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
   * Attach event listeners to a stream for monitoring
   */
  private attachStreamListeners(
    stream: oNodeConnectionStream,
    index: number,
  ): void {
    const streamId = stream.p2pStream.id;

    // Remove any existing listeners for this stream
    this.removeStreamListeners(stream);

    // Create close event handler
    const closeHandler = (event: any) => {
      this.handleStreamClose(index, event);
    };

    // Attach listener to underlying p2p stream
    stream.p2pStream.addEventListener('close', closeHandler);

    // Store handler for cleanup
    this.streamEventHandlers.set(streamId, closeHandler);

    this.logger.debug('Attached stream listeners', { index, streamId });
  }

  /**
   * Remove event listeners from a stream
   */
  private removeStreamListeners(stream: oNodeConnectionStream): void {
    const streamId = stream.p2pStream.id;
    const handler = this.streamEventHandlers.get(streamId);

    if (handler) {
      stream.p2pStream.removeEventListener('close', handler);
      this.streamEventHandlers.delete(streamId);
      this.logger.debug('Removed stream listeners', { streamId });
    }
  }

  /**
   * Handle stream close event - triggers immediate replacement
   */
  private handleStreamClose(index: number, event: any): void {
    const stream = this.streams[index];
    const streamId = stream?.p2pStream.id;
    const isReaderStream = index === this.READER_STREAM_INDEX;

    this.logger.warn('Stream closed event detected', {
      index,
      streamId,
      isReaderStream,
      error: event?.error?.message,
    });

    this.failureCount++;

    // Special handling for dedicated reader stream
    if (isReaderStream) {
      this.emit(StreamPoolEvent.ReaderFailed, {
        error: event?.error?.message || 'stream closed',
        failureCount: this.failureCount,
      });

      // Attempt automatic recovery
      this.handleReaderFailure().catch((recoveryError) => {
        this.logger.error(
          'Failed to recover from reader failure:',
          recoveryError,
        );
      });
    } else {
      // Request-response stream failure
      this.emit(StreamPoolEvent.StreamFailed, {
        index,
        streamId,
        error: event?.error?.message,
        failureCount: this.failureCount,
      });

      // Attempt automatic replacement
      this.replaceStream(index).catch((replaceError) => {
        this.logger.error('Failed to replace stream:', replaceError);
      });
    }
  }
}
