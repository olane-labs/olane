import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { Libp2p, Connection } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';

/**
 * Manages oNodeConnection instances, reusing connections when possible.
 */
export class oNodeConnectionManager extends oConnectionManager {
  protected p2pNode: Libp2p;
  protected defaultReadTimeoutMs?: number;
  protected defaultDrainTimeoutMs?: number;
  /** Single cache of oNodeConnection instances keyed by address */
  protected cachedConnections: Map<string, oNodeConnection> = new Map();
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
      this.cachedConnections.delete(connectionId);
    });
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
   * Cache an oNodeConnection by its address key.
   * @param conn - The oNodeConnection to cache
   * @param addressKey - The address key to cache under
   */
  protected cacheConnection(conn: oNodeConnection): void {
    this.logger.debug(
      'Caching connection for address:',
      conn.p2pConnection.id,
      conn.p2pConnection.direction,
    );
    this.cachedConnections.set(conn.p2pConnection.id, conn);
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

    // Check if we already have a cached connection for this address with the same connection id
    const existingConnection = this.cachedConnections.get(p2pConnection.id);

    if (existingConnection) {
      this.logger.debug(
        'Reusing cached connection for answer:',
        existingConnection.p2pConnection.id,
      );
      return existingConnection;
    }

    const connection = new oNodeConnection({
      nextHopAddress: nextHopAddress,
      address: address,
      p2pConnection: p2pConnection,
      p2pNode: this.p2pNode,
      callerAddress: callerAddress,
      readTimeoutMs: readTimeoutMs ?? this.defaultReadTimeoutMs,
      drainTimeoutMs: drainTimeoutMs ?? this.defaultDrainTimeoutMs,
      isStream: config.isStream ?? false,
      abortSignal: config.abortSignal,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
      reusePolicy: reuse ? 'reuse' : 'none',
    });

    // Cache the new connection
    this.cacheConnection(connection);

    return connection;
  }

  getConnectionFromAddress(address: oAddress): oNodeConnection | null {
    const protocol = address.protocol;
    for (const conn of this.cachedConnections.values()) {
      // if nextHopAddress protocol matches, return conn
      if (conn.nextHopAddress.protocol === protocol) {
        return conn;
      }
      // if remote protocols include protocol, return conn
      if (conn.remoteProtocols.includes(protocol)) {
        return conn;
      }
    }
    return null;
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

    // Check for existing valid cached connection
    const existingConnection = this.getConnectionFromAddress(nextHopAddress);
    if (existingConnection) {
      this.logger.debug(
        'Reusing cached connection for address:',
        existingConnection.p2pConnection.id,
      );
      return existingConnection;
    }

    // Get or create the underlying p2p connection
    const p2pConnection = await this.getOrCreateP2pConnection(
      nextHopAddress,
      nextHopAddress.value,
    );

    // Create new oNodeConnection
    const connection = new oNodeConnection({
      nextHopAddress: nextHopAddress,
      address: address,
      p2pNode: this.p2pNode,
      p2pConnection: p2pConnection,
      callerAddress: callerAddress,
      readTimeoutMs: readTimeoutMs ?? this.defaultReadTimeoutMs,
      drainTimeoutMs: drainTimeoutMs ?? this.defaultDrainTimeoutMs,
      isStream: config.isStream ?? false,
      abortSignal: config.abortSignal,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
    });

    // Cache the new connection
    this.cacheConnection(connection);

    return connection;
  }
}
