import { oRequest } from '@olane/o-core';
import { RequestParams } from '@olane/o-protocol';

export interface PromptRequest extends oRequest {
  params: RequestParams & {
    prompt: string;
  };
}
