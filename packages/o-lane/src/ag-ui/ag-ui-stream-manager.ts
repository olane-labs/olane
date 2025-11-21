import { AGUIEvent } from './types/ag-ui-event.types.js';
import { AGUITransport } from './transports/ag-ui-transport.interface.js';
import { validateEvent } from './ag-ui-utils.js';
import { oObject } from '@olane/o-core';

/**
 * Configuration for stream manager
 */
export interface AGUIStreamManagerConfig {
  /**
   * Event transport mechanism
   */
  transport: AGUITransport;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Filter events by type (if undefined, all events are emitted)
   */
  eventFilter?: string[];

  /**
   * Maximum queue size before forcing emission
   */
  maxQueueSize?: number;

  /**
   * Enable event validation
   */
  validateEvents?: boolean;
}

/**
 * Manages AG-UI event emission with proper ordering and formatting
 */
export class AGUIStreamManager extends oObject {
  private transport: AGUITransport;
  private debug: boolean;
  private eventFilter?: Set<string>;
  private maxQueueSize: number;
  private validateEvents: boolean;
  private eventQueue: AGUIEvent[] = [];
  private emitting: boolean = false;

  constructor(config: AGUIStreamManagerConfig) {
    super('ag-ui-stream-manager');
    this.transport = config.transport;
    this.debug = config.debug || false;
    this.eventFilter = config.eventFilter
      ? new Set(config.eventFilter)
      : undefined;
    this.maxQueueSize = config.maxQueueSize || 100;
    this.validateEvents = config.validateEvents !== false;
  }

  /**
   * Emit a single event
   */
  async emit(event: AGUIEvent): Promise<void> {
    // Filter events if configured
    if (this.eventFilter && !this.eventFilter.has(event.type)) {
      if (this.debug) {
        this.logger.debug(`Filtered event: ${event.type}`);
      }
      return;
    }

    // Validate event if configured
    if (this.validateEvents && !validateEvent(event)) {
      this.logger.warn(`Invalid event structure: ${event.type}`);
      return;
    }

    if (this.debug) {
      this.logger.debug(`Emitting event: ${event.type}`, event);
    }

    try {
      await this.transport.send(event);
    } catch (error) {
      this.logger.error(`Error emitting event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Emit multiple events in sequence
   */
  async emitBatch(events: AGUIEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Queue an event for later emission
   * Useful for buffering events during processing
   */
  queueEvent(event: AGUIEvent): void {
    this.eventQueue.push(event);

    // Auto-flush if queue is too large
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.logger.warn(
        `Event queue reached max size (${this.maxQueueSize}), flushing...`,
      );
      this.flushQueue().catch((error) => {
        this.logger.error('Error flushing queue:', error);
      });
    }
  }

  /**
   * Queue multiple events
   */
  queueBatch(events: AGUIEvent[]): void {
    for (const event of events) {
      this.queueEvent(event);
    }
  }

  /**
   * Flush all queued events
   */
  async flushQueue(): Promise<void> {
    if (this.emitting) {
      this.logger.debug('Already emitting, skipping flush');
      return;
    }

    if (this.eventQueue.length === 0) {
      return;
    }

    this.emitting = true;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      if (this.debug) {
        this.logger.debug(`Flushing ${events.length} queued events`);
      }

      await this.emitBatch(events);
    } finally {
      this.emitting = false;
    }
  }

  /**
   * Get the number of queued events
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Clear the event queue without emitting
   */
  clearQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Check if transport is active
   */
  isActive(): boolean {
    return this.transport.isActive();
  }

  /**
   * Close the stream manager and transport
   */
  async close(): Promise<void> {
    // Flush any remaining events
    await this.flushQueue();

    // Close transport
    await this.transport.close();

    if (this.debug) {
      this.logger.debug('Stream manager closed');
    }
  }

  /**
   * Update the transport
   */
  setTransport(transport: AGUITransport): void {
    this.transport = transport;
  }

  /**
   * Get transport type
   */
  getTransportType(): string {
    return this.transport.getType();
  }

  /**
   * Enable/disable debug mode
   */
  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  /**
   * Update event filter
   */
  setEventFilter(filter: string[] | undefined): void {
    this.eventFilter = filter ? new Set(filter) : undefined;
  }

  /**
   * Get current event filter
   */
  getEventFilter(): string[] | undefined {
    return this.eventFilter ? Array.from(this.eventFilter) : undefined;
  }
}
