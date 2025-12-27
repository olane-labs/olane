import { oNodeConnection } from '@olane/o-node';
import type { oNodeConnectionConfig } from '@olane/o-node';
import {
  oLimitedStreamManager,
  oLimitedStreamManagerConfig,
} from './o-limited.stream-manager.js';
import { StreamManagerEvent } from '@olane/o-node';
import type { oRequest, oResponse } from '@olane/o-core';

/**
 * oLimitedConnection extends oNodeConnection with dual persistent streams for limited connections.
 *
 * This is optimized for limited connections where the caller cannot be dialed
 * (browser clients, mobile clients, resource-constrained environments).
 *
 * Stream Architecture:
 * - 1 dedicated reader stream for receiving requests from receiver
 * - 1 dedicated writer stream for sending responses back to receiver
 * - Ephemeral streams for caller-originated requests (one per request)
 *
 * Features:
 * - Automatic reader/writer stream creation and maintenance
 * - Single retry on reader failure
 * - Ephemeral streams for outbound requests
 * - Response routing via _streamId and _responseConnectionId in request params
 * - Event emission for monitoring (reader-started, writer-started, reader-failed, reader-recovered)
 *
 * Default Behavior:
 * - Uses 'reuse' stream policy by default
 * - Automatically initializes persistent streams on connection start
 */
export class oLimitedConnection extends oNodeConnection {
  declare streamManager: oLimitedStreamManager;

  constructor(config: oNodeConnectionConfig) {
    const reusePolicy = config.reusePolicy ?? 'reuse';
    super({
      ...config,
      reusePolicy,
    });

    // Replace the base streamManager with our limited version
    const protocol =
      this.nextHopAddress.protocol +
      (reusePolicy === 'reuse' ? '/reuse' : '');

    const limitedConfig: oLimitedStreamManagerConfig = {
      p2pConnection: this.p2pConnection,
      protocol,
      remoteAddress: this.nextHopAddress,
      requestHandler: config.requestHandler,
    };

    this.streamManager = new oLimitedStreamManager(limitedConfig);

    // Set up event listeners for monitoring
    this.streamManager.on(StreamManagerEvent.ReaderStarted, (data: any) => {
      this.logger.info('Reader stream started', data);
    });

    this.streamManager.on(StreamManagerEvent.WriterStarted, (data: any) => {
      this.logger.info('Writer stream started', data);
    });

    this.streamManager.on(StreamManagerEvent.ReaderFailed, (data: any) => {
      this.logger.warn('Reader stream failed', data);
    });

    this.streamManager.on(StreamManagerEvent.ReaderRecovered, (data: any) => {
      this.logger.info('Reader stream recovered', data);
    });
  }

  /**
   * Override transmit to inject response routing params
   * Adds _streamId and _responseConnectionId to enable receiver to route responses
   * to the persistent writer stream
   */
  async transmit(request: oRequest): Promise<oResponse> {
    // Wait for stream manager initialization to ensure writer stream is available
    if (!this.streamManager.isInitialized) {
      await this.streamManager.initialize();
    }

    // Inject response routing params if writer stream exists
    if (this.streamManager.writerStream) {
      request.params._streamId = this.streamManager.writerStream.p2pStream.id;
      request.params._responseConnectionId = this.p2pConnection.id;

      this.logger.debug('Injected response routing params', {
        streamId: request.params._streamId,
        responseConnectionId: request.params._responseConnectionId,
      });
    } else {
      this.logger.warn(
        'Writer stream not available, response routing params not injected',
      );
    }

    // Call parent transmit with modified request
    return await super.transmit(request);
  }

  /**
   * Override close to cleanup stream manager properly
   */
  async close(): Promise<void> {
    this.logger.debug('Closing limited connection');
    await this.streamManager.close();
    await super.close();
  }
}
