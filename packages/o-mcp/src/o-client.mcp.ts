import {
  Server,
  ServerOptions,
} from '@modelcontextprotocol/sdk/server/index.js';
import {
  Client,
  ClientOptions,
} from '@modelcontextprotocol/sdk/client/index.js';
import {
  JSONRPCMessage,
  Implementation,
  isJSONRPCRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { IntentValue, IntentWrappingTransport } from './o-transport.mcp';

export type oClientOptions = ClientOptions & {
  /** Value placed into `params._meta.intent` for every outgoing request/notification */
  intent?: IntentValue | (() => IntentValue);
};

export class oClient extends Client {
  private providedIntent?: IntentValue | (() => IntentValue);

  constructor(_clientInfo: Implementation, options?: oClientOptions) {
    super(_clientInfo, options);
    this.providedIntent = options?.intent;
  }

  async connect(transport: Transport, options?: RequestOptions): Promise<void> {
    const getIntent = () =>
      typeof this.providedIntent === 'function'
        ? (this.providedIntent as () => IntentValue)()
        : this.providedIntent;
    const wrapped = new IntentWrappingTransport(transport, getIntent);
    return super.connect(wrapped as unknown as Transport, options);
  }
}
