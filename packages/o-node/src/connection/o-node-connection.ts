import { Connection, Stream } from '@olane/o-config';
import {
  CoreUtils,
  oConnection,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';
import { StreamHandler } from './stream-handler.js';
import type {
  StreamHandlerConfig,
  StreamReusePolicy,
} from './stream-handler.config.js';

export class oNodeConnection extends oConnection {
  public p2pConnection: Connection;
  protected streamHandler: StreamHandler;
  protected reusePolicy: StreamReusePolicy;

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection;
    this.streamHandler = new StreamHandler(this.logger);
    this.reusePolicy = config.reusePolicy ?? 'none';
  }

  validate(stream?: Stream) {
    if (this.config.p2pConnection.status !== 'open') {
      throw new Error('Connection is not valid');
    }
    // do nothing
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
  }

  async getOrCreateStream(): Promise<Stream> {
    const streamConfig: StreamHandlerConfig = {
      signal: this.abortSignal,
      maxOutboundStreams: process.env.MAX_OUTBOUND_STREAMS
        ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
        : 1000,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? true,
      reusePolicy: this.reusePolicy,
      drainTimeoutMs: this.config.drainTimeoutMs,
    };

    // Build stream addresses for address-based caching
    const streamAddresses =
      this.callerAddress && this.nextHopAddress
        ? {
            callerAddress: this.callerAddress,
            receiverAddress: this.nextHopAddress,
            direction: 'outbound' as const,
          }
        : undefined;

    return this.streamHandler.getOrCreateStream(
      this.p2pConnection,
      this.nextHopAddress.protocol,
      streamConfig,
      streamAddresses,
    );
  }

  async transmit(request: oRequest): Promise<oResponse> {
    try {
      // if (this.config.runOnLimitedConnection) {
      //   this.logger.debug('Running on limited connection...');
      // }
      const stream = await this.getOrCreateStream();

      this.validate(stream);

      const streamConfig: StreamHandlerConfig = {
        signal: this.abortSignal,
        drainTimeoutMs: this.config.drainTimeoutMs,
        reusePolicy: this.reusePolicy,
      };

      // Send the request with backpressure handling
      const data = new TextEncoder().encode(request.toString());

      await this.streamHandler.sendLengthPrefixed(stream, data, streamConfig);

      // Handle response using StreamHandler
      // Pass request handler if configured to enable bidirectional stream processing
      // Pass request ID to enable proper response correlation on shared streams
      const response = await this.streamHandler.handleOutgoingStream(
        stream,
        this.emitter,
        streamConfig,
        this.config.requestHandler,
        request.id,
      );

      // Handle cleanup of the stream
      await this.postTransmit(stream);

      return response;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  async postTransmit(stream: Stream) {
    const streamConfig: StreamHandlerConfig = {
      reusePolicy: this.reusePolicy,
    };

    await this.streamHandler.close(stream, streamConfig);
  }

  async abort(error: Error) {
    this.logger.debug('Aborting connection');
    await this.p2pConnection.abort(error);
    this.logger.debug('Connection aborted');
  }

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
