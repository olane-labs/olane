import { oAgentTool } from './base-agent.tool.js';
import { oAgentConfig } from './interfaces/agent.config.js';
import { oNodeAddress } from '@olane/o-node';

export class oAIAgentTool extends oAgentTool {
  constructor(config: oAgentConfig) {
    super({
      ...config,
      address: config.address || new oNodeAddress('o://ai'),
    });
  }
}
