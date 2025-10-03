import { oAddress } from '@olane/o-core';
import { oAgentTool } from './base-agent.tool.js';
import { oAgentConfig } from './interfaces/agent.config.js';
import { oNodeAddress } from '@olane/o-node';

export class oHumanAgentTool extends oAgentTool {
  constructor(config: oAgentConfig) {
    super({
      ...config,
      address: config.address || new oNodeAddress('o://human'),
    });
  }
}
