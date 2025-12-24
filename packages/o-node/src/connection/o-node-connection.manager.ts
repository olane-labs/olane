import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { Libp2p, Connection } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';

export class oNodeConnectionManager extends oConnectionManager {
  protected p2pNode: Libp2p;
  protected defaultReadTimeoutMs?: number;
  protected defaultDrainTimeoutMs?: number;
  /** Single cache of oNodeConnection instances keyed by address */
  protected cachedConnections: Map<string, oNodeConnection[]> = new Map();
  protected pendingDialsByAddress: Map<string, Promise<Connection>> = new Map();

  constructor(readonly config: oNodeConnectionManagerConfig) {
    super(config);
    this.p2pNode = config.p2pNode;
    this.defaultReadTimeoutMs = config.defaultReadTimeoutMs;
    this.defaultDrainTimeoutMs = config.defaultDrainTimeoutMs;
    this.logger.setNamespace(`oNodeConnectionManager[${config.originAddress}]`);

    // Set up connection lifecycle listeners for cache management
    this.setupConnectionListeners();
  }

  /**
   * Set up listeners to maintain connection cache state
   */
  protected setupConnectionListeners(): void {
    this.p2pNode.addEventListener('connection:close', (event: any) => {
      const connection = event.detail as Connection | undefined;
      if (!connection) {
        return;
      }

      const connectionId = connection.id;

      // Clean up cached connections by filtering out the closed connection
      for (const [key, conns] of this.cachedConnections.entries()) {
        const filtered = conns.filter(
          (c) => c.p2pConnection.id !== connectionId,
        );
        if (filtered.length === 0) {
          this.logger.debug(
            'Connection closed, removing all cached connections for address:',
            key,
          );
          this.cachedConnections.delete(key);
        } else if (filtered.length !== conns.length) {
          this.logger.debug(
            'Connection closed, updating cached connections for address:',
            key,
          );
          this.cachedConnections.set(key, filtered);
        }
      }
    });
  }

  /**
   * Build a stable cache key from an address.
   *
   * We key the cache by address value (e.g., "o://my-tool") to maintain
   * a simple one-to-one mapping between addresses and connections.
   */
  protected getAddressKey(address: oAddress): string | null {
    try {
      return address.value || null;
    } catch (error) {
      this.logger.debug('Error extracting address key from address:', error);
      return null;
    }
  }

  /**
   * Extract peer ID string from an address
   * @param address - The address to extract peer ID from
   * @returns The peer ID string or null if not found
   */
  protected getPeerIdFromAddress(address: oAddress): string | null {
    try {
      const nodeAddress = address as oNodeAddress;
      if (!nodeAddress.libp2pTransports?.length) {
        return null;
      }
      return nodeAddress.libp2pTransports[0].toPeerId() || null;
    } catch (error) {
      this.logger.debug('Error extracting peer ID from address:', error);
      return null;
    }
  }

  /**
   * Get the first valid (open) connection for the given address key.
   * Cleans up stale connections from the cache automatically.
   *
   * @param addressKey - The address key to look up
   * @returns A valid oNodeConnection or null if none found
   */
  protected getValidConnection(addressKey: string): oNodeConnection | null {
    const connections = this.cachedConnections.get(addressKey) || [];

    // Filter to open connections
    const valid = connections.filter((c) => c.p2pConnection?.status === 'open');

    // Update cache if we cleaned any stale connections
    if (valid.length !== connections.length) {
      if (valid.length === 0) {
        this.cachedConnections.delete(addressKey);
      } else {
        this.cachedConnections.set(addressKey, valid);
      }
    }

    return valid[0] ?? null;
  }

  /**
   * Cache an oNodeConnection by its address key.
   * @param conn - The oNodeConnection to cache
   * @param addressKey - The address key to cache under
   */
  protected cacheConnection(conn: oNodeConnection, addressKey: string): void {
    this.logger.debug(
      'Caching connection for address:',
      addressKey,
      conn.p2pConnection.id,
      conn.p2pConnection.direction,
    );
    const existing = this.cachedConnections.get(addressKey) || [];
    existing.push(conn);
    this.cachedConnections.set(addressKey, existing);
  }

