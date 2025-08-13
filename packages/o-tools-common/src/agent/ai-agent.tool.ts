import { oAddress } from '@olane/o-core';
import { oAgentTool } from './base-agent.tool.js';
import { oAgentConfig } from './interfaces/agent.config.js';

export class oAIAgentTool extends oAgentTool {
  constructor(config: oAgentConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://ai'),
    });
  }
}
