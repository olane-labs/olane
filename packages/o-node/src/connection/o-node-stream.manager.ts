import { EventEmitter } from 'events';
import type { Connection, Stream } from '@libp2p/interface';
import {
  oObject,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
  CoreUtils,
  ResponseBuilder,
} from '@olane/o-core';
import type { oRouterRequest, oConnection } from '@olane/o-core';
import type { RunResult } from '@olane/o-tool';
import { oNodeStream } from './o-node-stream.js';
import { StreamManagerConfig } from './interfaces/stream-manager.config.js';
import type { StreamHandlerConfig } from './stream-handler.config.js';
import {
  StreamManagerEvent,
  StreamManagerEventData,
} from './stream-manager.events.js';
import {
  StreamInitMessage,
  isStreamInitMessage,
  StreamInitAckMessage,
  isStreamInitAckMessage,
} from './interfaces/stream-init-message.js';
import { lpStream } from '@olane/o-config';
import JSON5 from 'json5';
import { v4 as uuidv4 } from 'uuid';

/**
 * oNodeStreamManager handles the lifecycle and tracking of streams for a single connection.
 * Features:
 * - Tracks all streams by ID
 * - Creates new streams on demand
 * - Manages stream lifecycle (cleanup after use)
 * - Provides events for monitoring
 * - No reuse at base layer (extensible in subclasses)
 */
export class oNodeStreamManager extends oObject {
  private streams: Map<string, oNodeStream> = new Map();
  protected eventEmitter: EventEmitter = new EventEmitter();
  public isInitialized: boolean = false;
  private p2pConnection: Connection;
  private activeStreamHandlers: Map<
    string,
    { stream: Stream; abortController: AbortController }
  > = new Map();
  protected callerReaderStream?: Stream; // Track reader stream from limited connection caller
  protected callerWriterStream?: Stream; // Track writer stream from limited connection caller
  private streamMonitoringIntervals: Map<string, NodeJS.Timeout> = new Map(); // Track monitoring intervals
  private id: string;

  constructor(readonly config: StreamManagerConfig) {
    const id = uuidv4();
    super('id:' + id);
    this.id = id;
    this.p2pConnection = config.p2pConnection;
  }

  /**
   * Initialize the stream manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('Stream manager already initialized');
      return;
    }

    try {
      // Stream manager is now initialized and ready to handle streams
      this.isInitialized = true;
      this.emit(StreamManagerEvent.ManagerInitialized, {});
      this.logger.info('Stream manager initialized', {
        remotePeer: this.p2pConnection.remotePeer.toString(),
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize stream manager:', error);
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `Failed to initialize stream manager: ${error.message}`,
      );
    }
  }

  /**
   * Gets or creates a stream for the connection
   * Always creates a new stream (no reuse at base layer)
   *
   * For limited connections (where caller has identified a reader stream):
   * - If callerReaderStream exists, wrap and return it for sending requests
   * - Otherwise, create new stream as normal
   *
   * @param protocol - The protocol string for the stream
   * @param remoteAddress - The remote address for the stream
   * @param config - Stream handler configuration
   * @returns Wrapped stream
   */
  async getOrCreateStream(
    protocol: string,
    remoteAddress: any,
    config: StreamHandlerConfig = {},
  ): Promise<oNodeStream> {
    this.logger.debug(
      'Getting or creating stream',
      this.callerReaderStream?.protocol,
      'and status',
      this.callerReaderStream?.status,
    );
    // If we have a caller's reader stream (from limited connection), use it for sending requests
    if (this.callerReaderStream && this.callerReaderStream.status === 'open') {
      this.logger.debug('Using caller reader stream for limited connection', {
        streamId: this.callerReaderStream.id,
      });

      // Wrap the reader stream for use (if not already wrapped)
      const existingWrapped = Array.from(this.streams.values()).find(
        (s) => s.p2pStream.id === this.callerReaderStream!.id,
      );

      if (existingWrapped) {
        return existingWrapped;
      }

      // Wrap the reader stream
      const wrappedStream = new oNodeStream(this.callerReaderStream, {
        direction: 'inbound', // It's inbound to us, we write to it
        reusePolicy: 'reuse',
        remoteAddress: remoteAddress,
        streamType: 'request-response',
      });

      this.streams.set(this.callerReaderStream.id, wrappedStream);
      return wrappedStream;
    }

    // Always create new stream (no reuse at base layer)
    return await this.createStream(protocol, remoteAddress, config);
  }

