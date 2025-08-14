import { oTool } from './o-tool.js';
import { oAddress, oHostNode } from '@olane/o-core';
import { oToolConfig } from './interfaces/tool.interface.js';

export class oHostNodeTool extends (oTool(oHostNode) as any) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }
}
