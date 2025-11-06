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
  };

  return await createLibp2p(mergedConfig);
}
