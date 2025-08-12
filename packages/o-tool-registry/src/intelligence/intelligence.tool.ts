import { oTool, oToolConfig } from '@olane/o-tool';
import { oAddress, oResponse, oVirtualNode } from '@olane/o-core';
import { oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { AnthropicIntelligenceTool } from './anthropic-intelligence.tool';
import { OpenAIIntelligenceTool } from './openai-intelligence.tool';
import { OllamaIntelligenceTool } from './ollama-intelligence.tool';
import { PerplexityIntelligenceTool } from './perplexity-intelligence.tool';

export class IntelligenceTool extends oTool(oVirtualNode) {
  private roundRobinIndex = 0;
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://intelligence'),
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
  }

  async requestMissingData(): Promise<ToolResult> {
    // if the anthropic key is not in the vault, ask the human
    this.logger.info('Anthropic API key not found in vault, asking human');
    const humanResponse = await this.use(new oAddress('o://human'), {
      method: 'question',
      params: {
        question: 'Enter the anthropic api key',
      },
    });

    // process the human response
    const { answer } = humanResponse.result.data as { answer: string };
    this.logger.info('Human answer: ', answer);

    await this.use(new oAddress('o://memory'), {
      method: 'put',
      params: {
        key: 'anthropic-api-key',
        value: answer,
      },
    });
    return {
      choice: 'o://anthropic',
      apiKey: answer,
    };
  }

  async chooseIntelligence(request: oRequest): Promise<ToolResult> {
    // check to see if anthropic key is in vault
    const response = await this.use(new oAddress('o://memory'), {
      method: 'get',
      params: {
        key: 'anthropic-api-key',
      },
    });
    // if the anthropic key is in the vault, use it
    if (response.result.data) {
      const { value } = response.result.data as { value: string };
      if (value) {
        return {
          choice: 'o://anthropic',
          apiKey: value,
        };
      }
    }

    const result = await this.requestMissingData();
    return result;
  }

  // we cannot wrap this tool use in a plan because it is a core dependency in all planning
  async _tool_prompt(request: oRequest): Promise<ToolResult> {
    const { prompt } = request.params;
    const intelligence = await this.chooseIntelligence(request);
    const response = await this.use(new oAddress(intelligence.choice), {
      method: 'completion',
      params: {
        model: 'claude-sonnet-4-20250514',
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
