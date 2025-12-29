import { Connection, Libp2p, Multiaddr, Stream } from '@olane/o-config';
import {
  CoreUtils,
  oAddress,
  oConnection,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';
import type { StreamHandlerConfig } from './stream-handler.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeStream } from './o-node-stream.js';
import { oNodeStreamConfig } from './interfaces/o-node-stream.config.js';
import { AbortSignalConfig } from './interfaces/abort-signal.config.js';
import { EventEmitter } from 'events';
import {
  oNodeMessageEvent,
  oNodeMessageEventData,
} from './enums/o-node-message-event.js';
import { oStreamRequest } from './o-stream.request.js';

interface CachedIdentifyData {
  protocols: string[];
  agentVersion?: string;
  protocolVersion?: string;
  listenAddrs: Multiaddr[];
  observedAddr?: Multiaddr;
  timestamp: number;
}

export class oNodeConnection extends oConnection {
  public p2pConnection: Connection;
  protected streams: Map<string, oNodeStream> = new Map<string, oNodeStream>();
  protected runOnLimitedConnection: boolean;
  protected eventEmitter: EventEmitter = new EventEmitter();

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection as Connection;
    this.runOnLimitedConnection = config.runOnLimitedConnection ?? false;

    this.listenForClose();
  }

  listenForClose() {
    this.p2pConnection.addEventListener('close', () => {
      this.close();
    });
  }

  get isOpen() {
    return this.p2pConnection.status === 'open';
  }

  get remotePeerId() {
    return this.p2pConnection.remotePeer;
  }

  get remoteAddr() {
    return this.p2pConnection.remoteAddr;
  }

  /**
   * Get the connection configuration for compatibility checking.
   */
  get connectionConfig(): oNodeConnectionConfig {
    return this.config;
  }

  get address(): oAddress {
    return this.config.targetAddress;
  }

  get nextHopAddress(): oAddress {
    if (this.config.nextHopAddress.value === 'o://unknown') {
      return this.address;
    }
    return this.config.nextHopAddress;
  }

  get callerAddress(): oAddress | undefined {
    if (this.p2pConnection.direction === 'inbound') {
      return this.address;
    }

    return this.config.callerAddress;
  }

  async newStream(config: oNodeStreamConfig): Promise<oNodeStream> {
    const protocol = config.remoteAddress.protocol;
    this.logger.debug('Creating new stream', {
      protocol,
      currentStreamCount: this.streams.size,
    });

    // Create stream from libp2p connection
    const stream = await this.p2pConnection.newStream(protocol, {
      signal: config.abortSignal,
      maxOutboundStreams: 1000,
      runOnLimitedConnection: this.runOnLimitedConnection,
    });

    // Wrap in oNodeStream with metadata
    const wrappedStream = new oNodeStream(stream, config);

    this.logger.debug('Stream created', {
      streamId: stream.id,
      protocol,
      totalStreams: this.streams.size,
    });

    return wrappedStream;
  }

  // bubble up the messages to the request handler
  protected async listenForMessages(
    stream: oNodeStream,
    options: AbortSignalConfig,
  ) {
    try {
      stream.on(oNodeMessageEvent.request, (data: oStreamRequest) => {
        this.emit(oNodeMessageEvent.request, data);
      });

      stream.on(oNodeMessageEvent.response, (data: oResponse) => {
        this.emit(oNodeMessageEvent.response, data);
      });

      await stream.listen(options);
    } catch (err) {
      this.logger.error(
        'Stream errored out when listening for key messages:',
        err,
      );
    }
  }

  protected async doSend(
    request: oRequest,
    options: AbortSignalConfig,
  ): Promise<oNodeStream> {
    try {
      // create a new stream and send the payload
      const wrappedStream = await this.newStream({
        remoteAddress: this.nextHopAddress,
        limited: this.runOnLimitedConnection,
        abortSignal: options.abortSignal,
      });
      this.streams.set(wrappedStream.id, wrappedStream);
      await wrappedStream.send(request, options);
      return wrappedStream;
    } catch (err) {
      this.logger.error('Failed to send request over stream.', err);
      throw new oError(
        oErrorCodes.SEND_FAILED,
        'Failed to send request over stream.',
        { request: request.toJSON() },
      );
    }
  }

  async transmit(
    request: oRequest,
    options: AbortSignalConfig,
  ): Promise<oNodeStream> {
    try {
      this.logger.debug(
        'Transmitting request on limited connection?',
        this.config.runOnLimitedConnection,
      );

      const stream = await this.doSend(request, options);

      // persistent listener
      // this.listenForMessages(wrappedStream, config);

      // Handle cleanup of the stream
      await this.postTransmit(stream);
      return stream;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  async postTransmit(stream: oNodeStream): Promise<void> {
    // after transmit, let's just leave this connection open for now
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

  /**
   * Add event listener
   */
  on<K extends oNodeMessageEvent>(
    event: K | string,
    listener: (data: oNodeMessageEventData[K]) => void,
  ): void {
    this.eventEmitter.on(event as string, listener);
  }

  /**
   * Remove event listener
   */
  off<K extends oNodeMessageEvent>(
    event: K | string,
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
