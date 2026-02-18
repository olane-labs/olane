import { oRequest } from '@olane/o-core';
import { oStreamRequest } from '@olane/o-node';
import { RequestParams } from '@olane/o-protocol';
import { LLMProviders } from '../enums/llm-providers.enum';

export interface PromptRequest extends oStreamRequest {
  params: RequestParams & {
    prompt: string;
    model?: string;
    provider?: LLMProviders;
  };
}
