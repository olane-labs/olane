import { defaultLibp2pConfig } from '@olane/o-config';
import { CoreConfig, oVirtualNode } from '@olane/o-core';

export class oClientNode extends oVirtualNode {
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
