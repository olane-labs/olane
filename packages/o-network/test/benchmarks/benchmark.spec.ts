import {
  NodeType,
  oAddress,
  NetworkStatus,
  oNetwork,
  setupGracefulShutdown,
} from '../../src/index.js';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { multiaddr } from '@olane/o-config';
import { defaultNetwork } from '../utils/default.network.js';
import { GITHUB_TEST_CASES } from './github/github.test-cases.js';

dotenv.config();

const network = defaultNetwork;

describe('basic-usage @initialize', async () => {
  it('should be able to startup the network', async () => {
    await network.start();
    expect(network.status).to.equal(NetworkStatus.RUNNING);
  });
});

describe('o-mcp github-benchmarks', () => {
  it('should be able to add the github mcp server', async () => {
    const response = await network.use(new oAddress('o://leader'), {
      method: 'intent',
      params: {
        intent: `Add the MCP server https://api.githubcopilot.com/mcp/ use the headers "Authorization: Bearer ${process.env.GITHUB_API_KEY}"`,
      },
    });
    console.log(response.result.data);
  }, 300_000);

  // it('should be able to create a branch', async () => {
  //   const response = await network.use(new oAddress('o://leader'), {
  //     method: 'intent',
  //     params: {
  //       intent: `Create a branch called "test-branch" in the repo "travel-planner-app"`,
  //     },
  //   });
  //   console.log(response.result.data);
  // }, 300_000);

  it('should be able to test github benchmarks', async () => {
    for (const testCase of GITHUB_TEST_CASES) {
      console.log(testCase.input);
      const handshakeResponse = await network.use(new oAddress('o://leader'), {
        method: 'intent',
        params: {
          intent: testCase.input,
        },
      });
      console.log(handshakeResponse.result.data);
      // const result = await testCase.output;
      // expect(result).to.contain(testCase.output.contains);
    }
  }, 300_000);
});

describe('basic-usage @stop-network', async () => {
  it('should be able to stop the network', async () => {
    await network.stop();
    expect(network.status).to.equal(NetworkStatus.STOPPED);
  });
});
