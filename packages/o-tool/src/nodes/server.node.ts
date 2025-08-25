import { defaultLibp2pConfig, memory } from '@olane/o-config';
import { CoreConfig, oNode } from '@olane/o-core';

export class oServerNode extends oNode {
  constructor(config: CoreConfig) {
    super({
      ...config,
      network: {
        listeners: [
          '/ip4/0.0.0.0/tcp/0', // Plain TCP
          '/ip4/0.0.0.0/tcp/0/ws', // WebSockets over TCP
          '/ip6/::/tcp/0', // IPv6 TCP
          '/ip6/::/tcp/0/ws', // IPv6 WebSockets
        ],
      },
    });
  }

  configureTransports(): any[] {
    return [...(defaultLibp2pConfig.transports || [])];
  }
}
