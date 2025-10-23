import { oNotificationEvent } from '../events/o-notification-event.js';

/**
 * Handler function for notification events
 */
export type NotificationHandler = (
  event: oNotificationEvent,
) => void | Promise<void>;

/**
 * Filter for event subscriptions
 */
export interface EventFilter {
  /**
   * Match events from nodes matching this address pattern
   * Supports wildcards: e.g., "o://leader/children/*"
   */
  addressPattern?: string;

  /**
   * Only match these specific event types
   */
  eventTypes?: string[];

  /**
   * Custom filter function
   */
  customFilter?: (event: oNotificationEvent) => boolean;
}

/**
 * Subscription handle returned when subscribing to events
 */
export interface Subscription {
  /**
   * Unique subscription ID
   */
  id: string;

  /**
   * Event type subscribed to
   */
  eventType: string;

  /**
   * Handler function
   */
  handler: NotificationHandler;

  /**
   * Optional filter
   */
  filter?: EventFilter;

  /**
   * Unsubscribe from this event
   */
  unsubscribe(): void;
}
