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
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnectionStream } from './o-node-connection-stream.js';
import { ConnectionUtils } from '../utils/connection.utils.js';

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

  get remotePeerId() {
    return this.p2pConnection.remotePeer;
  }

  get remoteAddr() {
    return this.p2pConnection.remoteAddr;
  }

  supportsAddress(address: oNodeAddress): boolean {
    return address.libp2pTransports.some((transport) => {
      return transport.toString() === this.remoteAddr.toString();
    });
  }

  async getOrCreateStream(): Promise<oNodeConnectionStream> {
    if (this.reusePolicy === 'reuse' && this.streams.length > 0) {
      this.logger.debug(
        'Returning reuse stream: ',
        this.streams[0].p2pStream.protocol,
      );
      // search for streams that allow re-use
      return this.streams[0];
    }

    return this.createStream();
  }

  async createStream(): Promise<oNodeConnectionStream> {
    const protocol =
      this.nextHopAddress.protocol +
      (this.reusePolicy === 'reuse' ? '/reuse' : ''); // connect specifically to the reuse protocol version if desired
    this.logger.debug('Creating stream for protocol:', protocol);
    const stream = await this.p2pConnection.newStream(protocol, {
      signal: this.abortSignal,
      maxOutboundStreams: process.env.MAX_OUTBOUND_STREAMS
        ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
        : 1000,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? true,
    });
    const managedStream = new oNodeConnectionStream(stream, {
      direction: stream.direction,
      reusePolicy: this.config.reusePolicy ?? 'none', // default to no re-use stream
      remoteAddress: this.nextHopAddress,
    });

    // print the num streams
    const numStreams = this.streams.map(
      (s: oNodeConnectionStream) => s.isValid,
    ).length;
    this.logger.debug(
      `Connection spawned new stream: ${stream.id}. Connection now has ${numStreams} total streams open`,
    );

    return managedStream;
  }

  get streams(): oNodeConnectionStream[] {
    return (
      this.p2pConnection?.streams
        ?.filter((s) => {
          return s.protocol.includes('/o/');
        })
        .map((s) => {
          return new oNodeConnectionStream(s, {
            direction: s.direction,
            reusePolicy: this.config.reusePolicy ?? 'none', // default to no re-use stream
            remoteAddress: this.nextHopAddress,
          });
        }) || []
    );
  }

  async transmit(request: oRequest): Promise<oResponse> {
    try {
      const stream = await this.getOrCreateStream();

      // ensure stream is valid
      stream.validate();

      const streamConfig: StreamHandlerConfig = {
        signal: this.abortSignal,
        drainTimeoutMs: this.config.drainTimeoutMs,
        reusePolicy: this.reusePolicy,
      };

      // Send the request with backpressure handling
      const data = new TextEncoder().encode(request.toString());

      await this.streamHandler.sendLengthPrefixed(
        stream.p2pStream,
        data,
        streamConfig,
      );

      // Handle response using StreamHandler
      // Pass request handler if configured to enable bidirectional stream processing
      // Pass request ID to enable proper response correlation on shared streams
      const response = await this.streamHandler.handleOutgoingStream(
        stream.p2pStream,
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

  async postTransmit(stream: oNodeConnectionStream) {
    await stream.close();
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
