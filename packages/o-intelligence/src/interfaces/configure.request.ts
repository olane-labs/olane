import { oRequest } from '@olane/o-core';
import { RequestParams } from '@olane/o-protocol';
import { LLMProviders } from '../enums/llm-providers.enum';
import { HostModelProvider } from '../enums/host-model-provider.enum';

export interface ConfigureRequest extends oRequest {
  params: RequestParams & {
    modelProvider: LLMProviders;
    hostingProvider: HostModelProvider;
    accessToken: string;
    address: string;
  };
}
