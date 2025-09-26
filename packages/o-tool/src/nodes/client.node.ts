import { defaultLibp2pConfig } from '@olane/o-config';
import { oNode, oNodeConfig } from '@olane/o-node';

export class oClientNode extends oNode {
  constructor(config: oNodeConfig) {
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
