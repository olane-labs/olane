import { oVirtualTool, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { AGENT_METHODS } from './methods/agent.methods.js';
import { oAgentConfig } from './interfaces/agent.config.js';

export abstract class oAgentTool extends oVirtualTool {
  protected respond: (intent: string) => Promise<string>;
  protected answer: (intent: string) => Promise<string>;
  protected receiveStream: (data: any) => Promise<any>;

  constructor(config: oAgentConfig) {
    super({
      ...config,
      address: config?.address || new oAddress('o://agent'),
      methods: AGENT_METHODS,
    });
    this.respond = config.respond;
    this.answer = config.answer;
    this.receiveStream = config.receiveStream;
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

  async _tool_receive_stream(request: oRequest): Promise<ToolResult> {
    const { data } = request.params;

    await this.receiveStream(data);

    return {
      success: true,
    };
  }
}
