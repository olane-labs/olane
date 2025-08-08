import { oTool, oToolConfig } from '@olane/o-tool';
import { oAddress, oDependency, oParameter, oVirtualNode } from '@olane/o-core';

export class PutTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://put'),
    });
  }
}
