import {
  oProtocolMethods,
  oRouterRequestInterface,
  RequestParams,
} from '@olane/o-protocol';
import { Stream } from '@olane/o-config';
import { oRequest } from '../connection/o-request.js';

export class oRouterRequest
  extends oRequest
  implements oRouterRequestInterface
{
  method: oProtocolMethods.ROUTE;
  stream?: Stream | undefined;
  params: RequestParams & {
    address: string;
    payload: {
      [key: string]: unknown;
    };
  };
  constructor(config: oRouterRequestInterface) {
    super(config);
    this.method = config.method;
    this.params = config.params;
    this.stream = config.stream;
    this.id = config.id;
  }
}
