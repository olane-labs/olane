import { NodeType, oAddress, setupGracefulShutdown } from '@olane/o-core';
import { oNetwork } from '../../src/index.js';

export const defaultNetwork = new oNetwork({
  // configFilePath: path.join(os.homedir(), '.olane', 'config.json'),
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader'),
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://node'),
      leader: null,
      parent: null,
    },
  ],
  lanes: [],
  // noIndexNetwork: true,
});

setupGracefulShutdown(
  async () => {
    console.log('Stopping o-network...');
    await defaultNetwork.stop();
    console.log('o-network stopped successfully');
  },
  {
    timeout: 30000, // 30 seconds timeout
    onTimeout: () => {
      console.error('Shutdown timeout reached, forcing exit');
    },
  },
);
