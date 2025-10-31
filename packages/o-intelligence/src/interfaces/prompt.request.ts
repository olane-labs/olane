import { oRequest } from '@olane/o-core';
import { oStreamRequest } from '@olane/o-node';
import { RequestParams } from '@olane/o-protocol';

export interface PromptRequest extends oStreamRequest {
  params: RequestParams & {
    prompt: string;
  };
}
