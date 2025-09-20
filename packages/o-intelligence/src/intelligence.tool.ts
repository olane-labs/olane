import { oToolConfig, oVirtualTool } from '@olane/o-tool';
import { oAddress } from '@olane/o-core';
import { oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { AnthropicIntelligenceTool } from './anthropic-intelligence.tool.js';
import { OpenAIIntelligenceTool } from './openai-intelligence.tool.js';
import { OllamaIntelligenceTool } from './ollama-intelligence.tool.js';
import { PerplexityIntelligenceTool } from './perplexity-intelligence.tool.js';
import { GrokIntelligenceTool } from './grok-intelligence.tool.js';
import { INTELLIGENCE_PARAMS } from './methods/intelligence.methods.js';
import { IntelligenceStorageKeys } from './enums/intelligence-storage-keys.enum.js';
import { LLMProviders } from './enums/llm-providers.enum.js';

export class IntelligenceTool extends oVirtualTool {
  private roundRobinIndex = 0;
  constructor(config: oToolConfig) {
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
    this.addChildNode(
      new AnthropicIntelligenceTool({
        ...config,
        parent: null,
        leader: null,
      }),
    );
    this.addChildNode(
      new OpenAIIntelligenceTool({
        ...config,
        parent: null,
        leader: null,
      }),
    );
    this.addChildNode(
      new OllamaIntelligenceTool({
        ...config,
        parent: null,
        leader: null,
      }),
    );
    this.addChildNode(
      new PerplexityIntelligenceTool({
        ...config,
        parent: null,
        leader: null,
      }),
    );
    this.addChildNode(
      new GrokIntelligenceTool({
        ...config,
        parent: null,
        leader: null,
      }),
    );
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
    // check secure storage for preference
    const config = await this.use(new oAddress('o://secure-storage'), {
      method: 'get',
      params: {
        key: IntelligenceStorageKeys.MODEL_PROVIDER_PREFERENCE,
      },
    });
    const payload = config.result.data as ToolResult;
    if (payload && payload.value) {
      const modelProvider = payload.value as string;
      return {
        provider: modelProvider as LLMProviders,
      };
    }
    // we need to ask the human for the model provider
    this.logger.info('Asking human for model selection');
    const modelResponse = await this.use(new oAddress('o://human'), {
      method: 'question',
      params: {
        question:
          'Which AI model do you want to use? (anthropic, openai, ollama, perplexity, grok)',
      },
    });

    // process the human response
    const { answer: model } = modelResponse.result.data as { answer: string };
    await this.use(new oAddress('o://secure-storage'), {
      method: 'put',
      params: {
        key: IntelligenceStorageKeys.MODEL_PROVIDER_PREFERENCE,
        value: model,
      },
    });
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
    // check secure storage 2nd
    const config = await this.use(new oAddress('o://secure-storage'), {
      method: 'get',
      params: {
        key: `${provider}-${IntelligenceStorageKeys.API_KEY_SUFFIX}`,
      },
    });
    const payload = config.result.data as ToolResult;
    if (payload && payload.value) {
      const apiKey = payload.value as string;
      return {
        apiKey,
      };
    }
    // we need to ask the human for the api key
    const keyResponse = await this.use(new oAddress('o://human'), {
      method: 'question',
      params: {
        question: `What is the API key for the ${provider} model?`,
      },
    });

    // process the human response
    const { answer: key } = keyResponse.result.data as { answer: string };
    await this.use(new oAddress('o://secure-storage'), {
      method: 'put',
      params: {
        key: `${provider}-${IntelligenceStorageKeys.API_KEY_SUFFIX}`,
        value: key,
      },
    });
    return {
      apiKey: key,
    };
  }

  async chooseIntelligence(
    request: oRequest,
  ): Promise<{ choice: oAddress; apiKey: string }> {
    // check to see if anthropic key is in vault
    const { provider } = await this.getModelProvider();
    const { apiKey } = await this.getProviderApiKey(provider);
    return {
      choice: new oAddress(`o://${provider}`),
      apiKey,
    };
  }

  // we cannot wrap this tool use in a plan because it is a core dependency in all planning
  async _tool_prompt(request: oRequest): Promise<ToolResult> {
    const { prompt } = request.params;
    const intelligence = await this.chooseIntelligence(request);
    this.logger.debug('Using AI provider: ', intelligence.choice);
    const response = await this.use(intelligence.choice, {
      method: 'completion',
      params: {
        apiKey: intelligence.apiKey,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
    });
    return response.result.data as ToolResult;
  }
}
