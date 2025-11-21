import { oAddress, oResponse, CoreUtils } from '@olane/o-core';
import { oToolBase } from '@olane/o-tool';
import { Stream } from '@olane/o-config';
import { AGUIEvent } from '../types/ag-ui-event.types.js';
import { BaseAGUITransport } from './ag-ui-transport.interface.js';
import { generateTimestamp } from '../ag-ui-utils.js';

/**
 * AG-UI Transport using oNode's existing streaming infrastructure
 * Leverages the streamTo address and oResponse streaming
 */
export class ONodeAGUITransport extends BaseAGUITransport {
  private streamTo?: oAddress;
  private node?: oToolBase;
  private stream?: Stream;
  private requestId?: string | number;

  constructor(config: {
    streamTo?: oAddress;
    node?: oToolBase;
    stream?: Stream;
    requestId?: string | number;
  }) {
    super();
    this.streamTo = config.streamTo;
    this.node = config.node;
    this.stream = config.stream;
    this.requestId = config.requestId;
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

    // Send via oNode streaming if stream is available
    if (this.stream) {
      await this.sendViaStream(event);
    }

    // Also send to streamTo address if configured
    if (this.streamTo && this.node) {
      await this.sendViaStreamTo(event);
    }
  }

  private async sendViaStream(event: AGUIEvent): Promise<void> {
    if (!this.stream) return;

    const response = new oResponse({
      data: {
        type: 'ag-ui-event',
        event: event,
      },
      _last: false,
      _isStreaming: true,
      _connectionId: this.node?.address.toString() || 'unknown',
      _requestMethod: 'ag_ui_intent',
      id: this.requestId || 'unknown',
    });

    await CoreUtils.sendStreamResponse(response, this.stream);
  }

  private async sendViaStreamTo(event: AGUIEvent): Promise<void> {
    if (!this.streamTo || !this.node) return;

    try {
      await this.node.use(this.streamTo, {
        method: 'receive_ag_ui_event',
        params: {
          event: event,
        },
      });
    } catch (error) {
      // Log but don't throw - streamTo errors shouldn't break execution
      if (this.node) {
        this.node.logger.error('Error sending AG-UI event to streamTo:', error);
      }
    }
  }

  getType(): string {
    return 'onode';
  }

  /**
   * Update stream configuration mid-execution
   */
  updateStream(stream: Stream): void {
    this.stream = stream;
  }

  /**
   * Update streamTo address mid-execution
   */
  updateStreamTo(streamTo: oAddress): void {
    this.streamTo = streamTo;
  }
}
