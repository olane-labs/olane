import { oTool, oToolConfig } from '@olane/o-tool';
import { oAddress, oParameter, oVirtualNode } from '@olane/o-core';

export class GetTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://get'),
    });
  }
}
