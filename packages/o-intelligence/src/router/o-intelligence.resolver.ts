import {
  oAddress,
  oAddressResolver,
  oCore,
  oCustomTransport,
  oTransport,
  RouteResponse,
} from '@olane/o-core';
import { IntelligenceStorageKeys } from '../enums/intelligence-storage-keys.enum';
import { ToolResult } from '@olane/o-tool';
import { LLMProviders } from '../enums/llm-providers.enum';
import { HostModelProvider } from '../enums/host-model-provider.enum';

export abstract class oIntelligenceResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/intelligence')];
  }

  async getSecureValue(node: oCore, key: string): Promise<string | null> {
    try {
      const response = await node.use(new oAddress('o://secure'), {
        method: 'get',
        params: {
          key: key,
        },
      });
      const payload = response.result.data as ToolResult;
      if (payload && payload.value) {
        return payload.value as string;
      }
      return null;
    } catch (error) {
      this.logger.error('Error getting secure value: ', error);
      return null;
    }
  }

  async getHostingProvider(node: oCore): Promise<{
    modelProvider: LLMProviders;
    provider: HostModelProvider;
    options: any;
  }> {
    let provider = HostModelProvider.LOCAL;
    const hostingProviderStored = await this.getSecureValue(
      node,
      IntelligenceStorageKeys.HOSTING_PROVIDER_PREFERENCE,
    );
    if (hostingProviderStored) {
      provider = hostingProviderStored as HostModelProvider;
    }
    let token = null;
    const accessTokenStored = await this.getSecureValue(
      node,
      IntelligenceStorageKeys.ACCESS_TOKEN,
    );
    if (accessTokenStored) {
      token = accessTokenStored;
    }
    const addressStored = await this.getSecureValue(
      node,
      IntelligenceStorageKeys.OLANE_ADDRESS,
    );
    let address = 'o://leader/auth/intelligence';
    if (addressStored) {
      address = addressStored as string;
    }
    const modelProviderStored = await this.getSecureValue(
      node,
      IntelligenceStorageKeys.MODEL_PROVIDER_PREFERENCE,
    );
    let modelProvider = modelProviderStored as LLMProviders;
    if (!modelProvider) {
      modelProvider = LLMProviders.ANTHROPIC;
    }
    return {
      provider: provider,
      modelProvider: modelProvider,
      options: {
        token: token,
        address: address,
      },
    };
  }
}
