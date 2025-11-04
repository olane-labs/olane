import { NodeType, oAddress, setupGracefulShutdown } from '@olane/o-core';
import { OlaneOS } from '../../src/o-olane-os/index.js';

export const defaultOSInstance = new OlaneOS({
  // configFilePath: path.join(os.homedir(), '.olane', 'config.json'),
  nodes: [
    {
      type: NodeType.LEADER,
      address: new oAddress('o://leader'),
      description: 'Leader for testing',
      leader: null,
      parent: null,
    },
    {
      type: NodeType.NODE,
      address: new oAddress('o://node'),
      description: 'Node for testing',
      leader: null,
      parent: null,
    },
  ],
  lanes: [],
  noIndexNetwork: true,
});

setupGracefulShutdown(
  async () => {
    console.log('Stopping o-os instance...');
    await defaultOSInstance.stop();
    console.log('o-os instance stopped successfully');
  },
  {
    timeout: 30000, // 30 seconds timeout
    onTimeout: () => {
      console.error('Shutdown timeout reached, forcing exit');
    },
  },
);
