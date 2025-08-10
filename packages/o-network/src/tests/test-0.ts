import { oNetwork } from '../network';
import { NodeType, oAddress } from '@olane/o-core';
import dotenv from 'dotenv';
import { setupGracefulShutdown } from '../utils/graceful-shutdown';

dotenv.config();

(async () => {
  const network = new oNetwork({
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
    plans: [],
    noIndexNetwork: true,
  });

  setupGracefulShutdown(
    async () => {
      console.log('Stopping o-network...');
      await network.stop();
      console.log('o-network stopped successfully');
    },
    {
      timeout: 30000, // 30 seconds timeout
      onTimeout: () => {
        console.error('Shutdown timeout reached, forcing exit');
      },
    },
  );

  await network.start();
  console.log('Network started!!!--------------------------------');

  await network.use(new oAddress('o://vector-store'), {
    method: 'add_documents',
    params: {
      documents: [
        {
          pageContent: 'Slack is a messaging tool',
          metadata: {
            address: 'o://leader/node/mcp/slack',
            id: 1,
          },
        },
        {
          pageContent: 'Dillon sent a message to brendon on slack',
          metadata: {
            address: 'o://leader/node/mcp/slack',
            id: 2,
          },
        },
        {
          pageContent: "Brendon's slack username is brendon",
          metadata: {
            address: 'o://leader/node/mcp/slack',
            id: 3,
          },
        },
      ],
    },
  });
})();
