import { Connection, Libp2p, Multiaddr, Stream } from '@olane/o-config';
import {
  CoreUtils,
  oConnection,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';
import type {
  StreamHandlerConfig,
  StreamReusePolicy,
} from './stream-handler.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeStream } from './o-node-stream.js';
import { oNodeStreamManager } from './o-node-stream.manager.js';

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
  protected reusePolicy: StreamReusePolicy;
  public streamManager: oNodeStreamManager;
  protected p2pNode?: Libp2p;
  protected identifyData?: CachedIdentifyData;
  protected identifyListener?: (evt: any) => void;

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection;
    this.reusePolicy = config.reusePolicy ?? 'none';
    this.p2pNode = config.p2pNode;

    // Initialize oNodeStreamManager (stream lifecycle and protocol management)
    this.streamManager = new oNodeStreamManager({
      p2pConnection: this.p2pConnection,
    });

    // Set up persistent identify event listener
    this.setupIdentifyListener();
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

  supportsAddress(address: oNodeAddress): boolean {
    return address.libp2pTransports.some((transport) => {
      return transport.toString() === this.remoteAddr.toString();
    });
  }

  get streams(): oNodeStream[] {
    return this.streamManager.getAllStreams();
  }

  /**
   * Get cached identify data for the remote peer.
   * Returns undefined if identify event hasn't been received yet.
   */
  get cachedIdentifyData(): CachedIdentifyData | undefined {
    return this.identifyData;
  }

  /**
   * Get protocols supported by the remote peer from cached identify data.
   * Returns empty array if identify data not available yet.
   */
  get remoteProtocols(): string[] {
    return this.identifyData?.protocols || [];
  }

  /**
   * Get agent version of the remote peer from cached identify data.
   */
  get remoteAgentVersion(): string | undefined {
    return this.identifyData?.agentVersion;
  }

  /**
   * Get protocol version of the remote peer from cached identify data.
   */
  get remoteProtocolVersion(): string | undefined {
    return this.identifyData?.protocolVersion;
  }

  /**
   * Get listen addresses advertised by the remote peer.
   * Returns empty array if identify data not available yet.
   */
  get remoteListenAddrs(): Multiaddr[] {
    return this.identifyData?.listenAddrs || [];
  }

  /**
   * Get our observed address as seen by the remote peer.
   */
  get observedAddress(): Multiaddr | undefined {
    return this.identifyData?.observedAddr;
  }

  async transmit(request: oRequest): Promise<oResponse> {
    try {
      // Build protocol string
      const protocol =
        this.nextHopAddress.protocol +
        (this.reusePolicy === 'reuse' ? '/reuse' : '');

      this.logger.debug(
        'Transmitting request on limited connection?',
        this.config.runOnLimitedConnection,
      );
      const streamConfig: StreamHandlerConfig = {
        signal: this.abortSignal,
        drainTimeoutMs: this.config.drainTimeoutMs,
        reusePolicy: this.reusePolicy,
        maxOutboundStreams: process.env.MAX_OUTBOUND_STREAMS
          ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
          : 1000,
        runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
      };

      // Get stream from StreamManager
      const wrappedStream = await this.streamManager.getOrCreateStream(
        protocol,
        this.nextHopAddress,
        streamConfig,
      );

      // Ensure stream is valid
      wrappedStream.validate();

      const stream = wrappedStream.p2pStream;

      // Send the request with backpressure handling
      const data = new TextEncoder().encode(request.toString());

      await this.streamManager.sendLengthPrefixed(stream, data, streamConfig);

      // Determine which stream to wait for response on
      // If _streamId is specified, use that stream (for limited connections with persistent writer stream)
      let responseStream = stream;
      if (request.params._streamId) {
        const specifiedStream = this.streamManager.getStreamById(
          request.params._streamId,
        );
        if (specifiedStream) {
          responseStream = specifiedStream;
          this.logger.debug('Using specified stream for response', {
            requestStreamId: stream.id,
            responseStreamId: specifiedStream.id,
          });
        } else {
          this.logger.warn(
            'Specified response stream not found, using request stream',
            {
              streamId: request.params._streamId,
            },
          );
        }
      }

      // Handle response using StreamManager
      // Pass request ID to enable proper response correlation on shared streams
      const response = await this.streamManager.handleOutgoingStream(
        responseStream,
        this.emitter,
        streamConfig,
        request.id,
      );

      // Handle cleanup of the stream
      await this.postTransmit(wrappedStream);

      return response;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  async postTransmit(stream: oNodeStream): Promise<void> {
    // Always cleanup streams (no reuse at base layer)
    await this.streamManager.releaseStream(stream.p2pStream.id);
  }

  /**
   * Set up persistent listener for identify events from the remote peer
   */
  protected setupIdentifyListener(): void {
    if (!this.p2pNode) {
      return;
    }

    this.identifyListener = (evt: any) => {
      const { peerId, protocols, agentVersion, protocolVersion, listenAddrs, observedAddr } = evt.detail;

      // Only cache if this event is for our remote peer
      if (peerId?.toString() === this.remotePeerId.toString()) {
        this.identifyData = {
          protocols: protocols || [],
          agentVersion,
          protocolVersion,
          listenAddrs: listenAddrs || [],
          observedAddr,
          timestamp: Date.now(),
        };

        this.logger.debug('Cached identify data for peer', {
          peerId: peerId.toString(),
          protocols: this.identifyData.protocols,
          agentVersion: this.identifyData.agentVersion,
        });
      }
    };

    this.p2pNode.addEventListener('peer:identify', this.identifyListener);
  }

  async abort(error: Error) {
    this.logger.debug('Aborting connection');
    await this.p2pConnection.abort(error);
    this.logger.debug('Connection aborted');
  }

  async close() {
    this.logger.debug('Closing connection');

    // Remove identify listener
    if (this.p2pNode && this.identifyListener) {
      this.p2pNode.removeEventListener('peer:identify', this.identifyListener);
    }

    // Close stream manager (handles all stream cleanup)
    await this.streamManager.close();

    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
