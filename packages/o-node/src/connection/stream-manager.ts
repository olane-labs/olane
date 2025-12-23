import { EventEmitter } from 'events';
import { oObject, oError, oErrorCodes } from '@olane/o-core';
import { oNodeConnectionStream } from './o-node-connection-stream.js';
import { StreamManagerConfig } from './interfaces/stream-manager.config.js';
import {
  StreamManagerEvent,
  StreamManagerEventData,
} from './stream-manager.events.js';

/**
 * StreamManager handles the lifecycle and selection of streams for a single connection.
 * Features:
 * - Acts as a cache layer for stream reuse.
 */
export class StreamManager extends oObject {
  private streams: oNodeConnectionStream[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();
  private isInitialized: boolean = false;

  constructor(readonly config: StreamManagerConfig) {
    super();
  }

  /**
   * Initialize the stream pool and start the dedicated reader
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('Stream pool already initialized');
      return;
    }

    try {
      this.isInitialized = true;
      this.emit(StreamManagerEvent.ManagerInitialized, {});
    } catch (error: any) {
      this.logger.error('Failed to initialize stream pool:', error);
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `Failed to initialize stream pool: ${error.message}`,
      );
    }
  }

  /**
   * Close the stream pool and cleanup resources
   */
  async close(): Promise<void> {}

  /**
   * Add event listener
   */
  on<K extends StreamManagerEvent>(
    event: K | string,
    listener: (data: StreamManagerEventData[K]) => void,
  ): void {
    this.eventEmitter.on(event as string, listener);
  }

  /**
   * Remove event listener
   */
  off<K extends StreamManagerEvent>(
    event: K | string,
    listener: (data: StreamManagerEventData[K]) => void,
  ): void {
    this.eventEmitter.off(event as string, listener);
  }

  /**
   * Emit event
   */
  private emit<K extends StreamManagerEvent>(
    event: K,
    data?: StreamManagerEventData[K],
  ): void {
    this.eventEmitter.emit(event, data);
  }
}
