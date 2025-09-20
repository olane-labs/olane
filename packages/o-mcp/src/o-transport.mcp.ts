import {
  JSONRPCMessage,
  isJSONRPCRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export type IntentValue = unknown;

export class IntentWrappingTransport implements Transport {
  private inner: Transport;
  private getIntent: () => IntentValue | undefined;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;

  constructor(inner: Transport, getIntent: () => IntentValue | undefined) {
    this.inner = inner;
    this.getIntent = getIntent;

    // plumb events through
    this.inner.onclose = () => this.onclose && this.onclose();
    this.inner.onerror = (err) => this.onerror && this.onerror(err);
    this.inner.onmessage = (message, extra) => {
      // Enforce presence of intent for incoming requests (server-side usage)
      if (isJSONRPCRequest(message)) {
        const params: any = (message as any).params || {};
        const meta: any = params._meta || {};
        if (typeof meta.intent === 'undefined') {
          // If the protocol has installed a handler, let it decide; otherwise, drop-through.
          // We do not auto-respond here to avoid interfering with the protocol; enforcement should be done at handlers.
        }
      }
      this.onmessage && this.onmessage(message as JSONRPCMessage);
    };
  }

  async start(): Promise<void> {
    await this.inner.start();
    this.sessionId = this.inner.sessionId;
    this.setProtocolVersion = this.inner.setProtocolVersion;
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      // Inject `_meta.intent` for outgoing requests/notifications
      const m: any = message as any;
      if (m && typeof m === 'object') {
        const hasParams = typeof m.params === 'object' && m.params !== null;
        if (!hasParams) {
          m.params = {};
        }
        if (typeof m.params._meta !== 'object' || m.params._meta === null) {
          m.params._meta = {};
        }
        if (typeof m.params._meta.intent === 'undefined') {
          const intent = this.getIntent();
          if (typeof intent !== 'undefined') {
            m.params._meta.intent = intent;
          }
        }
      }
    } catch (_) {
      // Best-effort injection; ignore errors and proceed
    }
    return this.inner.send(message);
  }

  async close(): Promise<void> {
    await this.inner.close();
  }
}
