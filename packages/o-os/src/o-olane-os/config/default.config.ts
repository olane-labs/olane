import { DEFAULT_INSTANCE_PATH, NodeType, oAddress } from '@olane/o-core';
import { OlaneOSConfig } from '../interfaces/o-os.config.js';
import * as path from 'path';

export const defaultOSInstanceConfig = (port: number): OlaneOSConfig => {
  return {
    configFilePath: path.join(
      DEFAULT_INSTANCE_PATH,
      'my-olane-os',
      'config.json',
    ),
    network: {
      name: 'my-olane-os-' + Math.random().toString(36).substring(2, 6),
      version: '0.0.1',
      description: 'my olane os instance',
      port: port,
    },
    nodes: [
      {
        type: NodeType.LEADER,
        address: new oAddress('o://leader'),
        description: 'leader for my olane os instance',
        leader: null,
        parent: null,
        network: {
          listeners: ['/ip4/0.0.0.0/tcp/' + port],
        },
      },
      {
        type: NodeType.NODE,
        address: new oAddress('o://node'),
        description: 'host node for my olane os instance',
        leader: null,
        parent: null,
      },
    ],
    lanes: [],
    inProgress: [],
  };
};
