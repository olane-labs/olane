import { Stream } from '@olane/o-config';
import { oNodeConnection } from '@olane/o-node';
import type { StreamHandlerConfig } from '@olane/o-node/src/connection/stream-handler.config.js';

/**
 * oLimitedConnection extends oNodeConnection with stream reuse enabled
 * This is optimized for limited connections where creating new streams is expensive
 */
export class oLimitedConnection extends oNodeConnection {
  async getOrCreateStream(): Promise<Stream> {
    // Override to use 'reuse' policy
    const streamConfig: StreamHandlerConfig = {
      signal: this.abortSignal,
      maxOutboundStreams: process.env.MAX_OUTBOUND_STREAMS
        ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
        : 1000,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? true,
      reusePolicy: 'reuse', // Enable stream reuse
      drainTimeoutMs: this.config.drainTimeoutMs,
    };

    return this.streamHandler.getOrCreateStream(
      this.p2pConnection,
      this.nextHopAddress.protocol,
      streamConfig,
    );
  }

  async postTransmit(stream: Stream) {
    // Use StreamHandler with reuse policy - stream won't be closed
    const streamConfig: StreamHandlerConfig = {
      reusePolicy: 'reuse',
    };

    await this.streamHandler.close(stream, streamConfig);
  }
}