  /**
   * Creates a new stream from the connection
   *
   * @param protocol - The protocol string for the stream
   * @param remoteAddress - The remote address for the stream
   * @param config - Stream handler configuration
   * @returns Wrapped stream
   */
  async createStream(
    protocol: string,
    remoteAddress: any,
    config: StreamHandlerConfig = {},
  ): Promise<oNodeStream> {
    this.logger.debug('Creating new stream', {
      protocol,
      currentStreamCount: this.streams.size,
    });

    // Create stream from libp2p connection
    const stream = await this.p2pConnection.newStream(protocol, {
      signal: config.signal,
      maxOutboundStreams: config.maxOutboundStreams ?? 1000,
      runOnLimitedConnection: config.runOnLimitedConnection ?? true,
    });

    // Wrap in oNodeStream with metadata
    const wrappedStream = new oNodeStream(stream, {
      direction: 'outbound',
      reusePolicy: 'none', // Always none at base layer
      remoteAddress: remoteAddress,
      streamType: 'request-response',
    });

    // Track the stream
    this.streams.set(stream.id, wrappedStream);

    this.logger.debug('Stream created', {
      streamId: stream.id,
      protocol,
      totalStreams: this.streams.size,
    });

    return wrappedStream;
  }

  /**
   * Releases and cleans up a stream
   *
   * @param streamId - The ID of the stream to release
   */
  async releaseStream(streamId: string): Promise<void> {
    const wrappedStream = this.streams.get(streamId);

    if (!wrappedStream) {
      this.logger.debug('Stream not found for release', { streamId });
      return;
    }

    this.logger.debug('Releasing stream', { streamId });

    // Remove from tracking
    this.streams.delete(streamId);

    // Close the stream if still open
    if (wrappedStream.p2pStream.status === 'open') {
      try {
        await wrappedStream.p2pStream.close();
      } catch (error: any) {
        this.logger.debug('Error closing stream during release', {
          streamId,
          error: error.message,
        });
      }
    }

    this.logger.debug('Stream released', {
      streamId,
      remainingStreams: this.streams.size,
    });
  }

  /**
   * Gets all tracked streams
   *
   * @returns Array of wrapped streams
   */
  getAllStreams(): oNodeStream[] {
    return Array.from(this.streams.values());
  }

  /**
   * Gets a stream by its ID
   * Checks persistent caller streams (reader/writer) and tracked streams
   *
   * @param streamId - The ID of the stream to retrieve
   * @returns The libp2p Stream or undefined if not found
   */
  getStreamById(streamId: string): Stream | undefined {
    // Check caller writer stream
    if (this.callerWriterStream?.id === streamId) {
      return this.callerWriterStream;
    }

    // Check caller reader stream
    if (this.callerReaderStream?.id === streamId) {
      return this.callerReaderStream;
    }

    // Check tracked streams
    const wrappedStream = this.streams.get(streamId);
    return wrappedStream?.p2pStream;
  }

