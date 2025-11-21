import { AGUIEvent } from '../types/ag-ui-event.types.js';
import { BaseAGUITransport } from './ag-ui-transport.interface.js';
import { generateTimestamp } from '../ag-ui-utils.js';

/**
 * Simple callback-based transport for AG-UI events
 * Useful for testing and custom integrations
 */
export class CallbackAGUITransport extends BaseAGUITransport {
  private callback: (event: AGUIEvent) => void | Promise<void>;

  constructor(callback: (event: AGUIEvent) => void | Promise<void>) {
    super();
    this.callback = callback;
  }

  async send(event: AGUIEvent): Promise<void> {
    if (!this.active) {
      throw new Error('Transport is closed');
    }

    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = generateTimestamp();
    }

    this.incrementEventCount();

    await Promise.resolve(this.callback(event));
  }

  getType(): string {
    return 'callback';
  }
}
