import { oAddress } from '../router/o-address.js';
import { oConnection } from './o-connection.js';
import { oConnectionManagerConfig } from './interfaces/connection-manager.config.js';
import { oObject } from '../core/o-object.js';
import { oConnectionConfig } from './interfaces/connection.config.js';

export abstract class oConnectionManager extends oObject {
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
    return false;
  }

  getCachedConnection(address: oAddress): oConnection | null {
    return null;
  }
}
