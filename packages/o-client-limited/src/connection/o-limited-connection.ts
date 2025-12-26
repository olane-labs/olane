import { oNodeConnection } from '@olane/o-node';
import type { oNodeConnectionConfig } from '@olane/o-node';
import {
  oLimitedStreamManager,
  oLimitedStreamManagerConfig,
} from './o-limited.stream-manager.js';
import { StreamManagerEvent } from '@olane/o-node';

/**
 * oLimitedConnection extends oNodeConnection with stream reuse for limited connections.
 *
 * This is optimized for limited connections where creating new streams is expensive
 * (mobile clients, browsers, resource-constrained environments).
 *
 * Stream Architecture:
 * - 1 dedicated reader stream for receiving requests from receiver
 * - Reuses outbound streams for multiple request-response cycles
 *
 * Features:
 * - Automatic reader stream creation and maintenance
 * - Single retry on reader failure
 * - Stream reuse for outbound requests
 * - Event emission for monitoring (reader-started, reader-failed, reader-recovered)
 *
 * Default Behavior:
 * - Uses 'reuse' stream policy by default
 * - Automatically initializes dedicated reader on connection start
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

    this.streamManager.on(StreamManagerEvent.ReaderFailed, (data: any) => {
      this.logger.warn('Reader stream failed', data);
    });

    this.streamManager.on(StreamManagerEvent.ReaderRecovered, (data: any) => {
      this.logger.info('Reader stream recovered', data);
    });
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
