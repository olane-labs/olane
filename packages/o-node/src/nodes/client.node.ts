import { defaultLibp2pConfig } from '@olane/o-config';
import { oNode } from '../o-node.js';
import { oNodeConfig } from '../interfaces/o-node.config.js';

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