  /**
   * Sets up monitoring for stream closure and emits events when detected
   * Periodically checks stream status and cleans up when stream closes
   *
   * @param stream - The stream to monitor
   * @param role - The role of the stream ('reader' or 'writer')
   */
  private setupStreamCloseMonitoring(
    stream: Stream,
    role: 'reader' | 'writer',
  ): void {
    const streamId = stream.id;

    // Clear any existing monitoring for this stream
    const existingInterval = this.streamMonitoringIntervals.get(streamId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Check stream status every 5 seconds
    const interval = setInterval(() => {
      if (stream.status !== 'open') {
        this.logger.info(`Caller ${role} stream closed`, {
          streamId,
          status: stream.status,
          role,
        });

        // Emit stream closed event
        this.emit(StreamManagerEvent.StreamClosed, {
          streamId,
          role,
          status: stream.status,
        });

        // Clear the stream reference
        if (role === 'reader') {
          this.callerReaderStream = undefined;
          this.logger.info(
            'Limited connection reader stream closed, will create new streams for requests',
          );
        } else if (role === 'writer') {
          this.callerWriterStream = undefined;
          this.logger.info(
            'Limited connection writer stream closed, responses may be affected',
          );
        }

        // Stop monitoring this stream
        clearInterval(interval);
        this.streamMonitoringIntervals.delete(streamId);
      }
    }, 5000);

    // Track the interval for cleanup
    this.streamMonitoringIntervals.set(streamId, interval);

    this.logger.debug(`Started monitoring ${role} stream`, { streamId });
  }

  /**
   * Emits an async event and waits for the first listener to return a result
   * This enables event-based request handling with async responses
   */
  private async emitAsync<T>(event: StreamManagerEvent, data: any): Promise<T> {
    const listeners = this.eventEmitter.listeners(event);

    if (listeners.length === 0) {
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `No listener registered for event: ${event}`,
      );
    }

    // Call the first listener and await its response
    const listener = listeners[0] as (...args: any[]) => Promise<T>;
    return await listener(data);
  }

  /**
   * Detects if a decoded message is a request
   * Requests have a 'method' field and no 'result' field
   */
  isRequest(message: any): boolean {
    return typeof message?.method === 'string' && message.result === undefined;
  }

  /**
   * Detects if a decoded message is a response
   * Responses have a 'result' field and no 'method' field
   */
  isResponse(message: any): boolean {
    return message?.result !== undefined && message.method === undefined;
  }

  /**
   * Detects if a decoded message is a stream initialization message
   * Uses the imported type guard from stream-init-message.ts
   */
  isStreamInit(message: any): message is StreamInitMessage {
    return isStreamInitMessage(message);
  }

  /**
   * Handles a stream initialization message
   * Stores reference to caller's reader stream for bidirectional communication
   * Sends acknowledgment back to confirm stream registration
   *
   * @param message - The decoded stream init message
   * @param stream - The stream that sent the message
   */
  protected async handleStreamInitMessage(
    message: StreamInitMessage,
    stream: Stream,
  ): Promise<void> {
    try {
      if (message.role === 'reader') {
        this.callerReaderStream = stream;
        this.logger.info('Identified caller reader stream', {
          streamId: stream.id,
          connectionId: message.connectionId,
        });

        this.emit(StreamManagerEvent.StreamIdentified, {
          streamId: stream.id,
          role: message.role,
          connectionId: message.connectionId,
        });

        // Set up monitoring for reader stream closure
        this.setupStreamCloseMonitoring(stream, 'reader');
      } else if (message.role === 'writer') {
        this.callerWriterStream = stream;
        this.logger.info('Identified caller writer stream', {
          streamId: stream.id,
          connectionId: message.connectionId,
        });

        this.emit(StreamManagerEvent.StreamIdentified, {
          streamId: stream.id,
          role: message.role,
          connectionId: message.connectionId,
        });

        // Set up monitoring for writer stream closure
        this.setupStreamCloseMonitoring(stream, 'writer');
      }

      // Send acknowledgment back to caller
      const ackMessage: StreamInitAckMessage = {
        type: 'stream-init-ack',
        status: 'success',
        streamId: stream.id,
        role: message.role,
        timestamp: Date.now(),
      };

      const ackBytes = new TextEncoder().encode(JSON.stringify(ackMessage));
      await this.sendLengthPrefixed(stream, ackBytes, {});

      this.logger.debug('Sent stream-init-ack', {
        streamId: stream.id,
        role: message.role,
      });
    } catch (error: any) {
      this.logger.error('Failed to process stream-init message', error);

      // Try to send error acknowledgment
      try {
        const errorAck: StreamInitAckMessage = {
          type: 'stream-init-ack',
          status: 'error',
          streamId: stream.id,
          role: message.role,
          error: error.message,
          timestamp: Date.now(),
        };

        const errorAckBytes = new TextEncoder().encode(
          JSON.stringify(errorAck),
        );
        await this.sendLengthPrefixed(stream, errorAckBytes, {});
      } catch (ackError) {
        this.logger.error('Failed to send error acknowledgment', ackError);
      }

      throw error;
    }
  }

