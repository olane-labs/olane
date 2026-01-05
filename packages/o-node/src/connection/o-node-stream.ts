import type { Stream } from '@libp2p/interface';
import {
  oError,
  oErrorCodes,
  oObject,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeStreamConfig } from './interfaces/o-node-stream.config.js';
import { LengthPrefixedStream, lpStream } from '@olane/o-config';
import { AbortSignalConfig } from './interfaces/abort-signal.config.js';
import JSON5 from 'json5';
import { EventEmitter } from 'events';
import {
  oNodeMessageEvent,
  oNodeMessageEventData,
} from './enums/o-node-message-event.js';
import { oStreamRequest } from './o-stream.request.js';

/**
 * oNodeStream wraps a libp2p Stream and transmits or receives messages across the libp2p streams
 */
export class oNodeStream extends oObject {
  public readonly createdAt: number;
  protected readonly lp: LengthPrefixedStream;
  protected readonly eventEmitter: EventEmitter = new EventEmitter();

  constructor(
    public readonly p2pStream: Stream,
    public readonly config: oNodeStreamConfig,
  ) {
    super(p2pStream.id);
    this.createdAt = Date.now();
    this.lp = lpStream(p2pStream);
    this.listenForLibp2pEvents();
  }

  listenForLibp2pEvents() {
    this.p2pStream.addEventListener('close', () => {
      this.close();
    });
  }

  // callable pattern to disrupt flow if not in valid state
  validate() {
    // do nothing
    if (
      !this.p2pStream ||
      (this.p2pStream.status !== 'open' && this.p2pStream.status !== 'reset')
    ) {
      throw new oError(
        oErrorCodes.FAILED_TO_DIAL_TARGET,
        'Failed to dial target',
      );
    }
    if (this.p2pStream.status === 'reset') {
      this.logger.debug(
        'P2P stream failed to create, status:',
        this.p2pStream.status,
      );
      throw new oError(
        oErrorCodes.CONNECTION_LIMIT_REACHED,
        'Connection limit reached or configuration prevented stream creation',
      );
    }
    if (!this.isValid) {
      throw new oError(
        oErrorCodes.INVALID_STATE,
        'Session is not in a valid state',
      );
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

  async send(request: oRequest, options: AbortSignalConfig) {
    // Ensure stream is valid
    this.validate();

    // Send the request with backpressure handling
    const data = new TextEncoder().encode(request.toString());

    await this.lp.write(data, { signal: options?.abortSignal });
  }

  /**
   * listen - process every message inbound on the stream and emit it for the connection to bubble up
   * @param options
   */
  async listen(options: AbortSignalConfig): Promise<void> {
    while (this.isValid && !options?.abortSignal?.aborted) {
      await this.listenOnce(options);
    }
  }

  async listenOnce(options: AbortSignalConfig) {
    const messageBytes = await this.lp.read({ signal: options?.abortSignal });
    const decoded = new TextDecoder().decode(messageBytes.subarray());
    const message = this.extractAndParseJSON(decoded);

    if (this.isRequest(message)) {
      // package up the request + stream and emit
      const request = new oStreamRequest({
        ...message,
        stream: this.p2pStream,
      });
      this.emit(oNodeMessageEvent.request, request);
    } else if (this.isResponse(message)) {
      const response = new oResponse({
        ...message.result,
        id: message.id,
      });
      this.emit(oNodeMessageEvent.response, response);
    }
  }

  async waitForResponse(requestId: string): Promise<oResponse> {
    return new Promise((resolve, reject) => {
      const handler = (data: oResponse) => {
        // check if last chunk
        // TODO: create unit tests around no "_last" scenario
        if (data.id === requestId && data.result?._last === true) {
          this.off(oNodeMessageEvent.response, handler);
          this.logger.debug(
            'Stream stopped listening for responses due to "waitForResponse", technically should continue if listen was called elsewhere',
          );
          resolve(data);
        }
      };
      this.on(oNodeMessageEvent.response, handler);
    });
  }

  /**
   * Detects if a decoded message is a request
   * Requests have a 'method' field and no 'result' field
   */
  isRequest(message: any): boolean {
    return (
      typeof message?.method === 'string' &&
      message.result === undefined &&
      message.error === undefined
    );
  }

  /**
   * Detects if a decoded message is a response
   */
  isResponse(message: any): boolean {
    return message?.result !== undefined || message?.error !== undefined;
  }

  /**
   * Checks if the stream is in a valid state:
   * - Stream status is 'open'
   * - Write status is 'writable'
   * - Remote read status is 'readable'
   *
   * @returns true if stream can be used
   */
  get isValid(): boolean {
    return (
      this.p2pStream.status === 'open' &&
      this.p2pStream.writeStatus === 'writable' &&
      this.p2pStream.remoteReadStatus === 'readable'
    );
  }

  /**
   * Gets the age of the stream in milliseconds
   */
  get age(): number {
    return Date.now() - this.createdAt;
  }

  async close(): Promise<void> {
    if (this.p2pStream.status === 'open') {
      try {
        // force the close for now until we can implement a proper close
        this.logger.debug('Closing p2p stream');
        await this.p2pStream.abort(new Error('Stream closed'));
      } catch (error: any) {
        this.logger.debug('Error closing stream:', error.message);
      }
    }
  }

  get id(): string {
    return this.p2pStream?.id;
  }

  /**
   * Add event listener
   */
  on<K extends oNodeMessageEvent>(
    event: K,
    listener: (data: oNodeMessageEventData[K]) => void,
  ): void {
    this.eventEmitter.on(event as string, listener);
  }

  /**
   * Remove event listener
   */
  off<K extends oNodeMessageEvent>(
    event: K,
    listener: (data: oNodeMessageEventData[K]) => void,
  ): void {
    this.eventEmitter.off(event as string, listener);
  }

  /**
   * Emit event
   */
  private emit<K extends oNodeMessageEvent>(
    event: K,
    data?: oNodeMessageEventData[K],
  ): void {
    this.eventEmitter.emit(event, data);
  }
}
