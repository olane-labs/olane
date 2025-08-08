import { defaultLibp2pConfig, memory, multiaddr } from '@olane/o-config';
import { oNode } from '../node';
import { oVirtualNode } from '../node-virtual';
import { CoreUtils, NodeType } from '../core';

/**
 * A standalone node that can be used to host other nodes.
 * Can be useful for separating various buckets of functionality.
 * Think about microservice best practices.
 * These nodes are addressable via TCP/IP.
 */
export class oHostNode extends oNode {
  async initialize(): Promise<void> {
    // start the current node
    await super.initialize();
  }

  configureTransports(): any[] {
    return [
      memory(),
      ...(this.config.network?.transports ||
        defaultLibp2pConfig.transports ||
        []),
    ];
  }
}
