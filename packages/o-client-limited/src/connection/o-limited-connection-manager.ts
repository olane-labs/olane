import { oNodeConnectionManager } from '@olane/o-node';
import { oConnectionConfig } from '@olane/o-core';
import { oLimitedConnection } from './o-limited-connection.js';

export class oLimitedConnectionManager extends oNodeConnectionManager {
  private readonly _token?: string;

  /**
   * Override connect to return oPrivateConnection with _token injected
   */
  async connect(config: oConnectionConfig): Promise<oLimitedConnection> {
    const { address, nextHopAddress, callerAddress } = config;

    // First time setup connection
    try {
      const p2pConnection = await this.getOrCreateConnection(
        nextHopAddress,
        address,
      );
      const connection = new oLimitedConnection({
        nextHopAddress: nextHopAddress,
        address: address,
        p2pConnection: p2pConnection,
        callerAddress: callerAddress,
        runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
      });
      return connection;
    } catch (error) {
      this.logger.error(
        `[${callerAddress?.toString() || 'unknown'}] Error connecting to address! Next hop:` +
          nextHopAddress +
          ' With Address:' +
          address.toString(),
        error,
      );
      throw error;
    }
  }
}
