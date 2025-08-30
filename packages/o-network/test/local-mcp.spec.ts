import {
  NodeType,
  oAddress,
  NetworkStatus,
  oNetwork,
  setupGracefulShutdown,
} from '../src/index.js';
import { expect } from 'chai';
import dotenv from 'dotenv';

dotenv.config();

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

describe('mcp-local @simple', async () => {
  it('should be able to startup the network', async () => {
    await network.start();
    expect(network.status).to.equal(NetworkStatus.RUNNING);
  });

  const intents: string[] = [
    // `Add this MCP server https://server.smithery.ai/exa/mcp?api_key=${process.env.SMITHERY_API_KEY}&profile=clear-deer-XqtpfN`,
  ];

  it('should be able to manually add a remote MCP server', async () => {
    await network.use(new oAddress('o://leader/node/mcp'), {
      method: 'add_remote_server',
      params: {
        mcpServerUrl: `https://server.smithery.ai/exa/mcp?api_key=${process.env.SMITHERY_API_KEY}&profile=clear-deer-XqtpfN`,
      },
    });
  });

  for (const intent of intents) {
    it(`should be able to resolve this intent "${intent}"`, async () => {
      const response = await network.use(new oAddress('o://leader'), {
        method: 'intent',
        params: {
          intent: intent,
        },
      });
      expect(response.result.data.success).to.equal(true);
    });
  }
});

describe('basic-usage @stop-network', async () => {
  it('should be able to stop the network', async () => {
    await network.stop();
    expect(network.status).to.equal(NetworkStatus.STOPPED);
  });
});
