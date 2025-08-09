import { oTool, ToolResult } from '@olane/o-tool';
import { oAddress, oHostNode, oRequest } from '@olane/o-core';
import { AGENT_METHODS } from './methods/agent.methods';
import { oAgentConfig } from './interfaces/agent.config';

export abstract class oAgentTool extends oTool(oHostNode) {
  protected respond: (intent: string) => Promise<string>;
  protected answer: (intent: string) => Promise<string>;

  constructor(config: oAgentConfig) {
    super({
      ...config,
      address: config?.address || new oAddress('o://agent'),
      methods: AGENT_METHODS,
    });
    this.respond = config.respond;
    this.answer = config.answer;
  }

  async _tool_intent(request: oRequest): Promise<ToolResult> {
    const { intent, context } = request.params;

    const response = await this.respond(intent as string);

    return {
      success: true,
      resolution: response,
    };
  }

  async _tool_question(request: oRequest): Promise<ToolResult> {
    const { question } = request.params;

    const response = await this.answer(question as string);

    return {
      success: true,
      answer: response,
    };
  }
}
