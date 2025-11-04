import { createLibp2p, Libp2p } from 'libp2p';
import { defaultLibp2pConfig, Libp2pConfig } from '../config/config.js';
import { prometheusMetrics } from '@libp2p/prometheus-metrics';

export async function createNode(config: Libp2pConfig = {}): Promise<Libp2p> {
  const mergedConfig = {
    ...defaultLibp2pConfig,
    ...config,
    addresses: {
      ...{ listen: config.listeners || defaultLibp2pConfig.listeners },
      ...config.addresses,
    },
  };

  // Add prometheus metrics service if registry is provided
  if (config.prometheusRegistry) {
    mergedConfig.services = {
      ...mergedConfig.services,
      metrics: prometheusMetrics({
        preserveExistingMetrics: true,
        registry: config.prometheusRegistry,
      }),
    };
  }

  return await createLibp2p(mergedConfig);
}
