import { Stream } from '@olane/o-config';
import {
  oError,
  oErrorCodes,
  oRequest,
  ProtocolBuilder,
  StreamTransportConfig,
} from '@olane/o-core';
import { Libp2pStreamTransport } from './libp2p-stream-transport.js';

/**
 * Client-side streaming orchestration for o-node.
 * Manages chunk queues, backpressure, timeouts, and provides both
 * callback and AsyncGenerator interfaces for streaming responses.
 */
export class oNodeStreamingClient {
  /**
   * Transmit a request via streaming and receive chunks through a callback.
   * This method handles the full streaming lifecycle including timeouts,
   * chunk sequencing, and cleanup.
   *
   * @param stream The libp2p stream to use for communication
   * @param request The request to send
   * @param onChunk Callback invoked for each chunk received
   * @param config Optional transport configuration
   * @returns Promise that resolves when the stream completes
   */
  async streamRequest(
    stream: Stream,
    request: oRequest,
    onChunk: (chunk: any, sequence: number, isLast: boolean) => void,
    config?: StreamTransportConfig,
  ): Promise<void> {
    // Create transport abstraction
    const transport = new Libp2pStreamTransport(stream, config);

    // Send the request using the transport
    const data = new TextEncoder().encode(request.toString());
    await transport.send(data);

    // Set up to receive multiple chunks
    return new Promise<void>((resolve, reject) => {
      // Set up timeout for receiving first chunk
      const timeout = setTimeout(async () => {
        transport.removeMessageHandler();
        await transport.close();
        reject(
          new oError(
            oErrorCodes.TIMEOUT,
            'Timeout waiting for streaming response',
          ),
        );
      }, config?.readTimeoutMs ?? 120_000);

      let timeoutCleared = false;

      const messageHandler = async (data: Uint8Array) => {
        // Clear timeout on first message
        if (!timeoutCleared) {
          clearTimeout(timeout);
          timeoutCleared = true;
        }

        try {
          const response = ProtocolBuilder.decodeMessage(data);

          // Try to parse as streaming chunk
          const chunk = ProtocolBuilder.parseStreamChunk(response);

          if (chunk) {
            // Streaming response
            onChunk(chunk.data, chunk.sequence, chunk.isLast);

            if (chunk.isLast) {
              transport.removeMessageHandler();
              await transport.close();
              resolve();
            }
          } else {
            // Non-streaming response (fallback for compatibility)
            onChunk(response.result, 1, true);
            transport.removeMessageHandler();
            await transport.close();
            resolve();
          }
        } catch (error) {
          transport.removeMessageHandler();
          await transport.close();
          reject(error);
        }
      };

      transport.onMessage(messageHandler);
    });
  }

  /**
   * Transmit a request via streaming and receive chunks as an AsyncGenerator.
   * This enables true streaming by yielding chunks as they arrive, not buffering them all first.
   * Manages chunk queue with backpressure coordination between chunk arrival and consumption.
   *
   * @param stream The libp2p stream to use for communication
   * @param request The request to send
   * @param config Optional transport configuration
   * @returns AsyncGenerator that yields chunks as they arrive
   */
  async *streamAsGenerator(
    stream: Stream,
    request: oRequest,
    config?: StreamTransportConfig,
  ): AsyncGenerator<any, void, unknown> {
    const chunkQueue: Array<{ chunk: any; sequence: number; isLast: boolean }> =
      [];
    let streamComplete = false;
    let streamError: any = null;
    let resolveNextChunk: (() => void) | null = null;

    // Start streaming in the background using callback pattern
    const transmitPromise = this.streamRequest(
      stream,
      request,
      (chunk: any, sequence: number, isLast: boolean) => {
        chunkQueue.push({ chunk, sequence, isLast });
        if (isLast) {
          streamComplete = true;
        }
        // Notify that a new chunk is available
        if (resolveNextChunk) {
          resolveNextChunk();
          resolveNextChunk = null;
        }
      },
      config,
    ).catch((error) => {
      streamError = error;
      // Notify of error
      if (resolveNextChunk) {
        resolveNextChunk();
        resolveNextChunk = null;
      }
    });

    // Yield chunks as they arrive
    while (!streamComplete && !streamError) {
      if (chunkQueue.length > 0) {
        const { chunk } = chunkQueue.shift()!;
        yield chunk;
      } else {
        // Wait for next chunk
        await new Promise<void>((resolve) => {
          resolveNextChunk = resolve;
        });
      }
    }

    // Yield any remaining chunks
    while (chunkQueue.length > 0) {
      const { chunk } = chunkQueue.shift()!;
      yield chunk;
    }

    // Wait for transmit to complete
    await transmitPromise;

    // If there was an error, throw it
    if (streamError) {
      throw streamError;
    }
  }
}
