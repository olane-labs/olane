import { oTool } from './o-tool';
import { oAddress, oHostNode, oNode } from '@olane/o-core';
import { oToolConfig } from './interfaces/tool.interface';

export class oHostNodeTool extends oTool(oHostNode) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super(config);
  }
}
