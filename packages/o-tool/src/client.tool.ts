import { oTool } from './o-tool.js';
import { oToolConfig } from './interfaces/tool.interface.js';
import { oAddress } from '@olane/o-core';
import { oClientNode } from './nodes/client.node.js';

export class oClientTool extends (oTool(oClientNode) as any) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }
}
