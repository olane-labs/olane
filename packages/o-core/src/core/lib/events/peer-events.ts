import { oAddress } from '../../../router/o-address.js';
import {
  oNotificationEvent,
  oNotificationEventConfig,
} from './o-notification-event.js';

/**
 * Low-level peer connection event (protocol layer)
 * Emitted when a libp2p peer connection is established
 * Contains raw peer ID before address resolution
 */
export class PeerConnectedEvent extends oNotificationEvent {
  readonly peerId: string;
  readonly connectionMetadata: Record<string, any>;

  constructor(config: {
    source: oAddress;
    peerId: string;
    connectionMetadata?: Record<string, any>;
  }) {
    super({
      type: 'peer:connected',
      source: config.source,
      metadata: config.connectionMetadata || {},
    });
    this.peerId = config.peerId;
    this.connectionMetadata = config.connectionMetadata || {};
  }

  protected getEventData(): Record<string, any> {
    return {
      peerId: this.peerId,
      connectionMetadata: this.connectionMetadata,
    };
  }
}

/**
 * Low-level peer disconnection event (protocol layer)
 * Emitted when a libp2p peer connection is closed
 * Contains raw peer ID before address resolution
 */
export class PeerDisconnectedEvent extends oNotificationEvent {
  readonly peerId: string;
  readonly reason?: string;

  constructor(config: {
    source: oAddress;
    peerId: string;
    reason?: string;
  }) {
    super({
      type: 'peer:disconnected',
      source: config.source,
      metadata: { reason: config.reason },
    });
    this.peerId = config.peerId;
    this.reason = config.reason;
  }

  protected getEventData(): Record<string, any> {
    return {
      peerId: this.peerId,
      reason: this.reason,
    };
  }
}

/**
 * Low-level peer discovery event (protocol layer)
 * Emitted when a libp2p peer is discovered
 * Contains raw peer ID and multiaddrs before address resolution
 */
export class PeerDiscoveredEvent extends oNotificationEvent {
  readonly peerId: string;
  readonly multiaddrs?: string[];

  constructor(config: {
    source: oAddress;
    peerId: string;
    multiaddrs?: string[];
  }) {
    super({
      type: 'peer:discovered',
      source: config.source,
      metadata: { multiaddrs: config.multiaddrs },
    });
    this.peerId = config.peerId;
    this.multiaddrs = config.multiaddrs;
  }

  protected getEventData(): Record<string, any> {
    return {
      peerId: this.peerId,
      multiaddrs: this.multiaddrs,
    };
  }
}
