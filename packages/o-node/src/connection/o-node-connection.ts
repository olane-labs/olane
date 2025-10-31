import {
  Connection,
  Uint8ArrayList,
  pushable,
  all,
  Stream,
  byteStream,
} from '@olane/o-config';
import {
  oConnection,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
  oRouterRequest,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';
import { oNodeStreamingClient } from '../streaming/o-node-streaming-client.js';

export class oNodeConnection extends oConnection {
  public p2pConnection: Connection;
  private streamingClient: oNodeStreamingClient;

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection;
    this.streamingClient = new oNodeStreamingClient();
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

      // If send() returns false, wait for the stream to drain before continuing
      if (!sent) {
        this.logger.debug('Stream buffer full, waiting for drain...');
        await stream.onDrain({
          signal: AbortSignal.timeout(this.config.drainTimeoutMs ?? 30_000),
        }); // Default: 30 second timeout
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

      // Delegate to streaming client
      return this.streamingClient.streamRequest(stream, request, onChunk, {
        drainTimeoutMs: this.config.drainTimeoutMs ?? 30_000,
        readTimeoutMs: this.config.readTimeoutMs ?? 120_000,
      });
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  /**
   * Transmit a request and receive streaming chunks as an AsyncGenerator.
   * This enables true streaming by yielding chunks as they arrive.
   * @param request The request to send
   * @returns AsyncGenerator that yields chunks
   */
  async *transmitAsStream(
    request: oRequest,
  ): AsyncGenerator<any, void, unknown> {
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

      // Delegate to streaming client's generator method
      yield* this.streamingClient.streamAsGenerator(stream, request, {
        drainTimeoutMs: this.config.drainTimeoutMs ?? 30_000,
        readTimeoutMs: this.config.readTimeoutMs ?? 120_000,
      });
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  /**
   * Checks if a request is for a streaming method.
   * Streaming methods typically start with 'stream_' or are known streaming methods.
   */
  private isStreamingMethod(request: oRequest | oRouterRequest): boolean {
    let method: string;

    if ('params' in request && 'payload' in request.params) {
      // This is a routing request, extract the actual method from payload
      const payload = request.params.payload as any;
      method = payload?.method as string;
    } else {
      // This is a direct request
      method = request.method as string;
    }

    // Check if method starts with 'stream_' or is a known streaming method
    return method?.startsWith('stream_') || false;
  }

  /**
   * Transmit a request with automatic streaming detection.
   * Returns an oResponse with either data for non-streaming or AsyncGenerator for streaming.
   * @param request The request to send
   * @returns oResponse with result containing either data or AsyncGenerator
   */
  async transmitWithPotentialStreaming(
    request: oRequest | oRouterRequest,
  ): Promise<oResponse> {
    const isStreamingRequest = this.isStreamingMethod(request);

    if (isStreamingRequest) {
      // Use transmitAsStream for streaming requests
      // Wrap the AsyncGenerator in an oResponse for consistency
      const generator = this.transmitAsStream(request as oRequest);
      return new oResponse({
        id: request.id,
        result: generator,
        _requestMethod: request.method as string,
        _connectionId: this.id,
      });
    } else {
      // Use regular transmit for non-streaming requests
      // Already returns oResponse
      return await this.transmit(request as oRequest);
    }
  }

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
