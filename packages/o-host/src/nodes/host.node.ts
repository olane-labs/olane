import { oNode } from '@olane/o-core';
import { hostLibp2pConfig } from '../config.js';

export class oHostNode extends oNode {
  configureTransports(): any[] {
    return hostLibp2pConfig.transports || [];
  }
}
