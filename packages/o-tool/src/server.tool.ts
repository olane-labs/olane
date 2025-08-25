import { oTool } from './o-tool.js';
import { oToolConfig } from './interfaces/tool.interface.js';
import { oAddress } from '@olane/o-core';
import { oServerNode } from './nodes/server.node.js';

export class oServerTool extends (oTool(oServerNode) as any) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }
}
