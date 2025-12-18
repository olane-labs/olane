import {
  oNodeConnection,
  oNodeConnectionConfig,
  oNodeTool,
} from '@olane/o-node';
import { oLimitedConnectionManager } from './connection/o-limited-connection-manager.js';
import { oNodeConfig } from '@olane/o-node';
import { oRequest } from '@olane/o-core';
import { Stream } from '@olane/o-config';

export class oLimitedTool extends oNodeTool {
  protected backgroundReaders: Map<string, boolean> = new Map();

  constructor(config: oNodeConfig) {
    super({
      ...config,
      network: {
        ...(config.network || {}),
        listeners: config.network?.listeners || [], // default to no listeners
      },
    });
  }

  async connect(config: oNodeConnectionConfig): Promise<oNodeConnection> {
    this.handleProtocol(config.nextHopAddress).catch((error) => {
      this.logger.error('Error handling protocol:', error);
    });

    // Inject requestHandler to enable bidirectional stream processing
    // This allows incoming router requests to be processed through the tool's execute method
    const configWithHandler: oNodeConnectionConfig = {
      ...config,
      requestHandler: this.execute.bind(this),
    };

    const connection = await super.connect(configWithHandler);

    // Hook postTransmit to start background reader for reuse streams
    const originalPostTransmit = connection.postTransmit.bind(connection);
    (connection as any).postTransmit = async (stream: any) => {
      // Start background reader for bidirectional communication on reuse streams
      if ((connection as any).reusePolicy === 'reuse') {
        this.startBackgroundReader(stream, connection);
      }
      await originalPostTransmit(stream);
    };

    return connection;
  }

  /**
   * Start a background reader on the stream to handle incoming requests.
   * Uses handleIncomingStream which runs a persistent while loop,
   * allowing the stream to receive multiple messages over its lifetime.
   */
  private startBackgroundReader(
    stream: any,
    connection: oNodeConnection,
  ): void {
    const streamId = stream.p2pStream?.id || stream.id;

    // Don't start duplicate readers for the same stream
    if (this.backgroundReaders.get(streamId)) {
      this.logger.debug(
        'Background reader already running for stream:',
        streamId,
      );
      return;
    }

    this.backgroundReaders.set(streamId, true);
    this.logger.debug('Starting background reader for stream:', streamId);

    // Get the raw p2p stream
    const p2pStream = stream.p2pStream || stream;

    // Use the connection's streamHandler to handle incoming requests
    const streamHandler = (connection as any).streamHandler;

    // Start the persistent read loop in the background
    streamHandler
      .handleIncomingStream(
        p2pStream,
        (connection as any).p2pConnection,
        async (request: oRequest, s: Stream) => {
          this.logger.debug(
            'Background reader received request:',
            request.method,
          );
          return this.execute(request, s);
        },
      )
      .catch((error: any) => {
        this.logger.debug(
          'Background reader exited:',
          error?.message || 'stream closed',
        );
        this.backgroundReaders.delete(streamId);
      });
  }

  async initConnectionManager(): Promise<void> {
    this.connectionManager = new oLimitedConnectionManager({
      p2pNode: this.p2pNode,
      defaultReadTimeoutMs: this.config.connectionTimeouts?.readTimeoutMs,
      defaultDrainTimeoutMs: this.config.connectionTimeouts?.drainTimeoutMs,
      runOnLimitedConnection: true,
    });
  }
}
