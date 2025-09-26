import { oAddress } from '../router/o-address.js';
import { oConnection } from './o-connection.js';
import { oConnectionManagerConfig } from './interfaces/connection-manager.config.js';
import { oObject } from '../core/o-object.js';
import { oConnectionConfig } from './interfaces/connection.config.js';

export abstract class oConnectionManager extends oObject {
  protected cache: Map<string, oConnection> = new Map();

  constructor(readonly config: oConnectionManagerConfig) {
    super();
  }

  /**
   * Connect to a given address
   * @param address - The address to connect to
   * @returns The connection object
   */
  abstract connect(config: oConnectionConfig): Promise<oConnection>;

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
