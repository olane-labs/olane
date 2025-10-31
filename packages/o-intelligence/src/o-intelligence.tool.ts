import { CoreUtils, oAddress, oResponse } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { AnthropicIntelligenceTool } from './anthropic-intelligence.tool.js';
import { OpenAIIntelligenceTool } from './openai-intelligence.tool.js';
import { OllamaIntelligenceTool } from './ollama-intelligence.tool.js';
import { PerplexityIntelligenceTool } from './perplexity-intelligence.tool.js';
import { GrokIntelligenceTool } from './grok-intelligence.tool.js';
import { INTELLIGENCE_PARAMS } from './methods/intelligence.methods.js';
import { IntelligenceStorageKeys } from './enums/intelligence-storage-keys.enum.js';
import { LLMProviders } from './enums/llm-providers.enum.js';
import { ConfigureRequest } from './interfaces/configure.request.js';
import { HostModelProvider } from './enums/host-model-provider.enum.js';
import { multiaddr, Stream } from '@olane/o-config';
import { PromptRequest } from './interfaces/prompt.request.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeConfig, oNodeToolConfig } from '@olane/o-node';

export class IntelligenceTool extends oLaneTool {
  private roundRobinIndex = 0;
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://intelligence'),
      methods: INTELLIGENCE_PARAMS,
      description:
        config.description ||
        'Tool to help route LLM requests to the best intelligence tool',
      dependencies: [
        {
          address: 'o://setup',
          parameters: [
            {
              name: 'intelligence',
              type: 'string',
              description: 'The intelligence tool to use',
            },
          ],
        },
      ],
    });
  }

  async getSecureValue(key: string): Promise<string | null> {
    try {
      const response = await this.use(new oAddress('o://secure'), {
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

  async getModelProvider(): Promise<{ provider: LLMProviders }> {
    // check ENV vars for override
    if (process.env.MODEL_PROVIDER_CHOICE) {
      if (
        Object.values(LLMProviders).includes(
          process.env.MODEL_PROVIDER_CHOICE as LLMProviders,
        )
      ) {
        return {
          provider: process.env.MODEL_PROVIDER_CHOICE as LLMProviders,
        };
      }
      throw new Error(
        'Invalid model provider choice, please set the MODEL_PROVIDER_CHOICE environment variable to a valid model provider',
      );
    }
    let model = LLMProviders.ANTHROPIC;
    // check secure storage for preference
    const modelProviderStored = await this.getSecureValue(
      IntelligenceStorageKeys.MODEL_PROVIDER_PREFERENCE,
    );
    if (modelProviderStored) {
      model = modelProviderStored as LLMProviders;
      return {
        provider: model,
      };
    }

    // no preference found, ask the human
    this.logger.info('Asking human for model selection...');
    try {
      const modelResponse = await this.use(new oAddress('o://human'), {
        method: 'question',
        params: {
          question:
            'Which AI model do you want to use? (anthropic, openai, ollama, perplexity, grok)',
        },
      });

      // process the human response
      const { answer: modelHuman } = modelResponse.result.data as {
        answer: string;
      };
      model = modelHuman.toLowerCase() as LLMProviders;
      await this.use(new oAddress('o://secure'), {
        method: 'put',
        params: {
          key: IntelligenceStorageKeys.MODEL_PROVIDER_PREFERENCE,
          value: model,
        },
      });
    } catch (error) {
      this.logger.warn('Defaulting to anthropic');
      model = LLMProviders.ANTHROPIC;
    }

    return {
      provider: model as LLMProviders,
    };
  }

  async getProviderApiKey(provider: LLMProviders): Promise<{ apiKey: string }> {
    // leverage the ENV vars first
    const ENV_KEYS = [
      {
        key: process.env.ANTHROPIC_API_KEY,
        address: 'o://anthropic',
        name: 'anthropic',
      },
      {
        key: process.env.OPENAI_API_KEY,
        address: 'o://openai',
        name: 'openai',
      },
      {
        key: process.env.SONAR_API_KEY,
        address: 'o://sonar',
        name: 'sonar',
      },
      {
        key: process.env.GEMINI_API_KEY,
        address: 'o://gemini',
        name: 'gemini',
      },
      {
        key: process.env.GROK_API_KEY,
        address: 'o://grok',
        name: 'grok',
      },
    ];
    const modelEnvConfig = ENV_KEYS.find((key) => key.name === provider);
    if (modelEnvConfig && !!modelEnvConfig.key) {
      return {
        apiKey: modelEnvConfig.key,
      };
    }
    let apiKey = '';
    // check secure storage 2nd
    const apiKeyStored = await this.getSecureValue(
      `${provider}-${IntelligenceStorageKeys.API_KEY_SUFFIX}`,
    );
    if (apiKeyStored) {
      return {
        apiKey: apiKeyStored,
      };
    }

    // no preference found, ask the human
    this.logger.info('Asking human for API key...');
    const keyResponse = await this.use(new oAddress('o://human'), {
      method: 'question',
      params: {
        question: `What is the API key for the ${provider} model?`,
      },
    });

    // process the human response
    const { answer: key } = keyResponse.result.data as { answer: string };
    apiKey = key;
    await this.use(new oAddress('o://secure'), {
      method: 'put',
      params: {
        key: `${provider}-${IntelligenceStorageKeys.API_KEY_SUFFIX}`,
        value: key,
      },
    });
    return {
      apiKey: apiKey,
    };
  }

  async chooseIntelligence(request: PromptRequest): Promise<{
    choice: oAddress;
    apiKey: string;
    options: any;
  }> {
    // check to see if anthropic key is in vault
    const { provider } = await this.getModelProvider();
    const { apiKey } = await this.getProviderApiKey(provider);
    return {
      choice: new oAddress(`o://${provider}`),
      apiKey,
      options: {},
    };
  }

  async _tool_configure(request: ConfigureRequest): Promise<ToolResult> {
    const { modelProvider, hostingProvider, accessToken, address } =
      request.params;
    if (hostingProvider) {
      await this.use(new oAddress('o://secure'), {
        method: 'put',
        params: {
          key: `${IntelligenceStorageKeys.HOSTING_PROVIDER_PREFERENCE}`,
          value: hostingProvider,
        },
      });
    }
    if (accessToken) {
      await this.use(new oAddress('o://secure'), {
        method: 'put',
        params: {
          key: `${IntelligenceStorageKeys.ACCESS_TOKEN}`,
          value: accessToken,
        },
      });
    }
    if (address) {
      await this.use(new oAddress('o://secure'), {
        method: 'put',
        params: {
          key: `${IntelligenceStorageKeys.OLANE_ADDRESS}`,
          value: address,
        },
      });
    }
    if (modelProvider) {
      await this.use(new oAddress('o://secure'), {
        method: 'put',
        params: {
          key: `${IntelligenceStorageKeys.MODEL_PROVIDER_PREFERENCE}`,
          value: modelProvider,
        },
      });
    }
    return {
      success: true,
    };
  }

  // we cannot wrap this tool use in a plan because it is a core dependency in all planning
  async _tool_prompt(request: PromptRequest): Promise<ToolResult> {
    const { prompt, _isStream = false } = request.params;
    const stream = request.stream;

    const intelligence = await this.chooseIntelligence(request);
    this.logger.debug(
      'Using intelligence: ',
      intelligence.choice.toString(),
      ' with stream: ',
      _isStream,
      ' and stream: ',
      stream,
    );
    const child = this.hierarchyManager.getChild(intelligence.choice);
    const response = await this.useChild(
      child || intelligence.choice,
      {
        method: 'completion',
        params: {
          _isStream: _isStream as boolean,
          apiKey: intelligence.apiKey,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
      },
      {
        isStream: _isStream as boolean,
        onChunk: async (chunk: oResponse) => {
          await CoreUtils.sendStreamResponse(chunk, stream);
        },
      },
    );
    return response as ToolResult;
  }

  async initialize(): Promise<void> {
    await super.initialize();

    const config = this.config;
    const tools = [
      new AnthropicIntelligenceTool({
        ...config,
        parent: this.address as any,
        leader: this.leader as any,
      }),
      new OpenAIIntelligenceTool({
        ...config,
        parent: this.address as any,
        leader: this.leader as any,
      }),
      new OllamaIntelligenceTool({
        ...config,
        parent: this.address as any,
        leader: this.leader as any,
      }),
      new PerplexityIntelligenceTool({
        ...config,
        parent: this.address as any,
        leader: this.leader as any,
      }),
      new GrokIntelligenceTool({
        ...config,
        parent: this.address as any,
        leader: this.leader as any,
      }),
    ];

    for (const tool of tools) {
      (tool as any).hookInitializeFinished = () => {
        this.addChildNode(tool);
      };
      await tool.start();
    }
  }
}
