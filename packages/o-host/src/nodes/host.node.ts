import { tcp } from '@libp2p/tcp';
import { oNode } from '@olane/o-core';
import { hostLibp2pConfig } from '../config';

export class oHostNode extends oNode {
  configureTransports(): any[] {
    return hostLibp2pConfig.transports || [];
  }
}
