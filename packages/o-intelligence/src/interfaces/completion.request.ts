import { oRequest } from '@olane/o-core';
import { RequestParams } from '@olane/o-protocol';

export interface CompletionRequest extends oRequest {
  params: RequestParams & {
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
}
