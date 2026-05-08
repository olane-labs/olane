import { DEFAULT_INSTANCE_PATH, NodeType, oAddress } from '@olane/o-core';
import { OlaneOSConfig } from '../interfaces/o-os.config.js';
import * as path from 'path';

export interface DefaultOSInstanceConfigOptions {
  /**
   * Mount a circuit-relay-v2 RelayNode as a leader child so other peers
   * can dial through this OS. Defaults to `true` — opt out by passing
   * `{ enableRelay: false }` for headless server-side usage.
   */
  enableRelay?: boolean;
}

export const defaultOSInstanceConfig = (
  port: number,
  options: DefaultOSInstanceConfigOptions = {},
): OlaneOSConfig => {
  const { enableRelay = true } = options;
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
      ...(enableRelay
        ? [
            {
              type: NodeType.NODE,
              address: new oAddress('o://relay'),
              description:
                'circuit-relay-v2 server for the OS — other peers dial through this',
              leader: null,
              parent: null,
              relay: true,
            },
          ]
        : []),
    ],
    lanes: [],
    inProgress: [],
  };
};
