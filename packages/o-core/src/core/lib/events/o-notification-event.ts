import { oAddress } from '../../../router/o-address.js';

export interface oNotificationEventConfig {
  type: string;
  source: oAddress;
  metadata?: Record<string, any>;
}

/**
 * Base class for all notification events in the Olane system.
 * Transport-agnostic - contains only Olane concepts, no libp2p/HTTP/etc dependencies.
 */
export abstract class oNotificationEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly source: oAddress;
  readonly metadata: Record<string, any>;

  constructor(config: oNotificationEventConfig) {
    this.type = config.type;
    this.source = config.source;
    this.metadata = config.metadata || {};
    this.timestamp = new Date();
  }

  /**
   * Serialize event to JSON for transmission
   */
  toJSON(): Record<string, any> {
    return {
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      source: this.source.toString(),
      metadata: this.metadata,
      ...this.getEventData(),
    };
  }

  /**
   * Subclasses override to provide event-specific data
   */
  protected getEventData(): Record<string, any> {
    return {};
  }
}