  /**
   * Extracts and parses JSON from various formats including:
   * - Already parsed objects
   * - Plain JSON
   * - Markdown code blocks (```json ... ``` or ``` ... ```)
   * - Mixed content with explanatory text
   * - JSON5 format (trailing commas, comments, unquoted keys, etc.)
   *
   * @param decoded - The decoded string that may contain JSON, or an already parsed object
   * @returns Parsed JSON object
   * @throws Error if JSON parsing fails even with JSON5 fallback
   */
  protected extractAndParseJSON(decoded: string | any): any {
    // If already an object (not a string), return it directly
    if (typeof decoded !== 'string') {
      return decoded;
    }

    let jsonString = decoded.trim();

    // Attempt standard JSON.parse first
    try {
      return JSON.parse(jsonString);
    } catch (jsonError: any) {
      this.logger.debug('Standard JSON parse failed, trying JSON5', {
        error: jsonError.message,
        position: jsonError.message.match(/position (\d+)/)?.[1],
        preview: jsonString,
      });

      // Fallback to JSON5 for more relaxed parsing
      try {
        return JSON5.parse(jsonString);
      } catch (json5Error: any) {
        // Enhanced error with context
        this.logger.error('JSON5 parse also failed', {
          originalError: jsonError.message,
          json5Error: json5Error.message,
          preview: jsonString.substring(0, 200),
          length: jsonString.length,
        });

        throw new Error(
          `Failed to parse JSON: ${jsonError.message}\nJSON5 also failed: ${json5Error.message}\nPreview: ${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}`,
        );
      }
    }
  }

  /**
   * Sends data through a stream using length-prefixed encoding (libp2p v3 best practice)
   * Each message is automatically prefixed with a varint indicating the message length
   * This ensures proper message boundaries and eliminates concatenation issues
   *
   * @param stream - The stream to send data through
   * @param data - The data to send
   * @param config - Configuration for timeout and other options
   */
  async sendLengthPrefixed(
    stream: Stream,
    data: Uint8Array,
    config: StreamHandlerConfig = {},
  ): Promise<void> {
    const lp = lpStream(stream);
    await lp.write(data, { signal: config.signal });
  }

  /**
   * Tracks an active stream handler
   */
  private trackStreamHandler(
    stream: Stream,
    abortController: AbortController,
  ): void {
    this.activeStreamHandlers.set(stream.id, { stream, abortController });
  }

  /**
   * Untracks a stream handler
   */
  private untrackStreamHandler(streamId: string): void {
    this.activeStreamHandlers.delete(streamId);
  }

  /**
   * Handles an incoming stream on the server side using length-prefixed protocol
   * Uses async read loops instead of event listeners (libp2p v3 best practice)
   * Processes complete messages with proper boundaries
   *
   * @param stream - The incoming stream
   * @param connection - The connection the stream belongs to
   */
  async handleIncomingStream(
    stream: Stream,
    connection: Connection,
  ): Promise<void> {
    const lp = lpStream(stream);
    const abortController = new AbortController();
    this.trackStreamHandler(stream, abortController);

    try {
      while (stream.status === 'open' && !abortController.signal.aborted) {
        // Read complete length-prefixed message
        const messageBytes = await lp.read();
        const decoded = new TextDecoder().decode(messageBytes.subarray());

        // Parse JSON (handles markdown blocks, mixed content, and JSON5)
        const message = this.extractAndParseJSON(decoded);

        if (this.isStreamInit(message)) {
          await this.handleStreamInitMessage(message, stream);
          // Continue reading for subsequent messages on this stream
        } else if (this.isRequest(message)) {
          await this.handleRequestMessage(message, stream, connection);
        } else if (this.isResponse(message)) {
          this.logger.warn(
            'Received response message on server-side stream, ignoring',
            message,
          );
        } else {
          this.logger.warn('Received unknown message type', message);
        }
      }
    } catch (error: any) {
      // Stream closed or error occurred
      if (stream.status === 'open') {
        this.logger.error('Error in length-prefixed stream handler:', error);
        this.emit(StreamManagerEvent.StreamError, {
          streamId: stream.id,
          error,
          context: 'incoming' as const,
        });
      }
    } finally {
      this.untrackStreamHandler(stream.id);
    }
  }

