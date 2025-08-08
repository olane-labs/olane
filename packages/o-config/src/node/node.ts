import { createLibp2p, Libp2p } from 'libp2p';
import { defaultLibp2pConfig, Libp2pConfig } from '../config/config.js';

export async function createNode(config: Libp2pConfig = {}): Promise<Libp2p> {
  const mergedConfig = {
    ...defaultLibp2pConfig,
    ...config,
    addresses: {
      ...{ listen: config.listeners || defaultLibp2pConfig.listeners },
      ...config.addresses,
    },
    services: {
      ...defaultLibp2pConfig.services,
      ...config.services,
    },
    peerDiscovery: [
      ...(defaultLibp2pConfig.peerDiscovery || []),
      ...(config.peerDiscovery || []),
    ],
    peerRouters: [
      ...(defaultLibp2pConfig.peerRouters || []),
      ...(config.peerRouters || []),
    ],
    contentRouters: [
      ...(defaultLibp2pConfig.contentRouters || []),
      ...(config.contentRouters || []),
    ],
  };
  return await createLibp2p(mergedConfig);
}
