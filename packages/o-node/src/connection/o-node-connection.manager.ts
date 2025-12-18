import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { Libp2p, Connection, PeerId } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';

export class oNodeConnectionManager extends oConnectionManager {
  protected p2pNode: Libp2p;
  private defaultReadTimeoutMs?: number;
  private defaultDrainTimeoutMs?: number;
  private connectionsByAddress: Map<string, Connection> = new Map();
  private pendingDialsByAddress: Map<string, Promise<Connection>> =
    new Map();

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
  private setupConnectionListeners(): void {
    this.p2pNode.addEventListener('connection:close', (event: any) => {
      const connection = event.detail as Connection | undefined;
      if (!connection) {
        return;
      }

      for (const [
        addressKey,
        cachedConnection,
      ] of this.connectionsByAddress.entries()) {
        if (cachedConnection === connection) {
          this.logger.debug(
            'Connection closed, removing from cache for address:',
            addressKey,
          );
          this.connectionsByAddress.delete(addressKey);
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
  private getAddressKey(address: oAddress): string | null {
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
  private getPeerIdFromAddress(address: oAddress): string | null {
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

  async getOrCreateConnection(
    nextHopAddress: oAddress,
    address: oAddress,
  ): Promise<Connection> {
    if (!nextHopAddress) {
      throw new Error('Invalid address passed');
    }
    // Build an address-based cache key from the next hop address
    const addressKey = this.getAddressKey(nextHopAddress);
    if (!addressKey) {
      throw new Error(
        `Unable to extract address key from address: ${nextHopAddress.toString()}`,
      );
    }

    // Check if we have a cached connection by address key
    const cachedConnection = this.connectionsByAddress.get(addressKey);
    if (cachedConnection && cachedConnection.status === 'open') {
      this.logger.debug(
        'Reusing cached connection for address:',
        nextHopAddress?.value,
      );
      return cachedConnection;
    }

    // Clean up stale connection if it exists but is not open
    if (cachedConnection && cachedConnection.status !== 'open') {
      this.logger.debug(
        'Removing stale connection for address:',
        addressKey,
      );
      this.connectionsByAddress.delete(addressKey);
    }

    // Check if libp2p has an active connection for this address
    const libp2pConnection = this.getCachedLibp2pConnection(nextHopAddress);
    if (libp2pConnection && libp2pConnection.status === 'open') {
      this.logger.debug(
        'Caching existing libp2p connection for address:',
        addressKey,
      );
      this.connectionsByAddress.set(addressKey, libp2pConnection);
      return libp2pConnection;
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
      const connection = await dialPromise;
      // Cache the established connection by address key
      this.connectionsByAddress.set(addressKey, connection);
      return connection;
    } finally {
      this.pendingDialsByAddress.delete(addressKey);
    }
  }

  private async performDial(
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
      requestHandler: config.requestHandler ?? undefined,
      reusePolicy: reuse ? 'reuse' : 'none',
    });
    const addressKey = this.getAddressKey(nextHopAddress);
    if (addressKey) {
      this.connectionsByAddress.set(addressKey, p2pConnection);
    } else {
      this.logger.error(
        'Should not happen! Failed to generate an address key for address:',
        nextHopAddress,
      );
    }
    return connection;
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

    const p2pConnection = await this.getOrCreateConnection(
      nextHopAddress,
      address,
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
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
      requestHandler: config.requestHandler ?? undefined,
    });

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

      // Check our address-based cache first
      const cachedConnection = this.connectionsByAddress.get(addressKey);
      if (cachedConnection?.status === 'open') {
        return true;
      }

      // Fall back to checking libp2p's connections
      const peerId = this.getPeerIdFromAddress(address);
      // the following works since the peer id param is not really required: https://github.com/libp2p/js-libp2p/blob/0bbf5021b53938b2bffcffca6c13c479a95c2a60/packages/libp2p/src/connection-manager/index.ts#L508
      const connections = this.p2pNode.getConnections(peerId as any); // ignore since converting to a proper peer id breaks the browser implementation

      // Check if we have at least one open connection
      const hasOpenConnection = connections.some(
        (conn) => conn.status === 'open',
      );

      // If libp2p has an open connection, update our cache
      if (hasOpenConnection) {
        const openConnection = connections.find(
          (conn) => conn.status === 'open',
        );
        if (openConnection) {
          this.connectionsByAddress.set(addressKey, openConnection);
        }
      }

      return hasOpenConnection;
    } catch (error) {
      this.logger.debug('Error checking cached connection:', error);
      return false;
    }
  }

  /**
   * Get an existing connection to the target peer (from cache or libp2p)
   * @param address - The address to get a connection for
   * @returns The Connection object or null if not found
   */
  getCachedLibp2pConnection(address: oAddress): Connection | null {
    try {
      const addressKey = this.getAddressKey(address);
      if (!addressKey) {
        return null;
      }

      // Check address-based cache first
      const cachedConnection = this.connectionsByAddress.get(addressKey);
      if (cachedConnection?.status === 'open') {
        return cachedConnection;
      }

      const peerId = this.getPeerIdFromAddress(address);
      if (!peerId) {
        return null;
      }

      // Query libp2p for connections to this peer
      const connections = this.p2pNode.getConnections();
      const filteredConnections = connections.filter(
        (conn) => conn.remotePeer?.toString() === peerId,
      );

      // Find the first open connection
      const openConnection = filteredConnections.find(
        (conn) => conn.status === 'open',
      );

      // If we found an open connection in libp2p, cache it by address key
      if (openConnection) {
        this.connectionsByAddress.set(addressKey, openConnection);
        return openConnection;
      }

      // Clean up stale cache entry if connection is no longer open
      if (cachedConnection) {
        this.connectionsByAddress.delete(addressKey);
      }

      return null;
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
    cachedConnections: number;
    pendingDials: number;
    connectionsByPeer: Array<{ peerId: string; status: string }>;
  } {
    return {
      cachedConnections: this.connectionsByAddress.size,
      pendingDials: this.pendingDialsByAddress.size,
      connectionsByPeer: Array.from(
        this.connectionsByAddress.values(),
      ).map((conn) => ({
        peerId: conn.remotePeer?.toString() ?? 'unknown',
        status: conn.status,
      })),
    };
  }

  /**
   * Clean up all stale (non-open) connections from cache
   * @returns Number of connections removed
   */
  cleanupStaleConnections(): number {
    let removed = 0;
    for (const [
      addressKey,
      connection,
    ] of this.connectionsByAddress.entries()) {
      if (connection.status !== 'open') {
        this.connectionsByAddress.delete(addressKey);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale connections`);
    }
    return removed;
  }
}
