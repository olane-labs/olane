import type { Stream } from '@libp2p/interface';
import { oError, oErrorCodes } from '@olane/o-core';
import {
  oNodeStreamManager,
  StreamManagerEvent,
  oNodeStream,
  StreamManagerConfig,
  StreamInitMessage,
} from '@olane/o-node';
import type { StreamHandlerConfig } from '@olane/o-node';

/**
 * Extended configuration for limited stream manager
 */
export interface oLimitedStreamManagerConfig extends StreamManagerConfig {
  /**
   * Protocol string for creating streams
   */
  protocol: string;

  /**
   * Remote address for the connection
   */
  remoteAddress: any;

  /**
   * Optional request handler for bidirectional communication
   */
  requestHandler?: (request: any, stream: Stream) => Promise<any>;
}

/**
 * Limited Stream Manager handles stream lifecycle for limited connections
 * Features:
 * - Maintains dedicated reader stream for receiving requests from receiver
 * - Reuses outbound streams (no close after use)
 * - Single retry on reader failure
 * - No health checks (error handling on use)
 */
export class oLimitedStreamManager extends oNodeStreamManager {
  private readerStream?: oNodeStream;
  private isReaderLoopActive: boolean = false;
  private readerLoopAbortController?: AbortController;
  private outboundStream?: oNodeStream; // Single outbound stream for reuse
  private limitedConfig: oLimitedStreamManagerConfig;
  private closing: boolean = false;

  constructor(config: oLimitedStreamManagerConfig) {
    super(config);
    this.limitedConfig = config;
  }

  /**
   * Initialize the limited stream manager
   * Creates dedicated reader stream and starts background read loop
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await super.initialize();

    try {
      // Create dedicated reader stream
      await this.createReaderStream();

      this.isInitialized = true;

      this.logger.info('Limited stream manager initialized', {
        remotePeer: this.limitedConfig.p2pConnection.remotePeer.toString(),
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize limited stream manager:', error);
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `Failed to initialize limited stream manager: ${error.message}`,
      );
    }
  }

  /**
   * Creates and initializes the dedicated reader stream
   */
  private async createReaderStream(): Promise<void> {
    try {
      // Create reader stream using parent's createStream method
      this.readerStream = await this.createStream(
        this.limitedConfig.protocol,
        this.limitedConfig.remoteAddress,
        {},
      );

      // Send self-identification message
      await this.sendStreamInitMessage(this.readerStream.p2pStream);

      // Start background reader loop
      await this.startReaderLoop();

      this.eventEmitter.emit(StreamManagerEvent.ReaderStarted, {
        streamId: this.readerStream.p2pStream.id,
      });

      this.logger.info('Reader stream created and started', {
        streamId: this.readerStream.p2pStream.id,
      });
    } catch (error: any) {
      this.logger.error('Failed to create reader stream:', error);
      throw error;
    }
  }

  /**
   * Sends stream initialization message to identify this as a reader stream
   */
  private async sendStreamInitMessage(stream: Stream): Promise<void> {
    const initMessage: StreamInitMessage = {
      type: 'stream-init',
      role: 'reader',
      timestamp: Date.now(),
      connectionId: this.limitedConfig.p2pConnection.id,
    };

    const messageBytes = new TextEncoder().encode(JSON.stringify(initMessage));
    await this.sendLengthPrefixed(stream, messageBytes, {});

    this.logger.debug('Sent stream-init message', {
      streamId: stream.id,
      role: 'reader',
    });
  }

  /**
   * Starts the background reader loop
   * Continuously listens for incoming requests on the reader stream
   */
  private async startReaderLoop(): Promise<void> {
    if (!this.readerStream || this.isReaderLoopActive) {
      return;
    }

    this.isReaderLoopActive = true;
    this.readerLoopAbortController = new AbortController();

    // Start background task (don't await)
    this.runReaderLoop().catch((error) => {
      this.logger.error('Reader loop failed:', error);
      this.isReaderLoopActive = false;
    });
  }

