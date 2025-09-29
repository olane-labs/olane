import { defaultLibp2pConfig } from '@olane/o-config';
import { oNode } from '../o-node.js';
import { oNodeConfig } from '../interfaces/o-node.config.js';

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
