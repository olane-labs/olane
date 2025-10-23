import { oAddress } from '../../../router/o-address.js';
import {
  oNotificationEvent,
  oNotificationEventConfig,
} from './o-notification-event.js';

/**
 * Emitted when a node establishes a connection (transport-agnostic)
 */
export class NodeConnectedEvent extends oNotificationEvent {
  readonly nodeAddress: oAddress;
  readonly connectionMetadata: Record<string, any>;

  constructor(config: {
    source: oAddress;
    nodeAddress: oAddress;
    connectionMetadata?: Record<string, any>;
  }) {
    super({
      type: 'node:connected',
      source: config.source,
      metadata: config.connectionMetadata || {},
    });
    this.nodeAddress = config.nodeAddress;
    this.connectionMetadata = config.connectionMetadata || {};
  }

  protected getEventData(): Record<string, any> {
    return {
      nodeAddress: this.nodeAddress.toString(),
      connectionMetadata: this.connectionMetadata,
    };
  }
}

/**
 * Emitted when a node disconnects (transport-agnostic)
 */
export class NodeDisconnectedEvent extends oNotificationEvent {
  readonly nodeAddress: oAddress;
  readonly reason?: string;

  constructor(config: {
    source: oAddress;
    nodeAddress: oAddress;
    reason?: string;
  }) {
    super({
      type: 'node:disconnected',
      source: config.source,
      metadata: { reason: config.reason },
    });
    this.nodeAddress = config.nodeAddress;
    this.reason = config.reason;
  }

  protected getEventData(): Record<string, any> {
    return {
      nodeAddress: this.nodeAddress.toString(),
      reason: this.reason,
    };
  }
}

/**
 * Emitted when a node is discovered but not yet connected
 */
export class NodeDiscoveredEvent extends oNotificationEvent {
  readonly nodeAddress: oAddress;

  constructor(config: { source: oAddress; nodeAddress: oAddress }) {
    super({
      type: 'node:discovered',
      source: config.source,
    });
    this.nodeAddress = config.nodeAddress;
  }

  protected getEventData(): Record<string, any> {
    return {
      nodeAddress: this.nodeAddress.toString(),
    };
  }
}
