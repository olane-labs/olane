import { oAddress } from '@olane/o-core';
import { oAgentTool } from './base-agent.tool';
import { oAgentConfig } from './interfaces/agent.config';

export class oAIAgentTool extends oAgentTool {
  constructor(config: oAgentConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://ai'),
    });
  }
}
