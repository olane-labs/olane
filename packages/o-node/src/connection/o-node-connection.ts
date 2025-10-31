import {
  Connection,
  Uint8ArrayList,
  pushable,
  all,
  Stream,
  byteStream,
} from '@olane/o-config';
import {
  CoreUtils,
  oConnection,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';
import { Libp2pStreamTransport } from '../streaming/libp2p-stream-transport.js';
import { ProtocolBuilder } from '../../../o-core/src/streaming/protocol-builder.js';

export class oNodeConnection extends oConnection {
  public p2pConnection: Connection;

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection;
  }

  async read(source: Stream) {
    const bytes = byteStream(source);
    const output = await bytes.read({
      signal: AbortSignal.timeout(this.config.readTimeoutMs ?? 120_000), // Default: 2 min timeout
    });
    const outputObj =
      output instanceof Uint8ArrayList ? output.subarray() : output;
    const jsonStr = new TextDecoder().decode(outputObj);
    return JSON.parse(jsonStr);
  }

  validate() {
    if (this.config.p2pConnection.status !== 'open') {
      throw new Error('Connection is not valid');
    }
    // do nothing
  }

  async transmit(request: oRequest): Promise<oResponse> {
    try {
      const stream = await this.p2pConnection.newStream(
        this.nextHopAddress.protocol,
        {
          maxOutboundStreams: Infinity,
          runOnLimitedConnection: true, // TODO: should this be configurable?
        },
      );

      const isStreamRequest = request.params._isStream;

      if (!stream || (stream.status !== 'open' && stream.status !== 'reset')) {
        throw new oError(
          oErrorCodes.FAILED_TO_DIAL_TARGET,
          'Failed to dial target',
        );
      }
      if (stream.status === 'reset') {
        throw new oError(
          oErrorCodes.CONNECTION_LIMIT_REACHED,
          'Connection limit reached',
        );
      }

      // Send the data with backpressure handling (libp2p v3 best practice)
      const data = new TextEncoder().encode(request.toString());
      const sent = stream.send(data);

      if (isStreamRequest) {
        stream.addEventListener('message', async (event) => {
          const response = await CoreUtils.processStreamResponse(event);
          this.emitter.emit('chunk', response);
          // marked as the last chunk let's close
          if (response.result._last) {
            await stream.close();
          }
        });
      }

      // If send() returns false, wait for the stream to drain before continuing
      if (!sent) {
        this.logger.debug('Stream buffer full, waiting for drain...');
        await stream.onDrain({
          signal: AbortSignal.timeout(this.config.drainTimeoutMs ?? 30_000),
        }); // Default: 30 second timeout
      }

      if (isStreamRequest) {
        return Promise.resolve(
          CoreUtils.buildResponse(
            request,
            'request is streaming, this response is not used',
            null,
          ),
        );
      }

      const res = await this.read(stream);
      await stream.close();

      // process the response
      const response = new oResponse({
        ...res.result,
      });
      return response;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  /**
   * Transmit a request and receive streaming chunks via callback
   * @param request The request to send
   * @param onChunk Callback function called for each chunk received
   * @returns Promise that resolves when stream is complete
   */
  async transmitStreaming(
    request: oRequest,
    onChunk: (chunk: any, sequence: number, isLast: boolean) => void,
  ): Promise<void> {
    try {
      const stream = await this.p2pConnection.newStream(
        this.nextHopAddress.protocol,
        {
          maxOutboundStreams: Infinity,
          runOnLimitedConnection: true,
        },
      );

      if (!stream || (stream.status !== 'open' && stream.status !== 'reset')) {
        throw new oError(
          oErrorCodes.FAILED_TO_DIAL_TARGET,
          'Failed to dial target',
        );
      }
      if (stream.status === 'reset') {
        throw new oError(
          oErrorCodes.CONNECTION_LIMIT_REACHED,
          'Connection limit reached',
        );
      }

      // Create transport abstraction
      const transport = new Libp2pStreamTransport(stream, {
        drainTimeoutMs: this.config.drainTimeoutMs ?? 30_000,
        readTimeoutMs: this.config.readTimeoutMs ?? 120_000,
      });

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
        }, this.config.readTimeoutMs ?? 120_000);

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
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
