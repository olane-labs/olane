import { oRequest } from '@olane/o-core';
import { RequestParams } from '@olane/o-protocol';
import { LLMProviders } from '../enums/llm-providers.enum.js';
import { HostModelProvider } from '../enums/host-model-provider.enum.js';

export interface ConfigureRequest extends oRequest {
  params: RequestParams & {
    modelProvider: LLMProviders;
    hostingProvider: HostModelProvider;
    accessToken: string;
    address: string;
    model: string;
  };
}
