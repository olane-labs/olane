import { oNetwork } from '../network';
import { NodeType, oAddress } from '@olane/o-core';
import dotenv from 'dotenv';

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
    external: {
      mcps: [
        // {
        //   name: 'mcp-github',
        //   url: 'https://api.githubcopilot.com/mcp/',
        //   inputs: {
        //     apiKey: 'o://mcp/github/api-key',
        //   },
        // },
      ],
    },
  });
  await network.start();
  console.log('network started');
  console.log('storing plan...');
  await network.use(new oAddress('o://plan'), {
    method: 'put',
    params: {
      key: 'test',
      value: 'test',
    },
  });
  console.log('plan stored');
  console.log('getting plan...');
  const response = await network.use(new oAddress('o://plan/test'), {
    method: 'get',
  });
  console.log('response: ', response);
})();
