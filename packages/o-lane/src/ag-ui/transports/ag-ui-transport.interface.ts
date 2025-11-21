import { AGUIEvent } from '../types/ag-ui-event.types.js';

/**
 * Base interface for AG-UI event transport mechanisms
 * Implementations handle how events are delivered to frontends
 */
export interface AGUITransport {
  /**
   * Send a single event
   * @param event - The AG-UI event to send
   */
  send(event: AGUIEvent): Promise<void>;

  /**
   * Send multiple events in sequence
   * @param events - Array of AG-UI events to send
   */
  sendBatch(events: AGUIEvent[]): Promise<void>;

  /**
   * Close the transport connection
   */
  close(): Promise<void>;

  /**
   * Check if the transport is currently active
   */
  isActive(): boolean;

  /**
   * Get transport type identifier
   */
  getType(): string;
}

/**
 * Base abstract class for transport implementations
 */
export abstract class BaseAGUITransport implements AGUITransport {
  protected active: boolean = true;
  protected eventCount: number = 0;

  abstract send(event: AGUIEvent): Promise<void>;
  abstract getType(): string;

  async sendBatch(events: AGUIEvent[]): Promise<void> {
    for (const event of events) {
      await this.send(event);
    }
  }

  async close(): Promise<void> {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  protected incrementEventCount(): void {
    this.eventCount++;
  }

  getEventCount(): number {
    return this.eventCount;
  }
}
