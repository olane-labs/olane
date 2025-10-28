import { oAddress } from '../../../router/o-address.js';
import {
  oNotificationEvent,
  oNotificationEventConfig,
} from './o-notification-event.js';

/**
 * Emitted when a connection becomes degraded (some pings failing)
 */
export class ConnectionDegradedEvent extends oNotificationEvent {
  readonly targetAddress: oAddress;
  readonly role: 'parent' | 'child';
  readonly consecutiveFailures: number;

  constructor(config: {
    source: oAddress;
    targetAddress: oAddress;
    role: 'parent' | 'child';
    consecutiveFailures: number;
  }) {
    super({
      type: 'connection:degraded',
      source: config.source,
      metadata: {
        role: config.role,
        consecutiveFailures: config.consecutiveFailures,
      },
    });
    this.targetAddress = config.targetAddress;
    this.role = config.role;
    this.consecutiveFailures = config.consecutiveFailures;
  }

  protected getEventData(): Record<string, any> {
    return {
      targetAddress: this.targetAddress.toString(),
      role: this.role,
      consecutiveFailures: this.consecutiveFailures,
    };
  }
}

/**
 * Emitted when a degraded connection recovers
 */
export class ConnectionRecoveredEvent extends oNotificationEvent {
  readonly targetAddress: oAddress;
  readonly role: 'parent' | 'child';

  constructor(config: {
    source: oAddress;
    targetAddress: oAddress;
    role: 'parent' | 'child';
  }) {
    super({
      type: 'connection:recovered',
      source: config.source,
      metadata: { role: config.role },
    });
    this.targetAddress = config.targetAddress;
    this.role = config.role;
  }

  protected getEventData(): Record<string, any> {
    return {
      targetAddress: this.targetAddress.toString(),
      role: this.role,
    };
  }
}
