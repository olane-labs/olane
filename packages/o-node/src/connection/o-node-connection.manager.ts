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
  private connectionsByAddress: Map<string, Connection[]> = new Map();
  private pendingDialsByAddress: Map<string, Promise<Connection>> = new Map();
  /** Cache of oNodeConnection instances keyed by p2p connection ID */
  private nodeConnectionByConnectionId: Map<string, oNodeConnection> =
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

      // Clean up libp2p connection cache
      // for (const [
      //   addressKey,
      //   cachedConnections,
      // ] of this.connectionsByAddress.entries()) {
      //   const index = cachedConnections.indexOf(connection);
      //   if (index !== -1) {
      //     this.logger.debug(
      //       'Connection closed, removing from cache for address:',
      //       addressKey,
      //     );
      //     cachedConnections.splice(index, 1);

      //     // Remove the address key entirely if no connections remain
      //     if (cachedConnections.length === 0) {
      //       this.connectionsByAddress.delete(addressKey);
      //     } else {
      //       this.connectionsByAddress.set(addressKey, cachedConnections);
      //     }
      //   }
      // }

      // Clean up oNodeConnection cache by connection ID
      const connectionId = connection.id;
      if (this.nodeConnectionByConnectionId.has(connectionId)) {
        this.logger.debug(
          'Connection closed, removing oNodeConnection for connection ID:',
          connectionId,
        );
        this.nodeConnectionByConnectionId.delete(connectionId);
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

  /**
   * Select the best connection from an array of connections.
   * Prioritizes connections with active streams, then by direction based on context.
   *
   * @param connections - Array of connections to choose from
   * @param reuseContext - If true, prefer inbound connections; otherwise prefer outbound
   * @returns The best connection or null if none are suitable
   */
  private selectBestConnection(
    connections: Connection[],
    reuseContext: boolean = false,
  ): Connection | null {
    // Filter to only open connections
    const openConnections = connections.filter((c) => c.status === 'open');

    if (openConnections.length === 0) {
      return null;
    }

    // Priority 1: Connections with active o-protocol streams
    const connectionsWithStreams = openConnections
      .map((conn) => ({
        conn,
        activeStreamCount: conn.streams.filter(
          (s) =>
            s.protocol.includes('/o/') &&
            s.status === 'open' &&
            s.writeStatus === 'writable' &&
            (s as any).remoteReadStatus === 'readable',
        ).length,
      }))
      .filter((item) => item.activeStreamCount > 0)
      .sort((a, b) => b.activeStreamCount - a.activeStreamCount);

    if (connectionsWithStreams.length > 0) {
      this.logger.debug('Selected connection with active streams', {
        streamCount: connectionsWithStreams[0].activeStreamCount,
      });
      return connectionsWithStreams[0].conn;
    }

    // Priority 2: Based on reuse context
    if (reuseContext) {
      // Prefer inbound connections
      const inbound = openConnections.find(
        (c) => (c as any).direction === 'inbound' || !(c as any).direction, // fallback if direction not available
      );
      if (inbound) {
        this.logger.debug('Selected inbound connection (reuse context)');
        return inbound;
      }
    } else {
      // Prefer outbound connections
      const outbound = openConnections.find(
        (c) => (c as any).direction === 'outbound',
      );
      if (outbound) {
        this.logger.debug('Selected outbound connection (non-reuse context)');
        return outbound;
      }
    }

    // Priority 3: Return first open connection
    this.logger.debug(
      'Selected first available open connection',
      connectionsWithStreams,
    );
    return openConnections[0];
  }

  /**
   * Get a cached oNodeConnection for the given p2p connection if it exists and is valid.
   * @param p2pConnection - The p2p connection to look up
   * @returns A valid oNodeConnection or null if none found
   */
  private getCachedNodeConnection(
    p2pConnection: Connection,
  ): oNodeConnection | null {
    const cached = this.nodeConnectionByConnectionId.get(p2pConnection.id);
    if (cached && cached.p2pConnection?.status === 'open') {
      return cached;
    }
    // Clean up stale entry if connection is no longer open
    if (cached) {
      this.nodeConnectionByConnectionId.delete(p2pConnection.id);
    }
    return null;
  }

  /**
   * Cache an oNodeConnection by its p2p connection ID for potential reuse.
   * @param conn - The oNodeConnection to cache
   */
  private cacheNodeConnection(conn: oNodeConnection): void {
    this.nodeConnectionByConnectionId.set(conn.p2pConnection.id, conn);
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

    // Check if we have cached connections by address key
    const cachedConnections = this.connectionsByAddress.get(addressKey) || [];
    const bestConnection = this.selectBestConnection(cachedConnections, false);
    if (bestConnection) {
      this.logger.debug(
        'Reusing cached connection for address:',
        nextHopAddress?.value,
        bestConnection.id,
      );
      return bestConnection;
    }

    // Clean up stale connections if they exist but are not open
    if (cachedConnections.length > 0) {
      const openConnections = cachedConnections.filter(
        (c) => c.status === 'open',
      );
      if (openConnections.length === 0) {
        this.logger.debug(
          'Removing all stale connections for address:',
          addressKey,
        );
        this.connectionsByAddress.delete(addressKey);
      } else if (openConnections.length < cachedConnections.length) {
        this.logger.debug(
          'Cleaning up some stale connections for address:',
          addressKey,
        );
        this.connectionsByAddress.set(addressKey, openConnections);
      }
    }

    // Check if libp2p has an active connection for this address
    const libp2pConnection = this.getCachedLibp2pConnection(nextHopAddress);
    if (libp2pConnection && libp2pConnection.status === 'open') {
      this.logger.debug(
        'Caching existing libp2p connection for address:',
        addressKey,
      );
      const connections = this.connectionsByAddress.get(addressKey) || [];
      connections.push(libp2pConnection);
      this.connectionsByAddress.set(addressKey, connections);
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
      // Add the established connection to the cache array
      const connections = this.connectionsByAddress.get(addressKey) || [];
      connections.push(connection);
      this.connectionsByAddress.set(addressKey, connections);
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
    // Cache the new connection by its p2p connection ID
    this.cacheNodeConnection(connection);

    const addressKey = this.getAddressKey(nextHopAddress);
    if (addressKey) {
      const connections = this.connectionsByAddress.get(addressKey) || [];
      // Only add if not already in the cache
      if (!connections.includes(p2pConnection)) {
        connections.push(p2pConnection);
        this.connectionsByAddress.set(addressKey, connections);
      }
    } else {
      this.logger.error(
        'Should not happen! Failed to generate an address key for address:',
        nextHopAddress,
      );
    }
    return connection;
  }

  /**
   * Connect to a given address, reusing oNodeConnection and libp2p connections when possible
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

    // First get or create the underlying p2p connection
    const p2pConnection = await this.getOrCreateConnection(
      nextHopAddress,
      address,
    );

    // Check for existing valid oNodeConnection for this p2p connection
    const existingConnection = this.getCachedNodeConnection(p2pConnection);
    if (existingConnection) {
      this.logger.debug(
        'Reusing cached oNodeConnection for connection ID:',
        p2pConnection.id,
      );
      return existingConnection;
    }

    // No valid cached connection, create new one
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

    // Cache the new connection by its p2p connection ID
    this.cacheNodeConnection(connection);

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
      const cachedConnections = this.connectionsByAddress.get(addressKey) || [];
      const bestConnection = this.selectBestConnection(
        cachedConnections,
        false,
      );
      if (bestConnection) {
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
          const existingConnections =
            this.connectionsByAddress.get(addressKey) || [];
          if (!existingConnections.includes(openConnection)) {
            existingConnections.push(openConnection);
            this.connectionsByAddress.set(addressKey, existingConnections);
          }
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
      const cachedConnections = this.connectionsByAddress.get(addressKey) || [];
      const bestConnection = this.selectBestConnection(
        cachedConnections,
        false,
      );
      if (bestConnection) {
        return bestConnection;
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

      // Find open connections
      const openConnections = filteredConnections.filter(
        (conn) => conn.status === 'open',
      );

      // If we found open connections in libp2p, add them to cache and select best
      if (openConnections.length > 0) {
        const existingConnections =
          this.connectionsByAddress.get(addressKey) || [];

        // Add any new connections that aren't already cached
        for (const conn of openConnections) {
          if (!existingConnections.includes(conn)) {
            existingConnections.push(conn);
          }
        }

        this.connectionsByAddress.set(addressKey, existingConnections);
        return this.selectBestConnection(existingConnections, false);
      }

      // Clean up stale cache entries if connections are no longer open
      if (cachedConnections.length > 0) {
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
    cachedAddresses: number;
    totalCachedConnections: number;
    pendingDials: number;
    cachedNodeConnections: number;
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

    for (const [
      addressKey,
      connections,
    ] of this.connectionsByAddress.entries()) {
      for (const conn of connections) {
        allConnections.push({
          peerId: conn.remotePeer?.toString() ?? 'unknown',
          status: conn.status,
          addressKey,
        });
      }
    }

    return {
      cachedAddresses: this.connectionsByAddress.size,
      totalCachedConnections: allConnections.length,
      pendingDials: this.pendingDialsByAddress.size,
      cachedNodeConnections: this.nodeConnectionByConnectionId.size,
      connectionsByPeer: allConnections,
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
      connections,
    ] of this.connectionsByAddress.entries()) {
      const openConnections = connections.filter(
        (conn) => conn.status === 'open',
      );
      const staleCount = connections.length - openConnections.length;

      if (staleCount > 0) {
        removed += staleCount;

        if (openConnections.length === 0) {
          // Remove the entire entry if no connections remain
          this.connectionsByAddress.delete(addressKey);
        } else {
          // Keep only the open connections
          this.connectionsByAddress.set(addressKey, openConnections);
        }
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale connections`);
    }
    return removed;
  }

  /**
   * Clean up all stale oNodeConnections from cache
   * @returns Number of oNodeConnections removed
   */
  cleanupStaleNodeConnections(): number {
    let removed = 0;
    for (const [
      connectionId,
      conn,
    ] of this.nodeConnectionByConnectionId.entries()) {
      if (conn.p2pConnection?.status !== 'open') {
        this.nodeConnectionByConnectionId.delete(connectionId);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} stale oNodeConnections`);
    }
    return removed;
  }
}
