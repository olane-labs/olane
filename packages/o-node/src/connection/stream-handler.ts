import type { Connection, Stream } from '@libp2p/interface';
import { EventEmitter } from 'events';
import {
  oRequest,
  oResponse,
  CoreUtils,
  oError,
  oErrorCodes,
  Logger,
  ResponseBuilder,
} from '@olane/o-core';
import type { oRouterRequest } from '@olane/o-core';
import type { oConnection } from '@olane/o-core';
import type { RunResult } from '@olane/o-tool';
import type { StreamHandlerConfig } from './stream-handler.config.js';
import { lpStream, Multiaddr } from '@olane/o-config';
import JSON5 from 'json5';

/**
 * StreamHandler centralizes all stream-related functionality including:
 * - Message type detection (request vs response)
 * - Stream lifecycle management (create, reuse, close)
 * - Backpressure handling
 * - Request/response handling
 * - Stream routing for middleware nodes
 */
export class StreamHandler {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger('StreamHandler');
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
   * Decodes a stream message event into a JSON object
   */
  async decodeMessage(event: any): Promise<any> {
    return CoreUtils.processStream(event);
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
  private extractAndParseJSON(decoded: string | any): any {
    // If already an object (not a string), return it directly
    if (typeof decoded !== 'string') {
      return decoded;
    }

    let jsonString = decoded.trim();

    // Strip markdown code blocks (```json ... ``` or ``` ... ```)
    if (jsonString.includes('```')) {
      const codeBlockMatch = jsonString.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?```/,
      );
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }
    }

    // Extract JSON from mixed content (find first { to last })
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    // Attempt standard JSON.parse first
    try {
      return JSON.parse(jsonString);
    } catch (jsonError: any) {
      this.logger.debug('Standard JSON parse failed, trying JSON5', {
        error: jsonError.message,
        position: jsonError.message.match(/position (\d+)/)?.[1],
        preview: jsonString.substring(0, 200),
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
   * Gets an existing open stream or creates a new one based on reuse policy
   *
   * @param connection - The libp2p connection
   * @param protocol - The protocol to use for the stream
   * @param config - Stream handler configuration
   */
  async getOrCreateStream(
    connection: Connection,
    protocol: string,
    config: StreamHandlerConfig = {},
  ): Promise<Stream> {
    if (connection.status !== 'open') {
      throw new oError(oErrorCodes.INVALID_STATE, 'Connection not open');
    }

    const reusePolicy = config.reusePolicy ?? 'none';

    // Check for existing stream if reuse is enabled
    if (reusePolicy === 'reuse') {
      const existingStream = connection.streams.find(
        (stream) =>
          stream.status === 'open' &&
          stream.protocol === protocol &&
          stream.writeStatus === 'writable' &&
          stream.remoteReadStatus === 'readable', // protocol with 0 length seems to be a special state where connection has not made successful stream yet
      );

      if (existingStream) {
        this.logger.debug(
          'Reusing existing stream',
          existingStream.id,
          existingStream.direction,
        );
        return existingStream;
      }
    }

    // Create new stream
    const stream = await connection.newStream(protocol, {
      signal: config.signal,
      maxOutboundStreams: config.maxOutboundStreams ?? 1000,
      runOnLimitedConnection: config.runOnLimitedConnection ?? false,
    });
    return stream;
  }

  /**
   * Sends data through a stream with backpressure handling
   *
   * @param stream - The stream to send data through
   * @param data - The data to send
   * @param config - Configuration for timeout and other options
   */
  async send(
    stream: Stream,
    data: Uint8Array,
    config: StreamHandlerConfig = {},
  ): Promise<void> {
    // Send the data with backpressure handling (libp2p v3 best practice)
    const sent = stream.send(data);

    // If send() returns false, buffer is full - wait for drain
    if (!sent) {
      this.logger.debug('Stream buffer full, waiting for drain...');
      const drainTimeout = config.drainTimeoutMs ?? 30_000;

      await stream.onDrain({
        signal: AbortSignal.timeout(drainTimeout),
      });

      this.logger.debug('Stream drained successfully');
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
   * Closes a stream safely with error handling
   *
   * @param stream - The stream to close
   * @param config - Configuration including reuse policy
   */
  async close(stream: Stream, config: StreamHandlerConfig = {}): Promise<void> {
    // Don't close if reuse policy is enabled
    if (config.reusePolicy === 'reuse') {
      this.logger.debug('Stream reuse enabled, not closing stream');
      return;
    }

    if (stream.status === 'open') {
      try {
        // force the close for now until we can implement a proper close
        await stream.abort(new Error('Stream closed'));
      } catch (error: any) {
        this.logger.debug('Error closing stream:', error.message);
      }
    }
  }

  /**
   * Handles an incoming stream on the server side using length-prefixed protocol
   * Uses async read loops instead of event listeners (libp2p v3 best practice)
   * Processes complete messages with proper boundaries
   *
   * @param stream - The incoming stream
   * @param connection - The connection the stream belongs to
   * @param toolExecutor - Function to execute tools for requests
   */
  async handleIncomingStreamLP(
    stream: Stream,
    connection: Connection,
    toolExecutor: (request: oRequest, stream: Stream) => Promise<RunResult>,
  ): Promise<void> {
    const lp = lpStream(stream);

    try {
      while (stream.status === 'open') {
        // Read complete length-prefixed message
        const messageBytes = await lp.read();
        const decoded = new TextDecoder().decode(messageBytes.subarray());

        // Parse JSON (handles markdown blocks, mixed content, and JSON5)
        const message = this.extractAndParseJSON(decoded);

        if (this.isRequest(message)) {
          await this.handleRequestMessage(message, stream, toolExecutor, true);
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
      }
    }
  }

  /**
   * Handles an incoming stream on the server side
   * Attaches message listener immediately (libp2p v3 best practice)
   * Routes requests or executes tools based on the message
   *
   * @param stream - The incoming stream
   * @param connection - The connection the stream belongs to
   * @param toolExecutor - Function to execute tools for requests
   * @param config - Configuration to determine protocol handling
   */
  async handleIncomingStream(
    stream: Stream,
    connection: Connection,
    toolExecutor: (request: oRequest, stream: Stream) => Promise<RunResult>,
    config: StreamHandlerConfig = {},
  ): Promise<void> {
    // Route to length-prefixed handler if enabled
    if (config.useLengthPrefixing) {
      return this.handleIncomingStreamLP(stream, connection, toolExecutor);
    }

    // CRITICAL: Attach message listener immediately to prevent buffer overflow (libp2p v3)
    const messageHandler = async (event: any) => {
      try {
        // avoid processing non-olane messages
        if (!event.data) {
          return;
        }
        const message = await this.decodeMessage(event);
        if (typeof message === 'string') {
          return;
        }

        if (this.isRequest(message)) {
          await this.handleRequestMessage(message, stream, toolExecutor);
        } else if (this.isResponse(message)) {
          this.logger.warn(
            'Received response message on server-side stream, ignoring',
            message,
          );
        } else {
          this.logger.warn('Received unknown message type', message);
        }
      } catch (error: any) {
        this.logger.error('Error handling stream message:', error);
        // Error already logged, stream will be closed by remote peer or timeout
      }
    };

    const closeHandler = () => {
      stream.removeEventListener('message', messageHandler);
      stream.removeEventListener('close', closeHandler);
    };

    stream.addEventListener('message', messageHandler);
    stream.addEventListener('close', closeHandler);
  }

  /**
   * Handles a request message by executing the tool and sending response
   *
   * @param message - The decoded request message
   * @param stream - The stream to send the response on
   * @param toolExecutor - Function to execute the tool
   * @param useLengthPrefixing - Whether to use length-prefixed response encoding
   */
  private async handleRequestMessage(
    message: any,
    stream: Stream,
    toolExecutor: (request: oRequest, stream: Stream) => Promise<RunResult>,
    useLengthPrefixing: boolean = false,
  ): Promise<void> {
    const request = new oRequest(message);
    const responseBuilder = ResponseBuilder.create();

    try {
      // this.logger.debug(
      //   `Processing request on stream: method=${request.method}, id=${request.id}`,
      // );
      const result = await toolExecutor(request, stream);
      const response = await responseBuilder.build(request, result, null);

      // Use length-prefixed encoding if enabled
      if (useLengthPrefixing) {
        await CoreUtils.sendResponseLP(response, stream);
      } else {
        await CoreUtils.sendResponse(response, stream);
      }

      this.logger.debug(
        `Successfully processed request: method=${request.method}, id=${request.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error processing request: method=${request.method}, id=${request.id}`,
        error,
      );
      const errorResponse = await responseBuilder.buildError(request, error);

      // Use length-prefixed encoding if enabled
      if (useLengthPrefixing) {
        await CoreUtils.sendResponseLP(errorResponse, stream);
      } else {
        await CoreUtils.sendResponse(errorResponse, stream);
      }
    }
  }

  /**
   * Handles an outgoing stream on the client side using length-prefixed protocol
   * Uses async read loops to process responses with proper message boundaries
   *
   * @param stream - The outgoing stream
   * @param emitter - Event emitter for chunk events
   * @param config - Configuration including abort signal
   * @param requestHandler - Optional handler for processing router requests received on this stream
   * @param requestId - Optional request ID to filter responses (for stream reuse scenarios)
   * @returns Promise that resolves with the final response
   */
  async handleOutgoingStreamLP(
    stream: Stream,
    emitter: EventEmitter,
    config: StreamHandlerConfig = {},
    requestHandler?: (request: oRequest, stream: Stream) => Promise<RunResult>,
    requestId?: string | number,
  ): Promise<oResponse> {
    const lp = lpStream(stream);

    try {
      while (stream.status === 'open') {
        this.logger.debug('Waiting for response...');
        // Read complete length-prefixed message
        const messageBytes = await lp.read({ signal: config.signal });
        const decoded = new TextDecoder().decode(messageBytes.subarray());

        // Parse JSON (handles markdown blocks, mixed content, and JSON5)
        this.logger.debug('handleOutgoing raw decoded:', decoded);
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
          // Process incoming router requests if handler is provided
          if (requestHandler) {
            this.logger.debug(
              'Received router request on client-side stream, processing...',
              message,
            );
            await this.handleRequestMessage(
              message,
              stream,
              requestHandler,
              true,
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
      if (config.signal?.aborted) {
        throw new oError(oErrorCodes.TIMEOUT, 'Request aborted');
      }
      throw error;
    }
  }

  /**
   * Handles an outgoing stream on the client side
   * Listens for response messages and emits them via the event emitter
   * If requestHandler is provided, also processes incoming router requests
   *
   * @param stream - The outgoing stream
   * @param emitter - Event emitter for chunk events
   * @param config - Configuration including abort signal
   * @param requestHandler - Optional handler for processing router requests received on this stream
   * @param requestId - Optional request ID to filter responses (for stream reuse scenarios)
   * @returns Promise that resolves with the final response
   */
  async handleOutgoingStream(
    stream: Stream,
    emitter: EventEmitter,
    config: StreamHandlerConfig = {},
    requestHandler?: (request: oRequest, stream: Stream) => Promise<RunResult>,
    requestId?: string | number,
  ): Promise<oResponse> {
    // Route to length-prefixed handler if enabled
    if (config.useLengthPrefixing) {
      return this.handleOutgoingStreamLP(
        stream,
        emitter,
        config,
        requestHandler,
        requestId,
      );
    }

    return new Promise((resolve, reject) => {
      let lastResponse: any;

      const messageHandler = async (event: any) => {
        // avoid processing non-olane messages
        if (!event.data) {
          return;
        }
        try {
          const message = await this.decodeMessage(event);

          if (typeof message === 'string') {
            // this.logger.warn(
            //   'Received string message on server-side stream, ignoring',
            //   message,
            // );
            return;
          }

          if (this.isResponse(message)) {
            const response = await CoreUtils.processStreamResponse(event);

            // If requestId is provided, filter responses to only process those matching our request
            // This prevents premature termination when multiple requests share the same stream
            if (requestId !== undefined && response.id !== requestId) {
              this.logger.debug(
                `Ignoring response for different request (expected: ${requestId}, received: ${response.id})`,
              );
              return;
            }

            // Emit chunk for streaming responses
            emitter.emit('chunk', response);

            // Check if this is the last chunk for THIS request
            if (response.result._last || !response.result._isStreaming) {
              lastResponse = response;
              cleanup();
              resolve(response);
            }
          } else if (this.isRequest(message)) {
            // Process incoming router requests if handler is provided
            if (requestHandler) {
              this.logger.debug(
                'Received router request on client-side stream, processing...',
                message,
              );
              await this.handleRequestMessage(message, stream, requestHandler);
            } else {
              this.logger.warn(
                'Received request message on client-side stream, ignoring (no handler)',
                message,
              );
            }
          } else {
            this.logger.warn('Received unknown message type', message);
          }
        } catch (error: any) {
          this.logger.error('Error handling response message:', error);
          cleanup();
          reject(error);
        }
      };

      const closeHandler = () => {
        cleanup();

        if (lastResponse) {
          resolve(lastResponse);
        } else {
          reject(
            new oError(
              oErrorCodes.TIMEOUT,
              'Stream closed before response received',
            ),
          );
        }
      };

      const abortHandler = () => {
        this.logger.debug('Request aborted');
        cleanup();

        try {
          stream.abort(new Error('Request aborted'));
        } catch (error: any) {
          this.logger.debug('Error aborting stream:', error.message);
        }

        reject(new oError(oErrorCodes.TIMEOUT, 'Request aborted'));
      };

      const cleanup = () => {
        stream.removeEventListener('message', messageHandler);
        stream.removeEventListener('close', closeHandler);
        if (config.signal) {
          config.signal.removeEventListener('abort', abortHandler);
        }
      };

      stream.addEventListener('message', messageHandler);
      stream.addEventListener('close', closeHandler);

      if (config.signal) {
        config.signal.addEventListener('abort', abortHandler);
      }
    });
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
          await CoreUtils.sendResponseLP(response, incomingStream);
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
      await CoreUtils.sendResponseLP(errorResponse, incomingStream);
    }
  }
}
