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

  async chooseIntelligence(request: oRequest): Promise<ToolResult> {
    // let's use preference to choose the best intelligence tool
    const setup = await this.use(new oAddress('o://setup'), {
      method: 'completion',
      params: {
        prompt: 'Choose the best intelligence tool',
      },
    });
    return {
      choice: 'o://anthropic',
    };
  }

  // we cannot wrap this tool use in a plan because it is a core dependency in all planning
  async _tool_prompt(request: oRequest): Promise<ToolResult> {
    const { prompt } = request.params;
    const intelligence = await this.chooseIntelligence(request);
    const response = await this.use(new oAddress(intelligence.choice), {
      method: 'completion',
      params: {
        model: 'claude-opus-4-20250514',
        apiKey:
          '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',
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