  /**
   * Determines which stream to use for sending the response
   * Checks for _streamId in request params and routes accordingly
   *
   * @param request - The incoming request
   * @param defaultStream - The stream the request came on (fallback)
   * @returns The stream to use for the response
   */
  protected getResponseStream(
    request: oRequest,
    defaultStream: Stream,
  ): Stream {
    const streamId = request.params._streamId;

    // If no explicit response stream specified, use the request stream (backward compatibility)
    if (!streamId) {
      return defaultStream;
    }

    // Check if the response stream is the identified caller writer stream
    if (this.callerWriterStream && this.callerWriterStream.id === streamId) {
      this.logger.debug('Routing response to caller writer stream', {
        requestId: request.id,
        streamId,
      });
      return this.callerWriterStream;
    }

    if (this.callerReaderStream && this.callerReaderStream.id === streamId) {
      this.logger.debug('Routing response to caller reader stream', {
        requestId: request.id,
        streamId,
      });
      return this.callerReaderStream;
    }

    // If specified stream not found, warn and fall back to request stream
    this.logger.warn(
      'Specified response stream not found, using request stream',
      {
        requestId: request.id,
        streamId,
      },
    );
    return defaultStream;
  }

  /**
   * Handles a request message by emitting an event and sending response
   *
   * @param message - The decoded request message
   * @param stream - The stream to send the response on
   * @param connection - The connection the stream belongs to
   */
  protected async handleRequestMessage(
    message: any,
    stream: Stream,
    connection: Connection,
  ): Promise<void> {
    const request = new oRequest(message);
    const responseBuilder = ResponseBuilder.create();

    // Determine which stream to use for the response
    const responseStream = this.getResponseStream(request, stream);

    try {
      // Emit InboundRequest event and wait for handler to process
      const result = await this.emitAsync<RunResult>(
        StreamManagerEvent.InboundRequest,
        {
          request,
          stream,
          connection,
        },
      );

      const response = await responseBuilder.build(request, result, null);
      await CoreUtils.sendResponse(response, responseStream);

      this.logger.debug(
        `Successfully processed request: method=${request.method}, id=${request.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error processing request: method=${request.method}, id=${request.id}`,
        error,
      );
      const errorResponse = await responseBuilder.buildError(request, error);
      await CoreUtils.sendResponse(errorResponse, responseStream);

      this.emit(StreamManagerEvent.StreamError, {
        streamId: stream.id,
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'incoming' as const,
      });
    }
  }

  /**
   * Handles an outgoing stream on the client side using length-prefixed protocol
   * Uses async read loops to process responses with proper message boundaries
   *
   * @param stream - The outgoing stream
   * @param emitter - Event emitter for chunk events
   * @param config - Configuration including abort signal
   * @param requestId - Optional request ID to filter responses (for stream reuse scenarios)
   * @returns Promise that resolves with the final response
   */
  async handleOutgoingStream(
    stream: Stream,
    emitter: EventEmitter,
    config: StreamHandlerConfig = {},
    requestId?: string | number,
  ): Promise<oResponse> {
    const lp = lpStream(stream);
    const abortController = new AbortController();
    this.trackStreamHandler(stream, abortController);

    // Combine external signal with our internal abort controller
    const combinedSignal = config.signal
      ? AbortSignal.any([config.signal, abortController.signal])
      : abortController.signal;

    try {
      while (stream.status === 'open' && !combinedSignal.aborted) {
        this.logger.debug('Waiting for response...');
        // Read complete length-prefixed message
        const messageBytes = await lp.read({ signal: combinedSignal });
        const decoded = new TextDecoder().decode(messageBytes.subarray());

        // Parse JSON (handles markdown blocks, mixed content, and JSON5)
        const message = this.extractAndParseJSON(decoded);

        if (this.isResponse(message)) {
          const response = new oResponse({
            ...message.result,
            id: message.id,
          });

          // Filter by request ID if provided
          if (requestId !== undefined && response.id !== requestId) {
            this.logger.debug(
              `Ignoring response for different request (expected: ${requestId}, received: ${response.id})`,
            );
            continue;
          }

          // Emit chunk for streaming responses
          emitter.emit('chunk', response);

          // Check if this is the last chunk
          if (response.result._last || !response.result._isStreaming) {
            return response;
          }
        } else if (this.isRequest(message)) {
          // Process incoming router requests via event emission
          const hasListeners =
            this.eventEmitter.listenerCount(StreamManagerEvent.InboundRequest) >
            0;
          if (hasListeners) {
            this.logger.debug(
              'Received router request on client-side stream, processing...',
              message,
            );
            // Use handleRequestMessage which emits the InboundRequest event
            await this.handleRequestMessage(
              message,
              stream,
              this.p2pConnection,
            );
          } else {
            this.logger.warn(
              'Received request message on client-side stream, ignoring (no handler)',
              message,
            );
          }
        } else {
          this.logger.warn('Received unknown message type', message);
        }
      }

      throw new oError(
        oErrorCodes.TIMEOUT,
        'Stream closed before response received',
      );
    } catch (error: any) {
      this.emit(StreamManagerEvent.StreamError, {
        streamId: stream.id,
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'outgoing' as const,
      });

      if (combinedSignal.aborted) {
        throw new oError(oErrorCodes.TIMEOUT, 'Request aborted');
      }
      throw error;
    } finally {
      this.untrackStreamHandler(stream.id);
    }
  }

