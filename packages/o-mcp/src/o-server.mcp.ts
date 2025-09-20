import {
  Server,
  ServerOptions,
} from '@modelcontextprotocol/sdk/server/index.js';
import {
  JSONRPCMessage,
  Implementation,
  isJSONRPCRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { IntentWrappingTransport } from './o-transport.mcp';

export type oServerOptions = ServerOptions & {
  /** Validate that all incoming requests include `_meta.intent` */
  requireIntent?: boolean;
};

export class oServer extends Server {
  private requireIntent: boolean;

  constructor(_serverInfo: Implementation, options?: oServerOptions) {
    super(_serverInfo, options);
    this.requireIntent = !!options?.requireIntent;
  }

  async connect(transport: Transport): Promise<void> {
    const wrapped = new IntentWrappingTransport(transport, () => undefined);
    // Install a fallback request handler to enforce intent if requested
    if (this.requireIntent) {
      const prevFallback = this.fallbackRequestHandler;
      this.fallbackRequestHandler = async (req, extra) => {
        const meta: any = (req as any)?.params?._meta || extra._meta || {};
        if (typeof meta.intent === 'undefined') {
          throw new Error('Missing required _meta.intent');
        }
        return prevFallback ? prevFallback(req as any, extra) : ({} as any);
      };
    }
    return super.connect(wrapped as unknown as Transport);
  }
}
