import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { Logger } from '@olane/o-core';
import { oConnection } from '@olane/o-core';
import { oConnectionManagerConfig } from '@olane/o-core';
import { Libp2p, Multiaddr } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config';
import { oNodeAddress } from '../router/o-node.address';
import { oNodeConnection } from './o-node-connection';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config';

export class oNodeConnectionManager extends oConnectionManager {
  private p2pNode: Libp2p;

  constructor(config: oNodeConnectionManagerConfig) {
    super(config);
    this.p2pNode = config.p2pNode;
  }

  /**
   * Connect to a given address
   * @param address - The address to connect to
   * @returns The connection object
   */
  async connect(config: oConnectionConfig): Promise<oNodeConnection> {
    const { address, nextHopAddress, callerAddress } = config;

    // check if we already have a connection to this address
    // TODO: how can we enable caching of connections & connection lifecycles
    // if (this.isCached(nextHopAddress)) {
    //   const cachedConnection = this.getCachedConnection(nextHopAddress);
    //   if (cachedConnection) {
    //     this.logger.debug(
    //       'Using cached connection for address: ' + address.toString(),
    //     );
    //     return cachedConnection;
    //   } else {
    //     // cached item is not valid, remove it
    //     this.cache.delete(nextHopAddress.toString());
    //   }
    // }

    // first time setup connection
    try {
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
      // this.cache.set(address.toString(), connection);
      return connection;
    } catch (error) {
      this.logger.error('Error connecting to address: ', error);
      throw error;
    }
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