  /**
   * Background reader loop implementation
   */
  private async runReaderLoop(): Promise<void> {
    if (!this.readerStream) {
      return;
    }

    const stream = this.readerStream.p2pStream;

    try {
      // Continuous read loop using parent's handleIncomingStream
      // This will process all incoming requests on the reader stream
      await this.handleIncomingStream(
        stream,
        this.limitedConfig.p2pConnection,
      );
    } catch (error: any) {
      if (!this.closing) {
        this.logger.error('Reader loop error, attempting recovery:', error);
        await this.recoverReaderStream();
      }
    } finally {
      this.isReaderLoopActive = false;
    }
  }

  /**
   * Attempts to recover the reader stream (single retry)
   */
  private async recoverReaderStream(): Promise<void> {
    try {
      this.logger.info('Attempting to recover reader stream...');

      // Close old stream if it exists
      if (this.readerStream) {
        try {
          await this.readerStream.p2pStream.close();
        } catch (e) {
          // Ignore close errors
        }
        this.readerStream = undefined;
      }

      // Try to recreate
      await this.createReaderStream();

      this.eventEmitter.emit(StreamManagerEvent.ReaderRecovered, {
        failureCount: 1,
      });

      this.logger.info('Reader stream recovered successfully');
    } catch (error: any) {
      this.logger.error('Reader stream recovery failed:', error);

      this.eventEmitter.emit(StreamManagerEvent.ReaderFailed, {
        error: error.message,
        failureCount: 1,
      });
    }
  }

  /**
   * Override getOrCreateStream to reuse outbound streams
   * Does not create new stream for every request
   * Auto-initializes on first use
   */
  async getOrCreateStream(
    protocol: string,
    remoteAddress: any,
    config: StreamHandlerConfig = {},
  ): Promise<oNodeStream> {
    // Auto-initialize on first use
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if we have an existing outbound stream that's still valid
    if (
      this.outboundStream &&
      this.outboundStream.p2pStream.status === 'open' &&
      this.outboundStream.p2pStream.writeStatus === 'writable'
    ) {
      this.logger.debug('Reusing existing outbound stream', {
        streamId: this.outboundStream.p2pStream.id,
      });
      return this.outboundStream;
    }

    // Create new outbound stream if none exists or current is invalid
    this.logger.debug('Creating new outbound stream (no valid stream to reuse)');
    this.outboundStream = await this.createStream(
      protocol,
      remoteAddress,
      config,
    );

    return this.outboundStream;
  }

  /**
   * Override releaseStream to NOT close the stream
   * Keep streams open for reuse
   */
  async releaseStream(streamId: string): Promise<void> {
    // Don't close the stream - just log that we're keeping it open
    this.logger.debug('Keeping stream open for reuse', { streamId });
    // Do NOT call super.releaseStream() as that would close the stream
  }

  /**
   * Close the stream manager and cleanup all resources
   */
  async close(): Promise<void> {
    if (this.closing) {
      return;
    }

    this.closing = true;

    this.logger.info('Closing limited stream manager');

    // Stop reader loop
    if (this.readerLoopAbortController) {
      this.readerLoopAbortController.abort();
    }
    this.isReaderLoopActive = false;

    // Close reader stream
    if (this.readerStream) {
      try {
        await this.readerStream.p2pStream.close();
      } catch (error) {
        this.logger.warn('Error closing reader stream:', error);
      }
      this.readerStream = undefined;
    }

    // Close outbound stream
    if (this.outboundStream) {
      try {
        await this.outboundStream.p2pStream.close();
      } catch (error) {
        this.logger.warn('Error closing outbound stream:', error);
      }
      this.outboundStream = undefined;
    }

    this.eventEmitter.emit(StreamManagerEvent.ManagerClosed, undefined);
  }
}
