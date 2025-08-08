import { oTool, oToolConfig } from '@olane/o-tool';
import { oAddress, oDependency, oVirtualNode } from '@olane/o-core';

export class DeleteTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://delete'),
    });
  }
}
