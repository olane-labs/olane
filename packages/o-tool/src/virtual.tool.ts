import { oTool } from './o-tool';
import { oToolConfig } from './interfaces/tool.interface';
import { oAddress, oVirtualNode } from '@olane/o-core';

export class oVirtualTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }
}
