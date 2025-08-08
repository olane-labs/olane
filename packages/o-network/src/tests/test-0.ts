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

  // const response = await network.use(new oAddress('o://leader'), {
  //   method: 'intent',
  //   params: {
  //     intent: 'Send a message to brendon',
  //   },
  // });
  // console.log('Start response: ', response.result.data);

  // let's test the intent resolution
  // const response = await network.use(new oAddress('o://leader'), {
  //   method: 'intent',
  //   params: {
  //     intent: 'Add this mcp server https://api.githubcopilot.com/mcp/',
  //   },
  // });
  // await new Promise((resolve) => setTimeout(resolve, 10_000));
  // await network.use(new oAddress('o://leader'), {
  //   method: 'intent',
  //   params: {
  //     intent: 'Add this mcp server https://api.githubcopilot.com/mcp/',
  //   },
  // });
  // console.log('Start response: ', response.result.data);
  // add mcp server https://api.githubcopilot.com/mcp/ with api key
  // const response = await network.addMcp('https://api.githubcopilot.com/mcp/', {
  //   apiKey: process.env.GITHUB_TOKEN,
  // });
  // network.use(new oAddress('o://vault'), {
  //   method: 'store',
  //   params: {
  //     key: 'o://vault/github_token',
  //     value: process.env.GITHUB_TOKEN,
  //   },
  // });
  // what it's like to search the network for a tool

  // await network.use(new oAddress('o://mcp'), {
  //   method: 'add_local_server',
  //   params: {
  //     name: 'playwright',
  //     command: 'npx',
  //     args: [
  //       '@playwright/mcp@latest',
  //       '--cdp-endpoint',
  //       'http://localhost:9222',
  //     ],
  //   },
  // });

  // const response = await network.use(new oAddress('o://leader'), {
  //   method: 'start',
  //   params: {
  //     intent: 'Use playwright and take a screenshot of the current page',
  //   },
  // });

  // console.log('Screenshot response: ', response.result.data);

  // ------------------------------------------------------------
  // const intent = 'Add a new MCP server with API key to the network';
  // const response = await network.use(new oAddress('o://leader'), {
  //   method: 'start',
  //   params: {
  //     intent: intent,
  //     userInput: {},
  //   },
  // });

  // console.log('Start response: ', response.result.data);

  // const intent22 =
  //   'Add a new MCP server with url = https://api.githubcopilot.com/mcp/ and API key = ' +
  //   process.env.GITHUB_TOKEN +
  //   ' to the network';
  // const response2 = await network.use(new oAddress('o://leader'), {
  //   method: 'start',
  //   params: {
  //     intent: intent22,
  //     userInput: {
  //       mcpServerUrl: 'https://api.githubcopilot.com/mcp/',
  //       apiKey: process.env.GITHUB_TOKEN,
  //     },
  //   },
  // });
  // console.log('Start response2: ', response2.result.data);
  // const response3 = await network.use(new oAddress('o://leader'), {
  //   method: 'start',
  //   params: {
  //     intent: intent,
  //     userInput: {},
  //   },
  // });
  // console.log('Start response3: ', response3.result.data);

  // ------------------------------------------------------------

  // If unsure which method to use, let's generate a request to elicit clarification from user (i.e what if they need to add auth)
  // const mostLikelyTool = (response.result.data as any[])[0];
  // const mostLikelyAddress = new oAddress(mostLikelyTool.metadata.origin);
  // const toolResponse = await network.use(mostLikelyAddress, {
  //   method: 'intent',
  //   params: {
  //     intent: intent,
  //   },
  // });
  // console.log('ToolResponse: ', toolResponse.result.data);
  // const { message } = toolResponse.result.data as any;
  // const { method, parameterNames } = JSON.parse(message);

  // await network.use(new oAddress('o://vault'), {
  //   method: 'store',
  //   params: {
  //     key: 'https://api.githubcopilot.com/mcp/',
  //     value: process.env.GITHUB_TOKEN,
  //   },
  // });

  // // generate the GET from vault CID to replay the value
  // // TODO: (architect) let's create a new function around "plan" to get the CID as a variable to use in other tools?
  // const vaultResponse = await network.use(new oAddress('o://vault'), {
  //   method: 'get',
  //   params: {
  //     key: 'https://api.githubcopilot.com/mcp/',
  //   },
  // });

  // console.log('vaultResponse:', vaultResponse.result.data);

  // const configResponse = await network.use(mostLikelyAddress, {
  //   method: 'intent_method_configuration',
  //   params: {
  //     intent: intent,
  //     pastSuccesses: [
  //       {
  //         method: 'add_server_with_api_key',
  //         params: {
  //           mcpServerUrl: 'https://api.githubcopilot.com/mcp/',
  //           apiKey: 'o://plan/mcp-github-api-key',
  //         },
  //       },
  //     ],
  //     userParameters: {
  //       mcpServerUrl: 'https://api.githubcopilot.com/mcp/',
  //     },
  //     method: method,
  //   },
  // });

  // console.log('ConfigResponse: ', configResponse.result.data);
  // const { message: payloadMessage } = configResponse.result.data as any;
  // const parameters = JSON.parse(payloadMessage);
  // console.log('Parameters: ', parameters);
  // const result = await network.use(mostLikelyAddress, {
  //   method: method,
  //   params: parameters,
  // });
  // console.log('Result: ', result.result.data);
  // if (result.result.error) {
  //   // we failed, let's ask the user for a key value
  // }

  // await network.use(new oAddress('o://setup'), {
  //   method: 'validate',
  //   params: {
  //     address: new oAddress('o://search'),
  //   },
  // });
  // const response = await network.use(new oAddress('o://search'), {
  //   method: 'search',
  //   params: {
  //     query: 'Look for files that are related to the client project',
  //   },
  // });
  // console.log('SearchResponse: ', response.result.data);
  // const storageKey = 'o://mcp/github/api-key';
  // await network.use(new oAddress('o://vault'), {
  //   method: 'store',
  //   params: { key: storageKey, value: process.env.GITHUB_TOKEN },
  // });
  // await network.addMcp('https://api.githubcopilot.com/mcp/');

  // const plan = new oPlan(network.entryNode(), {
  //   needs: ['o://mcp/github/api-key'],
  //   output: {
  //     dependencies: [],
  //     parameters: {},
  //   },
  // });
  // const result = await plan.plan('What are my priorities for today?');
  // console.log('Plan result: ', result);
})();
