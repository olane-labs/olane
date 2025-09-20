import { oRequest } from '@olane/o-core';
import { RequestId, RequestParams } from '@olane/o-protocol';

export interface PutRequestParams extends RequestParams {
  key: string;
  value: string;
}

export class PutRequest extends oRequest {
  params: PutRequestParams;

  constructor(
    config: Request & { params: PutRequestParams } & { id: RequestId },
  ) {
    super(config);
    this.params = config.params;
  }
}
