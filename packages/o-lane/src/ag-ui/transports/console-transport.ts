import { AGUIEvent } from '../types/ag-ui-event.types.js';
import { BaseAGUITransport } from './ag-ui-transport.interface.js';
import { generateTimestamp, safeJSONStringify } from '../ag-ui-utils.js';

/**
 * Console-based transport for AG-UI events
 * Useful for debugging and development
 */
export class ConsoleAGUITransport extends BaseAGUITransport {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    super();
    this.verbose = verbose;
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

    if (this.verbose) {
      console.log(`[AG-UI Event #${this.eventCount}]`, safeJSONStringify(event));
    } else {
      // Compact format for non-verbose mode
      console.log(
        `[AG-UI] ${event.type}`,
        this.formatEventSummary(event),
      );
    }
  }

  private formatEventSummary(event: AGUIEvent): string {
    switch (event.type) {
      case 'RunStarted':
        return `runId=${event.runId} threadId=${event.threadId}`;
      case 'RunFinished':
        return `runId=${event.runId} outcome=${event.outcome || 'success'}`;
      case 'RunError':
        return `message="${event.message}"`;
      case 'StepStarted':
      case 'StepFinished':
        return `step="${event.stepName}"`;
      case 'TextMessageStart':
        return `msgId=${event.messageId} role=${event.role}`;
      case 'TextMessageContent':
        return `msgId=${event.messageId} delta="${event.delta.slice(0, 30)}..."`;
      case 'TextMessageEnd':
        return `msgId=${event.messageId}`;
      case 'ToolCallStart':
        return `toolId=${event.toolCallId} name=${event.toolCallName}`;
      case 'ToolCallResult':
        return `toolId=${event.toolCallId}`;
      case 'StateSnapshot':
        return `snapshot keys: ${Object.keys(event.snapshot as any).join(', ')}`;
      case 'StateDelta':
        return `${event.delta.length} patches`;
      case 'ActivitySnapshot':
        return `${event.activityType} msgId=${event.messageId}`;
      default:
        return '';
    }
  }

  getType(): string {
    return 'console';
  }
}
