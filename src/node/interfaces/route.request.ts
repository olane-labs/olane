import { RequestParams } from '@olane/o-protocol';
import { oRequest } from '../../index.js';
import { Stream } from '@olane/o-config';

export interface RouteRequest extends oRequest {
  stream: Stream;
  params: RequestParams & {
    address: string;
    payload: {
      method: string;
      params: RequestParams;
    };
  };
}