  /**
   * Get oNodeConnection by libp2p Connection reference
   * Used to find the correct oNodeConnection for incoming streams
   * @param p2pConnection - The libp2p connection to search for
   * @returns The oNodeConnection or undefined if not found
   */
  getConnectionByP2pConnection(
    p2pConnection: Connection,
  ): oNodeConnection | undefined {
    // Search through all cached connections
    for (const connections of this.cachedConnections.values()) {
      const found = connections.find(
        (conn) => conn.p2pConnection.id === p2pConnection.id,
      );
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  /**
   * Get or create a raw p2p connection to the given address.
   * Subclasses can override connect() and use this method to get the underlying p2p connection.
   */
  protected async getOrCreateP2pConnection(
    nextHopAddress: oAddress,
    addressKey: string,
  ): Promise<Connection> {
    // Check if libp2p already has an active connection for this peer
    const peerId = this.getPeerIdFromAddress(nextHopAddress);
    if (peerId) {
      const connections = this.p2pNode.getConnections();
      const existingConnection = connections.find(
        (conn) =>
          conn.remotePeer?.toString() === peerId && conn.status === 'open',
      );
      if (existingConnection) {
        this.logger.debug(
          'Found existing libp2p connection for address:',
          addressKey,
        );
        return existingConnection;
      }
    }

    // Check if dial is already in progress for this address key
    const pendingDial = this.pendingDialsByAddress.get(addressKey);
    if (pendingDial) {
      this.logger.debug('Awaiting existing dial for address:', addressKey);
      return pendingDial;
    }

    // Start new dial and cache the promise by address key
    const dialPromise = this.performDial(nextHopAddress, addressKey);
    this.pendingDialsByAddress.set(addressKey, dialPromise);

    try {
      return await dialPromise;
    } finally {
      this.pendingDialsByAddress.delete(addressKey);
    }
  }

  protected async performDial(
    nextHopAddress: oAddress,
    addressKey: string,
  ): Promise<Connection> {
    this.logger.debug('Dialing new connection', {
      address: nextHopAddress.value,
      addressKey,
    });

    const connection = await this.p2pNode.dial(
      (nextHopAddress as oNodeAddress).libp2pTransports.map((ma) =>
        ma.toMultiaddr(),
      ),
    );

    this.logger.debug('Successfully dialed connection', {
      addressKey,
      status: connection.status,
      remotePeer: connection.remotePeer?.toString(),
    });

    return connection;
  }

  async answer(
    config: oConnectionConfig & { p2pConnection: Connection; reuse?: boolean },
  ): Promise<oNodeConnection> {
    const {
      address,
      nextHopAddress,
      callerAddress,
      readTimeoutMs,
      drainTimeoutMs,
      p2pConnection,
      reuse,
    } = config;

    const addressKey = this.getAddressKey(nextHopAddress);
    if (!addressKey) {
      this.logger.error(
        'Failed to generate an address key for address:',
        nextHopAddress,
      );
      throw new Error(
        `Unable to extract address key from address: ${nextHopAddress.toString()}`,
      );
    }

    // Check if we already have a cached connection for this address with the same connection id
    const connections = this.cachedConnections.get(addressKey) || [];

    // Filter to open connections
    const validConnections = connections.filter(
      (c) =>
        c.p2pConnection?.id === p2pConnection.id &&
        c.p2pConnection?.status === 'open',
    );
    if (validConnections.length > 0) {
      const existingConnection = validConnections[0];
      this.logger.debug(
        'Reusing cached connection for answer:',
        addressKey,
        existingConnection.p2pConnection.id,
      );
      return existingConnection;
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
      reusePolicy: reuse ? 'reuse' : 'none',
    });

    // Cache the new connection
    this.cacheConnection(connection, addressKey);

    return connection;
  }

  /**
   * Connect to a given address, reusing oNodeConnection when possible
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

    if (!nextHopAddress) {
      throw new Error('Invalid address passed');
    }

    const addressKey = this.getAddressKey(nextHopAddress);
    if (!addressKey) {
      throw new Error(
        `Unable to extract address key from address: ${nextHopAddress.toString()}`,
      );
    }

    // Check for existing valid cached connection
    const existingConnection = this.getValidConnection(addressKey);
    if (existingConnection) {
      this.logger.debug(
        'Reusing cached connection for address:',
        addressKey,
        existingConnection.p2pConnection.id,
      );
      return existingConnection;
    }

    // Get or create the underlying p2p connection
    const p2pConnection = await this.getOrCreateP2pConnection(
      nextHopAddress,
      addressKey,
    );

    // Create new oNodeConnection
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

    // Cache the new connection
    this.cacheConnection(connection, addressKey);

    return connection;
  }

  /**
   * Check if we have an active connection to the target peer
   * @param address - The address to check
   * @returns true if an active connection exists
   */
  isCached(address: oAddress): boolean {
    try {
      const addressKey = this.getAddressKey(address);
      if (!addressKey) {
        return false;
      }

      return this.getValidConnection(addressKey) !== null;
    } catch (error) {
      this.logger.debug('Error checking cached connection:', error);
      return false;
    }
  }

  /**
   * Get an existing cached oNodeConnection for the target address
   * @param address - The address to get a connection for
   * @returns The oNodeConnection or null if not found
   */
  getCachedConnection(address: oAddress): oNodeConnection | null {
    try {
      const addressKey = this.getAddressKey(address);
      if (!addressKey) {
        return null;
      }

      return this.getValidConnection(addressKey);
    } catch (error) {
      this.logger.debug('Error getting cached connection:', error);
      return null;
    }
  }

  /**
   * Get cache statistics for monitoring and debugging
   * @returns Object containing cache statistics
   */
  getCacheStats(): {
    cachedAddresses: number;
    totalCachedConnections: number;
    pendingDials: number;
    connectionsByPeer: Array<{
      peerId: string;
      status: string;
      addressKey: string;
    }>;
  } {
    const allConnections: Array<{
      peerId: string;
      status: string;
      addressKey: string;
    }> = [];

    for (const [addressKey, connections] of this.cachedConnections.entries()) {
      for (const conn of connections) {
        allConnections.push({
          peerId: conn.p2pConnection?.remotePeer?.toString() ?? 'unknown',
          status: conn.p2pConnection?.status ?? 'unknown',
          addressKey,
        });
      }
    }

    return {
      cachedAddresses: this.cachedConnections.size,
      totalCachedConnections: allConnections.length,
      pendingDials: this.pendingDialsByAddress.size,
      connectionsByPeer: allConnections,
    };
  }

  /**
   * Clean up all stale (non-open) connections from cache
   * @returns Number of connections removed
   */
  cleanupStaleConnections(): number {
    let removed = 0;
    for (const [addressKey, connections] of this.cachedConnections.entries()) {
      const openConnections = connections.filter(
        (conn) => conn.p2pConnection?.status === 'open',
      );
      const staleCount = connections.length - openConnections.length;

      if (staleCount > 0) {
        removed += staleCount;

        if (openConnections.length === 0) {
          this.cachedConnections.delete(addressKey);
        } else {
          this.cachedConnections.set(addressKey, openConnections);
        }
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale connections`);
    }
    return removed;
  }
}
