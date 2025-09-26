import { defaultLibp2pConfig, memory } from '@olane/o-config';
import { oNodeConfig, oNode } from '@olane/o-node';

export class oWebsocketNode extends oNode {
  constructor(config: oNodeConfig) {
    super({
      ...config,
      network: {
        listeners: config.network?.listeners || [
          '/ip4/0.0.0.0/tcp/0/ws', // WebSockets over TCP
          '/ip6/::/tcp/0/ws', // IPv6 WebSockets
        ],
      },
    });
  }

  configureTransports(): any[] {
    return [...(defaultLibp2pConfig.transports || [])];
  }
}
