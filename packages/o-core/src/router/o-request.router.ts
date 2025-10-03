import {
  oProtocolMethods,
  RequestId,
  oRouterRequestInterface,
  RequestParams,
  JSONRPC_VERSION,
} from '@olane/o-protocol';
import { Stream } from '@olane/o-config';
import { oRequest } from '../connection/o-request.js';

export class oRouterRequest
  extends oRequest
  implements oRouterRequestInterface
{
  jsonrpc: typeof JSONRPC_VERSION;
  method: oProtocolMethods.ROUTE;
  stream?: Stream | undefined;
  params: RequestParams & {
    address: string;
    payload: {
      [key: string]: unknown;
    };
  };
  constructor(config: oRouterRequestInterface & { id: RequestId }) {
    super(config);
    this.jsonrpc = JSONRPC_VERSION;
    this.method = config.method;
    this.params = config.params;
    this.stream = config.stream;
    this.id = config.id;
  }
}
