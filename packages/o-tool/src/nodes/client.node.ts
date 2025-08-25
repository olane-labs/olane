import { defaultLibp2pConfig, memory } from '@olane/o-config';
import { CoreConfig, oNode } from '@olane/o-core';
import { oVirtualTool } from '../virtual.tool';

export class oClientNode extends oVirtualTool {
  constructor(config: CoreConfig) {
    super({
      ...config,
      network: {
        // clients cannot be dialed
        listeners: [],
      },
    });
  }

  configureTransports(): any[] {
    return [...(defaultLibp2pConfig.transports || [])];
  }
}
