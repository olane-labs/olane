import { DEFAULT_NETWORKS_PATH, NodeType, oAddress } from '@olane/o-core';
import { NetworkConfigInterface } from '../interfaces/network.interface';
import path from 'path';

export const defaultNetworkConfig = (port: number): NetworkConfigInterface => {
  return {
    configFilePath: path.join(
      DEFAULT_NETWORKS_PATH,
      'my-network',
      'config.json',
    ),
    network: {
      name: 'my-network-' + Math.random().toString(36).substring(2, 6),
      version: '0.0.1',
      description: 'my olane network',
      port: port,
    },
    nodes: [
      {
        type: NodeType.LEADER,
        address: new oAddress('o://leader'),
        leader: null,
        parent: null,
        network: {
          listeners: ['/ip4/0.0.0.0/tcp/' + port],
        },
      },
      {
        type: NodeType.NODE,
        address: new oAddress('o://node'),
        leader: null,
        parent: null,
      },
    ],
    plans: [],
    inProgress: [],
  };
};
