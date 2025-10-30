import { oError } from '../error/o-error.js';
import { oErrorCodes } from '../error/enums/codes.error.js';
import { oRequest } from '@olane/o-protocol';

/**
 * State machine states for streaming operations
 */
export enum StreamHandlerState {
  IDLE = 'idle',
  STREAMING = 'streaming',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/**
 * Options for stream handler operations
 */
export interface StreamHandlerOptions {
  /**
   * Enable metrics tracking
   */
  enableMetrics?: boolean;
}

/**
 * Abstract base class for handling streaming operations.
 * Provides transport-agnostic AsyncGenerator iteration, chunk sequencing,
 * error handling, and state management.
 *
 * Implementations must provide the sendChunk method for transport-specific
 * chunk transmission.
 */
export abstract class StreamHandlerBase {
  protected state: StreamHandlerState = StreamHandlerState.IDLE;
  protected currentSequence: number = 0;
  protected options: StreamHandlerOptions;

  constructor(options: StreamHandlerOptions = {}) {
    this.options = {
      enableMetrics: true,
      ...options,
    };
  }

  /**
   * Get the current state of the stream handler
   */
  public getState(): StreamHandlerState {
    return this.state;
  }

  /**
   * Get the current sequence number
   */
  public getCurrentSequence(): number {
    return this.currentSequence;
  }

  /**
   * Abstract method that implementations must provide to send a chunk.
   * This method should handle the actual transmission using the specific transport.
   *
   * @param chunk - The data chunk to send
   * @param sequence - The sequence number of this chunk
   * @param isLast - Whether this is the final chunk
   * @param request - The original request
   */
  protected abstract sendChunk(
    chunk: unknown,
    sequence: number,
    isLast: boolean,
    request: oRequest
  ): Promise<void>;

  /**
   * Optional hook called when streaming starts
   */
  protected onStreamStart?(request: oRequest): void;

  /**
   * Optional hook called when streaming completes successfully
   */
  protected onStreamComplete?(request: oRequest, totalChunks: number): void;

  /**
   * Optional hook called when streaming encounters an error
   */
  protected onStreamError?(request: oRequest, error: oError): void;

  /**
   * Handle streaming of an AsyncGenerator.
   * Iterates through the generator, sends each chunk with proper sequencing,
   * and handles errors appropriately.
   *
   * @param generator - The AsyncGenerator to stream
   * @param request - The original request
   * @returns Promise that resolves when streaming is complete
   */
  public async handleStream(
    generator: AsyncGenerator<any>,
    request: oRequest
  ): Promise<void> {
    this.state = StreamHandlerState.STREAMING;
    this.currentSequence = 0;

    // Call optional hook
    if (this.onStreamStart) {
      this.onStreamStart(request);
    }

    try {
      // Iterate through the generator and send each chunk
      for await (const chunk of generator) {
        this.currentSequence++;
        await this.sendChunk(chunk, this.currentSequence, false, request);
      }

      // Send final empty chunk to signal completion
      await this.sendChunk(null, this.currentSequence, true, request);

      this.state = StreamHandlerState.COMPLETED;

      // Call optional hook
      if (this.onStreamComplete) {
        this.onStreamComplete(request, this.currentSequence);
      }
    } catch (error) {
      this.state = StreamHandlerState.ERROR;

      // Convert error to oError if needed
      const oErrorInstance = this.convertToOError(error);

      // Call optional hook
      if (this.onStreamError) {
        this.onStreamError(request, oErrorInstance);
      }

      // Send error as final chunk
      try {
        await this.sendChunk(
          oErrorInstance.toJSON(),
          this.currentSequence,
          true,
          request
        );
      } catch (sendError) {
        console.error('Failed to send error chunk:', sendError);
        throw oErrorInstance;
      }

      throw oErrorInstance;
    }
  }

  /**
   * Convert any error to an oError instance
   * @param error - The error to convert
   * @returns An oError instance
   */
  protected convertToOError(error: unknown): oError {
    if (error instanceof oError) {
      return error;
    }

    if (error instanceof Error) {
      return new oError(
        oErrorCodes.UNKNOWN,
        error.message,
        { stack: error.stack }
      );
    }

    return new oError(
      oErrorCodes.UNKNOWN,
      String(error),
      { originalError: error }
    );
  }

  /**
   * Reset the handler state for reuse
   */
  public reset(): void {
    this.state = StreamHandlerState.IDLE;
    this.currentSequence = 0;
  }
}
