import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { Libp2p, Connection, PeerId } from '@olane/o-config';
import { peerIdFromString } from '@libp2p/peer-id';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';

export class oNodeConnectionManager extends oConnectionManager {
  private p2pNode: Libp2p;
  private defaultReadTimeoutMs?: number;
  private defaultDrainTimeoutMs?: number;

  constructor(readonly config: oNodeConnectionManagerConfig) {
    super(config);
    this.p2pNode = config.p2pNode;
    this.defaultReadTimeoutMs = config.defaultReadTimeoutMs;
    this.defaultDrainTimeoutMs = config.defaultDrainTimeoutMs;
  }

  /**
   * Connect to a given address, reusing libp2p connections when possible
   * @param config - Connection configuration
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

    // Check if libp2p already has an active connection to this peer
    const existingConnection = this.getCachedLibp2pConnection(
      nextHopAddress,
    ) as Connection | null;

    let p2pConnection: Connection;

    if (existingConnection && existingConnection.status === 'open') {
      this.logger.debug(
        'Reusing existing libp2p connection for address: ' + address.toString(),
      );
      p2pConnection = existingConnection;
    } else {
      // No existing connection or connection is closed, dial a new one
      this.logger.debug(
        'Dialing new connection for address: ' + address.toString(),
      );
      p2pConnection = await this.p2pNode.dial(
        (nextHopAddress as oNodeAddress).libp2pTransports.map((ma) =>
          ma.toMultiaddr(),
        ),
      );
    }

    const connection = new oNodeConnection({
      nextHopAddress: nextHopAddress,
      address: address,
      p2pConnection: p2pConnection,
      callerAddress: callerAddress,
      readTimeoutMs: readTimeoutMs ?? this.defaultReadTimeoutMs,
      drainTimeoutMs: drainTimeoutMs ?? this.defaultDrainTimeoutMs,
      isStream: config.isStream ?? false,
      abortSignal: config.abortSignal,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
    });

    return connection;
  }

  /**
   * Check if libp2p has an active connection to the target peer
   * @param address - The address to check
   * @returns true if an active connection exists
   */
  isCached(address: oAddress): boolean {
    try {
      const nodeAddress = address as oNodeAddress;
      if (
        !nodeAddress.libp2pTransports ||
        nodeAddress.libp2pTransports.length === 0
      ) {
        return false;
      }

      // Extract peer ID from the first transport
      const peerIdString = nodeAddress.libp2pTransports[0].toPeerId();
      if (!peerIdString) {
        return false;
      }
      this.logger.debug('Peer ID string:', peerIdString);

      // the following works since the peer id param is not really required: https://github.com/libp2p/js-libp2p/blob/0bbf5021b53938b2bffcffca6c13c479a95c2a60/packages/libp2p/src/connection-manager/index.ts#L508
      const connections = this.p2pNode.getConnections(peerIdString as any); // ignore since converting to a proper peer id breaks the browser implementation

      // Check if we have at least one open connection
      return connections.some((conn) => conn.status === 'open');
    } catch (error) {
      this.logger.debug('Error checking cached connection:', error);
      return false;
    }
  }

  /**
   * Get an existing libp2p connection to the target peer
   * @param address - The address to get a connection for
   * @returns The libp2p Connection object or null if not found
   */
  getCachedLibp2pConnection(address: oAddress): Connection | null {
    try {
      const nodeAddress = address as oNodeAddress;
      if (
        !nodeAddress.libp2pTransports ||
        nodeAddress.libp2pTransports.length === 0
      ) {
        return null;
      }

      // Extract peer ID from the first transport
      const peerIdString = nodeAddress.libp2pTransports[0].toPeerId();
      if (!peerIdString) {
        return null;
      }

      const connections = this.p2pNode.getConnections(peerIdString as any); // ignore since converting to a proper peer id breaks the browser implementation

      // Return the first open connection, or null if none exist
      const openConnection = connections.find((conn) => conn.status === 'open');
      return openConnection || null;
    } catch (error) {
      this.logger.debug('Error getting cached connection:', error);
      return null;
    }
  }
}
