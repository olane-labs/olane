import { oAddress } from '../../../router/o-address.js';
import {
  oNotificationEvent,
  oNotificationEventConfig,
} from './o-notification-event.js';

/**
 * Emitted when a child node joins the hierarchy (registers with parent)
 */
export class ChildJoinedEvent extends oNotificationEvent {
  readonly childAddress: oAddress;
  readonly parentAddress: oAddress;

  constructor(config: {
    source: oAddress;
    childAddress: oAddress;
    parentAddress: oAddress;
  }) {
    super({
      type: 'child:joined',
      source: config.source,
    });
    this.childAddress = config.childAddress;
    this.parentAddress = config.parentAddress;
  }

  protected getEventData(): Record<string, any> {
    return {
      childAddress: this.childAddress.toString(),
      parentAddress: this.parentAddress.toString(),
    };
  }
}

/**
 * Emitted when a child node leaves the hierarchy (unregisters or disconnects)
 */
export class ChildLeftEvent extends oNotificationEvent {
  readonly childAddress: oAddress;
  readonly parentAddress: oAddress;
  readonly reason?: string;

  constructor(config: {
    source: oAddress;
    childAddress: oAddress;
    parentAddress: oAddress;
    reason?: string;
  }) {
    super({
      type: 'child:left',
      source: config.source,
      metadata: { reason: config.reason },
    });
    this.childAddress = config.childAddress;
    this.parentAddress = config.parentAddress;
    this.reason = config.reason;
  }

  protected getEventData(): Record<string, any> {
    return {
      childAddress: this.childAddress.toString(),
      parentAddress: this.parentAddress.toString(),
      reason: this.reason,
    };
  }
}

/**
 * Emitted when a parent connection is established
 */
export class ParentConnectedEvent extends oNotificationEvent {
  readonly parentAddress: oAddress;

  constructor(config: { source: oAddress; parentAddress: oAddress }) {
    super({
      type: 'parent:connected',
      source: config.source,
    });
    this.parentAddress = config.parentAddress;
  }

  protected getEventData(): Record<string, any> {
    return {
      parentAddress: this.parentAddress.toString(),
    };
  }
}

/**
 * Emitted when a parent connection is lost
 */
export class ParentDisconnectedEvent extends oNotificationEvent {
  readonly parentAddress: oAddress;
  readonly reason?: string;

  constructor(config: {
    source: oAddress;
    parentAddress: oAddress;
    reason?: string;
  }) {
    super({
      type: 'parent:disconnected',
      source: config.source,
      metadata: { reason: config.reason },
    });
    this.parentAddress = config.parentAddress;
    this.reason = config.reason;
  }

  protected getEventData(): Record<string, any> {
    return {
      parentAddress: this.parentAddress.toString(),
      reason: this.reason,
    };
  }
}

/**
 * Emitted when connection to leader is lost (CRITICAL)
 * This is a catastrophic failure - node cannot function without leader
 */
export class LeaderDisconnectedEvent extends oNotificationEvent {
  readonly leaderAddress: oAddress;
  readonly reason?: string;

  constructor(config: {
    source: oAddress;
    leaderAddress: oAddress;
    reason?: string;
  }) {
    super({
      type: 'leader:disconnected',
      source: config.source,
      metadata: { reason: config.reason },
    });
    this.leaderAddress = config.leaderAddress;
    this.reason = config.reason;
  }

  protected getEventData(): Record<string, any> {
    return {
      leaderAddress: this.leaderAddress.toString(),
      reason: this.reason,
    };
  }
}
