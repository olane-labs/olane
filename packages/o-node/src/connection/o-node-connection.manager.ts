import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { oConnection } from '@olane/o-core';
import { Libp2p } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';

export class oNodeConnectionManager extends oConnectionManager {
  private p2pNode: Libp2p;

  constructor(config: oNodeConnectionManagerConfig) {
    super(config);
    this.p2pNode = config.p2pNode;
  }

  /**
   * Connect to a given address with exponential backoff retry
   * @param address - The address to connect to
   * @returns The connection object
   */
  async connect(config: oConnectionConfig): Promise<oNodeConnection> {
    const { address, nextHopAddress, callerAddress } = config;

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
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 1000; // Start with 1 second
    const MAX_DELAY_MS = 10000; // Cap at 10 seconds

    // first time setup connection with retry logic
    let lastError: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate exponential backoff delay: 1s, 2s, 4s, 8s (capped at MAX_DELAY_MS)
          const delay = Math.min(
            BASE_DELAY_MS * Math.pow(2, attempt - 1),
            MAX_DELAY_MS,
          );
          this.logger.debug(
            `Retry attempt ${attempt}/${MAX_RETRIES} for ${nextHopAddress.toString()} after ${delay}ms delay`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

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
        });

        if (attempt > 0) {
          this.logger.info(
            `Successfully connected to ${nextHopAddress.toString()} on retry attempt ${attempt}`,
          );
        }

        // this.cache.set(nextHopAddress.toString(), connection);
        return connection;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `[${callerAddress?.toString() || 'unknown'}] Connection attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${nextHopAddress.toString()}: ${error instanceof Error ? error.message : String(error)}`,
        );

        // Don't retry on the last attempt
        if (attempt === MAX_RETRIES) {
          break;
        }
      }
    }

    // All retries exhausted
    this.logger.error(
      `[${callerAddress?.toString() || 'unknown'}] Failed to connect after ${MAX_RETRIES + 1} attempts to address! Next hop: ${nextHopAddress} With Address: ${address.toString()}`,
      lastError,
    );
    throw lastError;
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
