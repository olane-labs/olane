import {
  oHierarchyManager,
  oHierarchyManagerConfig,
  PeerConnectedEvent,
  PeerDisconnectedEvent,
  PeerDiscoveredEvent,
  NodeConnectedEvent,
  NodeDisconnectedEvent,
  NodeDiscoveredEvent,
  ChildJoinedEvent,
  ChildLeftEvent,
  ParentConnectedEvent,
  ParentDisconnectedEvent,
  LeaderDisconnectedEvent,
  oNotificationEvent,
} from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';
import { oNodeNotificationManager } from './o-node.notification-manager.js';

export interface oNodeHierarchyManagerConfig extends oHierarchyManagerConfig {
  leaders: oNodeAddress[];
  children: oNodeAddress[];
  parents: oNodeAddress[];
  notificationManager?: oNodeNotificationManager;
  address: oNodeAddress;
}

export class oNodeHierarchyManager extends oHierarchyManager {
  public leaders: oNodeAddress[] = [];
  public children: oNodeAddress[] = [];
  public parents: oNodeAddress[] = [];
  private notificationManager?: oNodeNotificationManager;
  private address: oNodeAddress;

  constructor(config: oNodeHierarchyManagerConfig) {
    super(config);
    this.leaders = config.leaders || [];
    this.children = config.children || [];
    this.parents = config.parents || [];
    this.address = config.address;
    if (config.notificationManager) {
      this.setupEventListeners(config.notificationManager);
    }
  }

  /**
   * Set up event listeners to react to notification manager's peer events
   */
  setupEventListeners(notificationManager: oNodeNotificationManager): void {
    this.logger.info(
      'received notification manager, going to listen for key events',
    );
    this.notificationManager = notificationManager;

    // Listen to peer connection events
    this.notificationManager.on(
      'peer:connected',
      this.handlePeerConnected.bind(this),
    );
    this.notificationManager.on(
      'peer:disconnected',
      this.handlePeerDisconnected.bind(this),
    );
    this.notificationManager.on(
      'peer:discovered',
      this.handlePeerDiscovered.bind(this),
    );
  }

  get leader(): oNodeAddress | null {
    return this.leaders.length > 0 ? this.leaders[0] : null;
  }

  /**
   * Handle peer connected event from notification manager
   * Resolves peer ID to address and emits hierarchy-aware events
   */
  private handlePeerConnected(event: oNotificationEvent): void {
    const peerEvent = event as PeerConnectedEvent;
    const peerId = peerEvent.peerId;

    // Try to resolve peer ID to Olane address
    const nodeAddress = this.peerIdToAddress(peerId);

    if (!nodeAddress) {
      return;
    }

    // Emit generic node connected event through notification manager
    this.notificationManager!.emit(
      new NodeConnectedEvent({
        source: this.address,
        nodeAddress,
        connectionMetadata: {
          peerId,
          transport: 'libp2p',
          ...peerEvent.connectionMetadata,
        },
      }),
    );

    // Check if this is a child node
    if (this.isChild(nodeAddress)) {
      this.notificationManager!.emit(
        new ChildJoinedEvent({
          source: this.address,
          childAddress: nodeAddress,
          parentAddress: this.address,
        }),
      );
    }

    // Check if this is a parent node
    if (this.isParent(nodeAddress)) {
      this.notificationManager!.emit(
        new ParentConnectedEvent({
          source: this.address,
          parentAddress: nodeAddress,
        }),
      );
    }
  }

  /**
   * Handle peer disconnected event from notification manager
   * Resolves peer ID to address and emits hierarchy-aware events
   */
  private handlePeerDisconnected(event: oNotificationEvent): void {
    const peerEvent = event as PeerDisconnectedEvent;
    const peerId = peerEvent.peerId;

    // Try to resolve peer ID to Olane address
    const nodeAddress = this.peerIdToAddress(peerId);

    if (!nodeAddress) {
      return;
    }

    // Emit generic node disconnected event through notification manager
    this.notificationManager!.emit(
      new NodeDisconnectedEvent({
        source: this.address,
        nodeAddress,
        reason: peerEvent.reason || 'peer_disconnected',
      }),
    );

    // Check if this is a child node
    if (this.isChild(nodeAddress)) {
      this.notificationManager!.emit(
        new ChildLeftEvent({
          source: this.address,
          childAddress: nodeAddress,
          parentAddress: this.address,
          reason: peerEvent.reason || 'peer_disconnected',
        }),
      );
    }

    // Check if this is a parent node
    if (this.isParent(nodeAddress)) {
      this.notificationManager!.emit(
        new ParentDisconnectedEvent({
          source: this.address,
          parentAddress: nodeAddress,
          reason: peerEvent.reason || 'peer_disconnected',
        }),
      );
    }

    // Check if this is a leader node
    if (this.isLeader(nodeAddress)) {
      this.notificationManager!.emit(
        new LeaderDisconnectedEvent({
          source: this.address,
          leaderAddress: nodeAddress,
          reason: peerEvent.reason || 'peer_disconnected',
        }),
      );
    }
  }

  /**
   * Handle peer discovered event from notification manager
   * Resolves peer ID to address and emits node discovered event
   */
  private handlePeerDiscovered(event: oNotificationEvent): void {
    const peerEvent = event as PeerDiscoveredEvent;
    const peerId = peerEvent.peerId;

    // Try to resolve peer ID to Olane address
    const nodeAddress = this.peerIdToAddress(peerId);

    if (!nodeAddress) {
      return;
    }

    this.notificationManager!.emit(
      new NodeDiscoveredEvent({
        source: this.address,
        nodeAddress,
      }),
    );
  }

  /**
   * Resolve a libp2p peer ID to an Olane address
   * Checks children, parents, and leaders for matching transports
   */
  peerIdToAddress(peerId: string): oNodeAddress | null {
    // Check children
    for (const child of this.children) {
      const childTransports = child.libp2pTransports;
      for (const transport of childTransports) {
        if (transport.toString().includes(peerId)) {
          return child;
        }
      }
    }

    // Check parents
    for (const parent of this.parents) {
      const parentTransports = parent.libp2pTransports;
      if (parentTransports?.length === 0) {
        this.logger.error('Parent does not have transports fail!');
      }
      for (const transport of parentTransports) {
        if (transport.toString().includes(peerId)) {
          return parent;
        }
      }
    }

    // Check leaders
    for (const leader of this.leaders) {
      const leaderTransports = leader.libp2pTransports;
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
  isChild(address: oNodeAddress): boolean {
    return this.children.some(
      (child) => child.toString() === address.toString(),
    );
  }

  /**
   * Check if an address is a parent
   */
  isParent(address: oNodeAddress): boolean {
    return this.parents.some(
      (parent) => parent.toString() === address.toString(),
    );
  }

  /**
   * Check if an address is a leader
   */
  isLeader(address: oNodeAddress): boolean {
    return this.leaders.some(
      (leader) => leader.toString() === address.toString(),
    );
  }
}
