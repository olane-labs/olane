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
  // noIndexNetwork: true,
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

describe('mcp-local @startup', async () => {
  it('should be able to startup the network', async () => {
    await network.start();
    expect(network.status).to.equal(NetworkStatus.RUNNING);
  });
});

describe('intelligence @configure-intelligence', async () => {
  it('should be able to set the intelligence preference to ollama', async () => {
    await network.use(new oAddress('o://memory'), {
      method: 'put',
      params: {
        key: 'intelligence-preference',
        value: 'o://ollama',
      },
    });
  });
});

describe('mcp-validate-url', async () => {
  it('should be able to validate a URL', async () => {
    const response = await network.use(new oAddress('o://leader/node/mcp'), {
      method: 'validate_url',
      params: {
        mcpServerUrl: `https://server.smithery.ai/exa/mcp?api_key=${process.env.SMITHERY_API_KEY}&profile=clear-deer-XqtpfN`,
      },
    });
    console.log(response.result.data);
    expect(response.result.success).to.equal(true);
  });
});

describe('mcp-explicit add server', async () => {
  it('should be able to manually add a remote MCP server', async () => {
    await network.use(new oAddress('o://leader/node/mcp'), {
      method: 'add_remote_server',
      params: {
        mcpServerUrl: `https://server.smithery.ai/exa/mcp?api_key=${process.env.SMITHERY_API_KEY}&profile=clear-deer-XqtpfN`,
      },
    });
  });
});

const intents: string[] = [
  `Add this MCP server https://server.smithery.ai/@upstash/context7-mcp/mcp?api_key=${process.env.SMITHERY_API_KEY}&profile=clear-deer-XqtpfN`,
  `Add this MCP server https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem at directory ./`,
  `Add this MCP server https://github.com/makenotion/notion-mcp-server with the API key ${process.env.NOTION_API_KEY}`,
];

for (const intent of intents) {
  describe(`mcp-local @intent ${intent}`, async () => {
    it(`should be able to resolve this`, async () => {
      const response = await network.use(new oAddress('o://leader'), {
        method: 'intent',
        params: {
          intent: intent,
        },
      });
      expect(response.result.success).to.equal(true);
    }, 120000); // 2 minutes timeout for each intent test
  });
}

describe('basic-usage @stop-network', async () => {
  it('should be able to stop the network', async () => {
    await network.stop();
    expect(network.status).to.equal(NetworkStatus.STOPPED);
  });
});
