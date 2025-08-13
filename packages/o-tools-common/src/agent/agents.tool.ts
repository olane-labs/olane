import { oToolConfig, oVirtualTool, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';

export class AgentsTool extends oVirtualTool {
  private roundRobinIndex = 0;

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://agents'),
    });
  }

  async _tool_get_agents(request: oRequest): Promise<ToolResult> {
    throw new Error('Not implemented');
  }

  async _tool_get_agent(request: oRequest): Promise<ToolResult> {
    throw new Error('Not implemented');
  }

  async _tool_get_agent_by_id(request: oRequest): Promise<ToolResult> {
    throw new Error('Not implemented');
  }
}
