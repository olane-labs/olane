import type { Stream } from '@libp2p/interface';
import { oError, oErrorCodes } from '@olane/o-core';
import {
  oNodeStreamManager,
  StreamManagerEvent,
  oNodeStream,
  StreamManagerConfig,
  StreamInitMessage,
  StreamInitAckMessage,
  isStreamInitAckMessage,
  InboundRequestData,
} from '@olane/o-node';
import type { StreamHandlerConfig } from '@olane/o-node';
import { lpStream } from '@olane/o-config';

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
 * - Maintains dedicated reader stream for receiving all inbound data from receiver
 *   (both receiver-initiated requests and responses to limited client's outbound requests)
 * - Maintains dedicated writer stream for sending all outbound data to receiver
 *   (both responses to receiver's requests and limited client's outbound requests)
 * - No ephemeral streams - all communication uses persistent streams
 * - Single retry on reader failure
 * - No health checks (error handling on use)
 */
export class oLimitedStreamManager extends oNodeStreamManager {
  public readerStream?: oNodeStream;
  public writerStream?: oNodeStream; // Protected to allow access from oLimitedConnection
  private isReaderLoopActive: boolean = false;
  private readerLoopAbortController?: AbortController;
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

    // Register InboundRequest listener if requestHandler provided
    // This enables bidirectional communication - receiver can send requests to caller via reader stream
    if (this.limitedConfig.requestHandler) {
      this.eventEmitter.on(
        StreamManagerEvent.InboundRequest,
        async (data: InboundRequestData) => {
          try {
            const result = await this.limitedConfig.requestHandler!(
              data.request,
              data.stream,
            );
            return result;
          } catch (error: any) {
            this.logger.error(
              'Error in requestHandler for inbound request:',
              data.request.toString(),
              error,
            );
            throw error; // StreamManager will handle error response
          }
        },
      );

      this.logger.debug(
        'Registered InboundRequest handler for limited connection',
      );
    }

    try {
      // Create dedicated reader and writer streams
      await this.createReaderStream();
      await this.createWriterStream();

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
      await this.sendStreamInitMessage(this.readerStream.p2pStream, 'reader');

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
   * Creates and initializes the dedicated writer stream
   */
  private async createWriterStream(): Promise<void> {
    try {
      // Create writer stream using parent's createStream method
      this.writerStream = await this.createStream(
        this.limitedConfig.protocol,
        this.limitedConfig.remoteAddress,
        {},
      );

      // Send self-identification message
      await this.sendStreamInitMessage(this.writerStream.p2pStream, 'writer');

      this.eventEmitter.emit(StreamManagerEvent.WriterStarted, {
        streamId: this.writerStream.p2pStream.id,
      });

      this.logger.info('Writer stream created', {
        streamId: this.writerStream.p2pStream.id,
      });
    } catch (error: any) {
      this.logger.error('Failed to create writer stream:', error);
      throw error;
    }
  }

  /**
   * Sends stream initialization message to identify the stream role
   * Waits for acknowledgment from receiver before proceeding
   */
  private async sendStreamInitMessage(
    stream: Stream,
    role: 'reader' | 'writer',
  ): Promise<void> {
    const initMessage: StreamInitMessage = {
      type: 'stream-init',
      role,
      timestamp: Date.now(),
      connectionId: this.limitedConfig.p2pConnection.id,
    };

    const messageBytes = new TextEncoder().encode(JSON.stringify(initMessage));
    await this.sendLengthPrefixed(stream, messageBytes, {});

    this.logger.debug('Sent stream-init message, waiting for ack', {
      streamId: stream.id,
      role,
    });

    // Wait for acknowledgment with timeout
    const ackTimeout = 5000; // 5 seconds
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, ackTimeout);

    try {
      const lp = lpStream(stream);

      // Read acknowledgment message
      const ackBytes = await lp.read({ signal: abortController.signal });
      const ackDecoded = new TextDecoder().decode(ackBytes.subarray());
      const ackMessage = this.extractAndParseJSON(ackDecoded);

      // Validate acknowledgment
      if (!isStreamInitAckMessage(ackMessage)) {
        throw new oError(
          oErrorCodes.INTERNAL_ERROR,
          `Invalid stream-init-ack message received: ${JSON.stringify(ackMessage)}`,
        );
      }

      if (ackMessage.status === 'error') {
        throw new oError(
          oErrorCodes.INTERNAL_ERROR,
          `Stream initialization failed: ${ackMessage.error || 'Unknown error'}`,
        );
      }

      if (ackMessage.role !== role) {
        throw new oError(
          oErrorCodes.INTERNAL_ERROR,
          `Stream role mismatch: expected ${role}, got ${ackMessage.role}`,
        );
      }

      this.logger.info('Received stream-init-ack', {
        streamId: stream.id,
        role,
        ackStreamId: ackMessage.streamId,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new oError(
          oErrorCodes.TIMEOUT,
          `Stream initialization acknowledgment timeout after ${ackTimeout}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
      await this.handleIncomingStream(stream, this.limitedConfig.p2pConnection);
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
   * Override getOrCreateStream to use persistent writer stream for outbound requests
   * This eliminates ephemeral stream creation for limited connections
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

    // Use persistent writer stream for all outbound requests
    if (this.writerStream && this.writerStream.p2pStream.status === 'open') {
      this.logger.debug('Reusing writer stream for outbound request', {
        streamId: this.writerStream.p2pStream.id,
      });
      return this.writerStream;
    }

    // Writer stream should always be available after initialization
    throw new oError(
      oErrorCodes.INTERNAL_ERROR,
      'Writer stream not available or not open',
    );
  }

  /**
   * Override releaseStream to protect persistent streams from being closed
   * Persistent streams (reader/writer) should never be released via this method
   * Only closes streams that are not the dedicated reader or writer streams
   */
  async releaseStream(streamId: string): Promise<void> {
    // Check if this is a persistent stream - don't close those
    if (
      (this.readerStream && this.readerStream.p2pStream.id === streamId) ||
      (this.writerStream && this.writerStream.p2pStream.id === streamId)
    ) {
      this.logger.debug('Skipping release of persistent stream', { streamId });
      return;
    }

    // Close any other streams (should not occur in normal operation)
    this.logger.debug('Releasing non-persistent stream', { streamId });
    await super.releaseStream(streamId);
  }

  /**
   * Override getStreamById to check persistent streams first
   * Provides access to reader and writer streams by ID
   *
   * @param streamId - The ID of the stream to retrieve
   * @returns The libp2p Stream or undefined if not found
   */
  getStreamById(streamId: string): Stream | undefined {
    // Check our persistent streams first
    if (this.writerStream?.p2pStream.id === streamId) {
      return this.writerStream.p2pStream;
    }

    if (this.readerStream?.p2pStream.id === streamId) {
      return this.readerStream.p2pStream;
    }

    // Fall back to parent implementation (checks tracked ephemeral streams)
    return super.getStreamById(streamId);
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

    // Close writer stream
    if (this.writerStream) {
      try {
        await this.writerStream.p2pStream.close();
      } catch (error) {
        this.logger.warn('Error closing writer stream:', error);
      }
      this.writerStream = undefined;
    }

    this.eventEmitter.emit(StreamManagerEvent.ManagerClosed, undefined);
  }
}
