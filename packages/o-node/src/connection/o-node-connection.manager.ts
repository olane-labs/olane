import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { oConnection } from '@olane/o-core';
import { Libp2p } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';

export class oNodeConnectionManager extends oConnectionManager {
  private p2pNode: Libp2p;
  private defaultReadTimeoutMs?: number;
  private defaultDrainTimeoutMs?: number;

  constructor(config: oNodeConnectionManagerConfig) {
    super(config);
    this.p2pNode = config.p2pNode;
    this.defaultReadTimeoutMs = config.defaultReadTimeoutMs;
    this.defaultDrainTimeoutMs = config.defaultDrainTimeoutMs;
  }

  /**
   * Connect to a given address with exponential backoff retry
   * @param address - The address to connect to
   * @returns The connection object
   */
  async connect(config: oConnectionConfig): Promise<oNodeConnection> {
    const {
      address,
      nextHopAddress,
      callerAddress,
      readTimeoutMs,
      drainTimeoutMs,
    } = config;

    // check if we already have a connection to this address
    // TODO: how can we enable caching of connections & connection lifecycles
    if (this.isCached(nextHopAddress)) {
      const cachedConnection = this.getCachedConnection(
        nextHopAddress,
      ) as oNodeConnection;
      if (
        cachedConnection &&
        cachedConnection.p2pConnection.status === 'open'
      ) {
        this.logger.debug(
          'Using cached connection for address: ' + address.toString(),
        );
        return cachedConnection as oNodeConnection;
      } else {
        // cached item is not valid, remove it
        this.cache.delete(nextHopAddress.toString());
      }
    }

    // Retry configuration for handling transient connection failures

    const p2pConnection = await this.p2pNode.dial(
      (nextHopAddress as oNodeAddress).libp2pTransports.map((ma) =>
        ma.toMultiaddr(),
      ),
    );
    const connection = new oNodeConnection({
      nextHopAddress: nextHopAddress,
      address: address,
      p2pConnection: p2pConnection,
      callerAddress: callerAddress,
      readTimeoutMs: readTimeoutMs ?? this.defaultReadTimeoutMs,
      drainTimeoutMs: drainTimeoutMs ?? this.defaultDrainTimeoutMs,
      isStream: config.isStream ?? false,
      abortSignal: config.abortSignal,
    });

    // this.cache.set(nextHopAddress.toString(), connection);
    return connection;
  }

  isCached(address: oAddress): boolean {
    return this.cache.has(address.toString());
  }

  getCachedConnection(address: oAddress): oConnection | null {
    const key = address.toString();
    try {
      const connection = this.cache.get(key);
      if (!connection) {
        throw new Error('Connection not found in cache');
      }
      connection.validate();
      return connection;
    } catch (error) {
      this.cache.delete(key);
      this.logger.error('Error getting cached connection:', error);
    }
    return null;
  }
}
