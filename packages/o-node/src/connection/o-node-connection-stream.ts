import type { Stream } from '@libp2p/interface';
import { oError, oErrorCodes, oObject, type oAddress } from '@olane/o-core';
import { oNodeConnectionStreamConfig } from './interfaces/o-node-connection-stream.config.js';

/**
 * oNodeConnectionStream wraps a libp2p Stream with caller/receiver address metadata
 * to enable proper stream reuse based on address pairs rather than protocol only.
 *
 * Key features:
 * - Bidirectional cache keys: A↔B === B↔A
 * - Automatic reusability checking
 * - Idle time tracking for cleanup
 */
export class oNodeConnectionStream extends oObject {
  public readonly createdAt: number;

  constructor(
    public readonly p2pStream: Stream,
    public readonly config: oNodeConnectionStreamConfig,
  ) {
    super();
    this.createdAt = Date.now();
  }

  // callable pattern to disrupt flow if not in valid state
  validate() {
    // do nothing
    if (
      !this.p2pStream ||
      (this.p2pStream.status !== 'open' && this.p2pStream.status !== 'reset')
    ) {
      throw new oError(
        oErrorCodes.FAILED_TO_DIAL_TARGET,
        'Failed to dial target',
      );
    }
    if (this.p2pStream.status === 'reset') {
      this.logger.debug(
        'P2P stream failed to create, status:',
        this.p2pStream.status,
      );
      throw new oError(
        oErrorCodes.CONNECTION_LIMIT_REACHED,
        'Connection limit reached or configuration prevented stream creation',
      );
    }
    if (!this.isValid) {
      throw new oError(
        oErrorCodes.INVALID_STATE,
        'Session is not in a valid state',
      );
    }
  }

  /**
   * Checks if the stream is in a valid state:
   * - Stream status is 'open'
   * - Write status is 'writable'
   * - Remote read status is 'readable'
   *
   * @returns true if stream can be used
   */
  get isValid(): boolean {
    return (
      this.p2pStream.status === 'open' &&
      this.p2pStream.writeStatus === 'writable' &&
      this.p2pStream.remoteReadStatus === 'readable'
    );
  }

  /**
   * Gets the age of the stream in milliseconds
   */
  get age(): number {
    return Date.now() - this.createdAt;
  }

  async close(): Promise<void> {
    // Don't close if reuse policy is enabled
    if (this.config.reusePolicy === 'reuse') {
      this.logger.debug('Stream reuse enabled, not closing stream');
      return;
    }

    if (this.p2pStream.status === 'open') {
      try {
        // force the close for now until we can implement a proper close
        await this.p2pStream.abort(new Error('Stream closed'));
      } catch (error: any) {
        this.logger.debug('Error closing stream:', error.message);
      }
    }
  }
}
