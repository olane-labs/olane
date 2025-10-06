import { oLoginTool } from './base-login.tool.js';
import { oLoginConfig } from './interfaces/login.config.js';
import { oNodeAddress } from '@olane/o-node';

export class oHumanLoginTool extends oLoginTool {
  constructor(config: oLoginConfig) {
    super({
      ...config,
      address: config.address || new oNodeAddress('o://human'),
    });
  }
}
