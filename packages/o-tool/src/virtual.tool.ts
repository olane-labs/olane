import { oTool } from './o-tool.js';
import { oToolConfig } from './interfaces/tool.interface.js';
import { oAddress, oVirtualNode } from '@olane/o-core';

export class oVirtualTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }
}
