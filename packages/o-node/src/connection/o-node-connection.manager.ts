import { oAddress, oConnectionConfig, oConnectionManager } from '@olane/o-core';
import { Libp2p, Connection } from '@olane/o-config';
import { oNodeConnectionManagerConfig } from './interfaces/o-node-connection-manager.config.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConnection } from './o-node-connection.js';
import { EventEmitter } from 'events';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';

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
  protected eventEmitter: EventEmitter = new EventEmitter();

  constructor(readonly config: oNodeConnectionManagerConfig) {
    super(config);
    this.p2pNode = config.p2pNode;
    this.defaultReadTimeoutMs = config.defaultReadTimeoutMs;
    this.defaultDrainTimeoutMs = config.defaultDrainTimeoutMs;
    this.logger.setNamespace(`oNodeConnectionManager[${config.callerAddress}]`);

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
      conn.nextHopAddress.value,
      conn.p2pConnection.streams.map((s) => s.protocol).join(', '),
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
    // Check if dial is already in progress for this address key
    this.logger.debug('Checking for pending dial for address:', addressKey);
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

  async answer(config: oNodeConnectionConfig): Promise<oNodeConnection> {
    const {
      targetAddress,
      nextHopAddress,
      callerAddress,
      readTimeoutMs,
      drainTimeoutMs,
      p2pConnection,
    } = config;
    if (!p2pConnection) {
      throw new Error(
        'Failed to answer connection, p2pConnection is undefined',
      );
    }
    this.logger.debug('Answering connection for address:', {
      address: nextHopAddress?.value,
      connectionId: p2pConnection.id,
      direction: p2pConnection.direction,
    });

    // Check if we already have a cached connection for this address with the same connection id
    const existingConnection = this.cachedConnections.get(p2pConnection.id);

    if (existingConnection) {
      this.logger.debug(
        'Reusing cached connection for answer:',
        existingConnection.id,
      );
      return existingConnection;
    }

    const connection = new oNodeConnection({
      nextHopAddress: nextHopAddress,
      targetAddress: targetAddress,
      callerAddress: callerAddress,
      readTimeoutMs: readTimeoutMs ?? this.defaultReadTimeoutMs,
      drainTimeoutMs: drainTimeoutMs ?? this.defaultDrainTimeoutMs,
      isStream: config.isStream ?? false,
      abortSignal: config.abortSignal,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
      p2pConnection: p2pConnection,
    });

    // Cache the new connection
    this.cacheConnection(connection);

    return connection;
  }

  /**
   * Connect to a given address, reusing oNodeConnection when possible
   * @param config - Connection configuration
   * @returns The connection object
   */
  async connect(config: oNodeConnectionConfig): Promise<oNodeConnection> {
    const {
      targetAddress,
      nextHopAddress,
      callerAddress,
      readTimeoutMs,
      drainTimeoutMs,
    } = config;

    if (!nextHopAddress) {
      throw new Error('Invalid address passed');
    }

    if (nextHopAddress.libp2pTransports?.length === 0) {
      throw new Error('No transports provided for the address, cannot connect');
    }

    // Check for existing valid cached connection
    const existingConnection = this.getCachedConnectionFromAddress(
      nextHopAddress as oNodeAddress,
    );
    if (existingConnection) {
      this.logger.debug(
        'Reusing cached connection for address:',
        existingConnection.p2pConnection.id,
      );
      return existingConnection;
    } else {
      this.logger.debug('No cached connection found for address:', {
        address: nextHopAddress.value,
      });
    }

    // Get or create the underlying p2p connection
    const p2pConnection = await this.getOrCreateP2pConnection(
      nextHopAddress,
      nextHopAddress.value,
    );

    // Create new oNodeConnection
    const connection = new oNodeConnection({
      nextHopAddress: nextHopAddress,
      targetAddress: targetAddress,
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

  getCachedConnectionFromAddress(
    address: oNodeAddress,
  ): oNodeConnection | null {
    const vals = Array.from(this.cachedConnections.values());
    for (const c in vals) {
      const connection: oNodeConnection = c as unknown as oNodeConnection;
      const peerId = address.libp2pTransports?.[0].toPeerId();
      if (
        connection.p2pConnection.remotePeer.toString() === peerId &&
        connection.isOpen
      ) {
        return connection;
      }
    }
    return null;
  }
}
