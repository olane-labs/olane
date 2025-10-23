import { v4 as uuidv4 } from 'uuid';
import { oObject } from '../o-object.js';
import { oNotificationEvent } from './events/o-notification-event.js';
import {
  EventFilter,
  NotificationHandler,
  Subscription,
} from './interfaces/notification-types.js';
import { EventFilters } from './utils/event-filters.js';

/**
 * Abstract notification manager - transport agnostic
 * NO dependencies on libp2p, HTTP, or any specific transport
 *
 * Subclasses implement setupListeners() to wire up transport-specific events
 */
export abstract class oNotificationManager extends oObject {
  private eventTarget: EventTarget;
  private subscriptions: Map<string, Set<Subscription>>;

  constructor() {
    super();
    this.eventTarget = new EventTarget();
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to a notification event
   *
   * @param eventType - The event type to subscribe to (e.g., "node:connected", "child:joined")
   * @param handler - The handler function to call when event is emitted
   * @param filter - Optional filter to apply to events
   * @returns Subscription handle
   */
  on(
    eventType: string,
    handler: NotificationHandler,
    filter?: EventFilter,
  ): Subscription {
    const subscriptionId = uuidv4();

    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handler,
      filter,
      unsubscribe: () => {
        this.off(subscription);
      },
    };

    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    this.subscriptions.get(eventType)!.add(subscription);

    // Add DOM event listener
    const wrappedHandler = async (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const notificationEvent = event.detail as oNotificationEvent;

      // Apply filter if provided
      if (filter && !this.matchesFilter(notificationEvent, filter)) {
        return;
      }

      try {
        await handler(notificationEvent);
      } catch (error) {
        this.logger.error(
          `Error in notification handler for ${eventType}:`,
          error,
        );
      }
    };

    // Store wrapped handler for later removal
    (subscription as any)._wrappedHandler = wrappedHandler;

    this.eventTarget.addEventListener(eventType, wrappedHandler);

    this.logger.debug(`Subscribed to ${eventType} with ID ${subscriptionId}`);

    return subscription;
  }

  /**
   * Unsubscribe from a notification event
   */
  off(subscription: Subscription): void {
    const subscriptionsForType = this.subscriptions.get(subscription.eventType);

    if (!subscriptionsForType) {
      return;
    }

    // Remove from subscriptions set
    subscriptionsForType.delete(subscription);

    // Remove DOM event listener
    const wrappedHandler = (subscription as any)._wrappedHandler;
    if (wrappedHandler) {
      this.eventTarget.removeEventListener(
        subscription.eventType,
        wrappedHandler,
      );
    }

    // Clean up empty sets
    if (subscriptionsForType.size === 0) {
      this.subscriptions.delete(subscription.eventType);
    }

    this.logger.debug(
      `Unsubscribed from ${subscription.eventType} with ID ${subscription.id}`,
    );
  }

  /**
   * Emit a notification event
   */
  emit(event: oNotificationEvent): void {
    this.logger.debug(`Emitting event: ${event.type}`, event.toJSON());

    const customEvent = new CustomEvent(event.type, {
      detail: event,
    });

    this.eventTarget.dispatchEvent(customEvent);
  }

  /**
   * Check if an event matches a filter
   */
  protected matchesFilter(
    event: oNotificationEvent,
    filter: EventFilter,
  ): boolean {
    // Check event type filter
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false;
    }

    // Check address pattern filter
    if (filter.addressPattern) {
      const eventAddress = EventFilters.getEventAddress(event);
      if (
        !eventAddress ||
        !EventFilters.addressMatches(eventAddress, filter.addressPattern)
      ) {
        return false;
      }
    }

    // Check custom filter
    if (filter.customFilter && !filter.customFilter(event)) {
      return false;
    }

    return true;
  }

  /**
   * Get all active subscriptions for an event type
   */
  getSubscriptions(eventType?: string): Subscription[] {
    if (eventType) {
      const subs = this.subscriptions.get(eventType);
      return subs ? Array.from(subs) : [];
    }

    // Return all subscriptions
    const allSubs: Subscription[] = [];
    for (const subs of this.subscriptions.values()) {
      allSubs.push(...Array.from(subs));
    }
    return allSubs;
  }

  /**
   * Get count of active subscriptions
   */
  getSubscriptionCount(eventType?: string): number {
    return this.getSubscriptions(eventType).length;
  }

  /**
   * Subclasses must implement this to wire up transport-specific listeners
   * This is where libp2p/HTTP/WebSocket events get connected
   */
  protected abstract setupListeners(): void | Promise<void>;

  /**
   * Initialize the notification manager
   * Calls setupListeners() to wire up transport events
   */
  async initialize(): Promise<void> {
    this.logger.debug('Initializing notification manager...');
    await this.setupListeners();
    this.logger.debug('Notification manager initialized');
  }

  /**
   * Cleanup all subscriptions
   */
  async teardown(): Promise<void> {
    this.logger.debug('Tearing down notification manager...');

    // Unsubscribe all
    const allSubs = this.getSubscriptions();
    for (const sub of allSubs) {
      this.off(sub);
    }

    this.subscriptions.clear();
    this.logger.debug('Notification manager torn down');
  }
}
