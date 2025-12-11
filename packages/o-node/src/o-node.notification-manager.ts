import { Connection, Libp2p } from '@olane/o-config';
import {
  oNotificationManager,
  PeerConnectedEvent,
  PeerDisconnectedEvent,
  PeerDiscoveredEvent,
} from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';

/**
 * libp2p-specific implementation of oNotificationManager
 * Emits low-level peer connection events without hierarchy awareness
 */
export class oNodeNotificationManager extends oNotificationManager {
  constructor(
    private p2pNode: Libp2p,
    private address: oNodeAddress,
  ) {
    super();
  }

  /**
   * Wire up libp2p event listeners
   */
  protected setupListeners(): void {
    this.logger.debug('Setting up libp2p event listeners...');

    // Peer connection events
    this.p2pNode.addEventListener(
      'peer:connect',
      this.handlePeerConnect.bind(this),
    );
    // this.p2pNode.addEventListener(
    //   'peer:disconnect',
    //   this.handlePeerDisconnect.bind(this),
    // );

    // Peer discovery events
    this.p2pNode.addEventListener(
      'peer:discovery',
      this.handlePeerDiscovery.bind(this),
    );

    // Connection events
    this.p2pNode.addEventListener(
      'connection:open',
      this.handleConnectionOpen.bind(this),
    );
    this.p2pNode.addEventListener(
      'connection:close',
      this.handleConnectionClose.bind(this),
    );

    this.logger.debug('libp2p event listeners configured');
  }

  /**
   * Handle peer connect event from libp2p
   * Emits low-level peer connected event for hierarchy manager to process
   */
  private handlePeerConnect(evt: CustomEvent): void {
    const peerId = evt.detail;

    // Emit low-level peer connected event
    this.emit(
      new PeerConnectedEvent({
        source: this.address,
        peerId: peerId.toString(),
        connectionMetadata: {
          transport: 'libp2p',
        },
      }),
    );
  }

  /**
   * Handle peer disconnect event from libp2p
   * Emits low-level peer disconnected event for hierarchy manager to process
   */
  private handlePeerDisconnect(evt: CustomEvent): void {
    const peerId = evt.detail;

    // Emit low-level peer disconnected event
    this.emit(
      new PeerDisconnectedEvent({
        source: this.address,
        peerId: peerId.toString(),
        reason: 'peer_disconnected',
      }),
    );
  }

  /**
   * Handle peer discovery event from libp2p
   * Emits low-level peer discovered event for hierarchy manager to process
   */
  private handlePeerDiscovery(evt: CustomEvent): void {
    const peerInfo = evt.detail;

    // Extract multiaddrs if available
    const multiaddrs = peerInfo.multiaddrs?.map((ma: any) => ma.toString());

    this.emit(
      new PeerDiscoveredEvent({
        source: this.address,
        peerId: peerInfo.id.toString(),
        multiaddrs,
      }),
    );
  }

  /**
   * Handle connection open event from libp2p
   */
  private handleConnectionOpen(evt: CustomEvent): void {
    // do nothing for now
  }

  /**
   * Handle connection close event from libp2p
   * Emits low-level peer disconnected event for hierarchy manager to process
   */
  private handleConnectionClose(evt: CustomEvent): void {
    const connection = evt.detail as Connection | undefined;
    if (!connection) {
      return;
    }

    const remotePeerId = connection.remotePeer?.toString();
    if (!remotePeerId) {
      return;
    }

    // Check if there are any remaining open connections to this peer
    const remainingConnections = this.p2pNode
      .getConnections(remotePeerId as any)
      .filter((conn) => conn.status === 'open');

    // Only emit disconnect events if this was the last connection
    if (remainingConnections.length > 0) {
      this.logger.debug(
        `Connection closed to ${remotePeerId}, but ${remainingConnections.length} connection(s) remain open`,
      );
      return;
    }

    // Emit low-level peer disconnected event
    this.emit(
      new PeerDisconnectedEvent({
        source: this.address,
        peerId: remotePeerId,
        reason: 'connection_closed',
      }),
    );
  }
}
