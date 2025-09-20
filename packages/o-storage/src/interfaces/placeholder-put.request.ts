import { oRequest } from '@olane/o-core';
import { RequestId, RequestParams } from '@olane/o-protocol';

export interface PlaceholderPutRequestParams extends RequestParams {
  key: string;
  value: string;
  intent: string;
}

export class PlaceholderPutRequest extends oRequest {
  params: PlaceholderPutRequestParams;

  constructor(
    config: Request & { params: PlaceholderPutRequestParams } & {
      id: RequestId;
    },
  ) {
    super(config);
    this.params = config.params;
  }
}