  /**
   * Forwards a request to the next hop and relays response chunks back
   * This implements the middleware/proxy pattern for intermediate nodes
   *
   * @param request - The router request to forward
   * @param incomingStream - The stream to send responses back on
   * @param dialFn - Function to dial the next hop connection
   */
  async forwardRequest(
    request: oRouterRequest,
    incomingStream: Stream,
    dialFn: (address: string) => Promise<oConnection>,
  ): Promise<void> {
    try {
      // Connect to next hop
      const nextHopConnection = await dialFn(request.params.address);

      // Set up chunk relay - forward responses from next hop back to incoming stream
      nextHopConnection.onChunk(async (response: oResponse) => {
        try {
          await CoreUtils.sendResponse(response, incomingStream);
        } catch (error: any) {
          this.logger.error('Error forwarding chunk:', error);
        }
      });

      // Transmit the request to next hop
      await nextHopConnection.transmit(request);
    } catch (error: any) {
      this.logger.error('Error forwarding request:', error);

      // Send error response back on incoming stream using ResponseBuilder
      const responseBuilder = ResponseBuilder.create();
      const errorResponse = await responseBuilder.buildError(request, error);
      await CoreUtils.sendResponse(errorResponse, incomingStream);
    }
  }

  /**
   * Close the stream manager and cleanup resources
   */
  async close(): Promise<void> {
    this.logger.info('Closing stream manager', {
      activeStreams: this.streams.size,
      activeHandlers: this.activeStreamHandlers.size,
      monitoringIntervals: this.streamMonitoringIntervals.size,
    });

    // Clear all stream monitoring intervals
    for (const [
      streamId,
      interval,
    ] of this.streamMonitoringIntervals.entries()) {
      clearInterval(interval);
      this.logger.debug('Cleared monitoring interval', { streamId });
    }
    this.streamMonitoringIntervals.clear();

    // Abort all active stream handlers
    for (const [
      streamId,
      { abortController },
    ] of this.activeStreamHandlers.entries()) {
      abortController.abort();
    }
    this.activeStreamHandlers.clear();

    // Close all tracked streams
    const closePromises = Array.from(this.streams.values()).map(
      async (wrappedStream) => {
        try {
          if (wrappedStream.p2pStream.status === 'open') {
            await wrappedStream.p2pStream.close();
          }
        } catch (error: any) {
          this.logger.debug('Error closing stream during manager close', {
            streamId: wrappedStream.p2pStream.id,
            error: error.message,
          });
        }
      },
    );

    await Promise.all(closePromises);

    // Clear tracking
    this.streams.clear();
    this.isInitialized = false;

    this.emit(StreamManagerEvent.ManagerClosed, undefined);
    this.logger.info('Stream manager closed');
  }

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
