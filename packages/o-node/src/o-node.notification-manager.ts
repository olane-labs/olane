import { Libp2p } from '@olane/o-config';
import {
  oNotificationManager,
  NodeConnectedEvent,
  NodeDisconnectedEvent,
  NodeDiscoveredEvent,
  ChildJoinedEvent,
  ChildLeftEvent,
  ParentConnectedEvent,
  ParentDisconnectedEvent,
} from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';
import { oNodeHierarchyManager } from './o-node.hierarchy-manager.js';

/**
 * libp2p-specific implementation of oNotificationManager
 * Wraps libp2p events and enriches them with Olane context
 */
export class oNodeNotificationManager extends oNotificationManager {
  constructor(
    private p2pNode: Libp2p,
    private hierarchyManager: oNodeHierarchyManager,
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
    this.p2pNode.addEventListener('peer:connect', this.handlePeerConnect.bind(this));
    this.p2pNode.addEventListener('peer:disconnect', this.handlePeerDisconnect.bind(this));

    // Peer discovery events
    this.p2pNode.addEventListener('peer:discovery', this.handlePeerDiscovery.bind(this));

    // Connection events
    this.p2pNode.addEventListener('connection:open', this.handleConnectionOpen.bind(this));
    this.p2pNode.addEventListener('connection:close', this.handleConnectionClose.bind(this));

    this.logger.debug('libp2p event listeners configured');
  }

  /**
   * Handle peer connect event from libp2p
   */
  private handlePeerConnect(evt: CustomEvent): void {
    const peerId = evt.detail;
    this.logger.debug(`Peer connected: ${peerId.toString()}`);

    // Try to resolve peer ID to Olane address
    const nodeAddress = this.peerIdToAddress(peerId.toString());

    if (!nodeAddress) {
      this.logger.debug(`Could not resolve peer ID ${peerId.toString()} to address`);
      return;
    }

    // Emit generic node connected event
    this.emit(
      new NodeConnectedEvent({
        source: this.address,
        nodeAddress,
        connectionMetadata: {
          peerId: peerId.toString(),
          transport: 'libp2p',
        },
      }),
    );

    // Check if this is a child node
    if (this.isChild(nodeAddress)) {
      this.logger.debug(`Child node connected: ${nodeAddress.toString()}`);
      this.emit(
        new ChildJoinedEvent({
          source: this.address,
          childAddress: nodeAddress,
          parentAddress: this.address,
        }),
      );
    }

    // Check if this is a parent node
    if (this.isParent(nodeAddress)) {
      this.logger.debug(`Parent node connected: ${nodeAddress.toString()}`);
      this.emit(
        new ParentConnectedEvent({
          source: this.address,
          parentAddress: nodeAddress,
        }),
      );
    }
  }

  /**
   * Handle peer disconnect event from libp2p
   */
  private handlePeerDisconnect(evt: CustomEvent): void {
    const peerId = evt.detail;
    this.logger.debug(`Peer disconnected: ${peerId.toString()}`);

    // Try to resolve peer ID to Olane address
    const nodeAddress = this.peerIdToAddress(peerId.toString());

    if (!nodeAddress) {
      this.logger.debug(`Could not resolve peer ID ${peerId.toString()} to address`);
      return;
    }

    // Emit generic node disconnected event
    this.emit(
      new NodeDisconnectedEvent({
        source: this.address,
        nodeAddress,
        reason: 'peer_disconnected',
      }),
    );

    // Check if this is a child node
    if (this.isChild(nodeAddress)) {
      this.logger.debug(`Child node disconnected: ${nodeAddress.toString()}`);
      this.emit(
        new ChildLeftEvent({
          source: this.address,
          childAddress: nodeAddress,
          parentAddress: this.address,
          reason: 'peer_disconnected',
        }),
      );

      // Optionally remove from hierarchy (auto-cleanup)
      // this.hierarchyManager.removeChild(nodeAddress);
    }

    // Check if this is a parent node
    if (this.isParent(nodeAddress)) {
      this.logger.debug(`Parent node disconnected: ${nodeAddress.toString()}`);
      this.emit(
        new ParentDisconnectedEvent({
          source: this.address,
          parentAddress: nodeAddress,
          reason: 'peer_disconnected',
        }),
      );
    }
  }

  /**
   * Handle peer discovery event from libp2p
   */
  private handlePeerDiscovery(evt: CustomEvent): void {
    const peerInfo = evt.detail;
    this.logger.debug(`Peer discovered: ${peerInfo.id.toString()}`);

    // Try to resolve peer ID to Olane address
    const nodeAddress = this.peerIdToAddress(peerInfo.id.toString());

    if (!nodeAddress) {
      return;
    }

    this.emit(
      new NodeDiscoveredEvent({
        source: this.address,
        nodeAddress,
      }),
    );
  }

  /**
   * Handle connection open event from libp2p
   */
  private handleConnectionOpen(evt: CustomEvent): void {
    const remotePeer = evt.detail.remotePeer;
    this.logger.debug(`Connection opened to: ${remotePeer.toString()}`);
  }

  /**
   * Handle connection close event from libp2p
   */
  private handleConnectionClose(evt: CustomEvent): void {
    const remotePeer = evt.detail.remotePeer;
    this.logger.debug(`Connection closed to: ${remotePeer.toString()}`);
  }

  /**
   * Try to resolve a libp2p peer ID to an Olane address
   * Checks hierarchy manager for known peers
   */
  private peerIdToAddress(peerId: string): oNodeAddress | null {
    // Check children
    for (const child of this.hierarchyManager.children) {
      const childTransports = child.transports;
      for (const transport of childTransports) {
        if (transport.toString().includes(peerId)) {
          return child;
        }
      }
    }

    // Check parents
    for (const parent of this.hierarchyManager.parents) {
      const parentTransports = parent.transports;
      for (const transport of parentTransports) {
        if (transport.toString().includes(peerId)) {
          return parent;
        }
      }
    }

    // Check leaders
    for (const leader of this.hierarchyManager.leaders) {
      const leaderTransports = leader.transports;
      for (const transport of leaderTransports) {
        if (transport.toString().includes(peerId)) {
          return leader;
        }
      }
    }

    return null;
  }

  /**
   * Check if an address is a direct child
   */
  private isChild(address: oNodeAddress): boolean {
    return this.hierarchyManager.children.some(
      (child) => child.toString() === address.toString(),
    );
  }

  /**
   * Check if an address is a parent
   */
  private isParent(address: oNodeAddress): boolean {
    return this.hierarchyManager.parents.some(
      (parent) => parent.toString() === address.toString(),
    );
  }
}
