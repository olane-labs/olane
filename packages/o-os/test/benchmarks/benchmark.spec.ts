import dotenv from 'dotenv';
import { expect } from 'chai';
import { defaultOSInstance } from '../utils/os.default.js';
import { OlaneOSSystemStatus } from '../../src/o-olane-os/enum/o-os.status-enum.js';
import { oAddress } from '@olane/o-core';
import { GITHUB_TEST_CASES } from './github/github.test-cases.js';

dotenv.config();

const olaneOSInstance = defaultOSInstance;

describe('basic-usage @initialize', async () => {
  it('should be able to startup the OS instance', async () => {
    await olaneOSInstance.start();
    expect(olaneOSInstance.status).to.equal(OlaneOSSystemStatus.RUNNING);
  });
});

// describe('intelligence @configure-intelligence', async () => {
//   it('should be able to set the intelligence preference to ollama', async () => {
//     await network.use(new oAddress('o://memory'), {
//       method: 'put',
//       params: {
//         key: 'intelligence-preference',
//         value: 'o://ollama',
//       },
//     });
//   });
// });

describe('o-mcp github-benchmarks', () => {
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
    // const intent = `Add the MCP server https://api.githubcopilot.com/mcp/ use the headers "Authorization: Bearer ${process.env.GITHUB_API_KEY}"`;
    const intent =
      'Add the linear mcp server with command "npx -y mcp-remote https://mcp.linear.app/sse"';
    const response = await olaneOSInstance.use(oAddress.leader(), {
      method: 'intent',
      params: {
        intent: intent,
      },
    });

    console.log('Setup MCP server response:');
    console.log(response.result.data);
    // for (const testCase of GITHUB_TEST_CASES) {
    //   console.log(testCase.input);
    //   const handshakeResponse = await olaneOSInstance.use(oAddress.leader(), {
    //     method: 'intent',
    //     params: {
    //       intent: testCase.input,
    //     },
    //   });
    //   console.log(
    //     `Finished with ${(handshakeResponse.result.data as any).cycles} cycles`,
    //   );
    //   console.log(handshakeResponse.result.data);
    //   // const result = await testCase.output;
    //   // expect(result).to.contain(testCase.output.contains);
    // }
  }, 300_000);
});

describe('basic-usage @stop-network', async () => {
  it('should be able to stop the network', async () => {
    await olaneOSInstance.stop();
    expect(olaneOSInstance.status).to.equal(OlaneOSSystemStatus.STOPPED);
  });
});
