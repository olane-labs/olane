import 'dotenv/config';
import { oAddress, NodeState } from '@olane/o-core';
import { expect } from 'chai';
import { defaultOSInstance } from '../utils/os.default.js';
import { OlaneOSSystemStatus } from '../../src/o-olane-os/enum/o-os.status-enum.js';
import { oNodeAddress, oNodeTransport } from '@olane/o-node';
import { tmpNode } from '../utils/tmp.node.js';
import { oHumanLoginTool } from '@olane/o-login';
import { oLimitedTool } from '@olane/o-client-limited';

const network = defaultOSInstance;

const entryNode = tmpNode;
let humanNode: oHumanLoginTool;

describe('playground running', async () => {
  it('should be able to use stream from a provider service', async () => {
    await entryNode.start();
    expect(entryNode).to.exist;
    expect(entryNode.state).to.equal(NodeState.RUNNING);

    const leader = new oNodeAddress('o://leader', [
      new oNodeTransport(
        // '/dns4/leader.olane.com/tcp/4000/tls/ws',
        '/ip4/127.0.0.1/tcp/4000/ws/p2p/12D3KooWPHdsHhEdyBd9DS2zHJ1vRSyqSkZ97iT7F8ByYJ7U7bw8',
      ),
    ]);

    // const joinedNode = new oLimitedTool({
    //   address: new oNodeAddress('o://joined'),
    //   leader: leader,
    //   parent: leader,
    //   joinToken: 'test',
    // });

    // await joinedNode.start(); // should join the network

    // humanNode = new oHumanLoginTool({
    //   address: new oNodeAddress('o://human'),
    //   leader: leader,
    //   parent: leader,
    //   respond: async (intent: string) => {
    //     return 'Request approved';
    //   },
    //   answer: async (question: string) => {
    //     return 'Request approved';
    //   },
    //   receiveStream: async (data: any) => {
    //     console.log('Received stream:', data);
    //   },
    // });
    // await humanNode.start();
    const response = await entryNode.useStream(
      leader,
      {
        method: 'intent',
        params: {
          _isStreaming: true,
          intent:
            'Use o://intelligence to generate the expo react native code for a new table view with example data populated',
          _token: 'test',
        },
      },
      {
        abortSignal: AbortSignal.timeout(5_000),
        onChunk: (chunk) => {
          console.log(
            'Received chunk:',
            JSON.stringify(chunk.result.data, null, 2),
          );
        },
      },
    );

    console.log('Response:', JSON.stringify(response, null, 2));
    // const response = await entryNode.use(
    //   new oNodeAddress('o://leader/joined', leader.transports),
    //   {
    //     method: 'ping',
    //     params: {},
    //   },
    // );
    // console.log('Response:', response.result.data);
    await entryNode.stop();
  });

  // it('should fail when action is not approved', async () => {
  //   const entryNode = tmpNode;
  //   // await entryNode.start();
  //   expect(entryNode).to.exist;
  //   expect(entryNode.state).to.equal(NodeState.RUNNING);

  //   console.log('Setting approval preference to deny a specific action');
  //   // Set a preference to deny a specific tool/method combination
  //   const setPreferenceResponse = await entryNode.use(
  //     new oNodeAddress('o://approval'),
  //     {
  //       method: 'set_preference',
  //       params: {
  //         toolMethod: 'o://storage/delete',
  //         preference: 'deny',
  //       },
  //     },
  //   );
  //   console.log('Set preference response:', setPreferenceResponse.result.data);
  //   expect(setPreferenceResponse.result.data).to.exist;

  //   console.log('Attempting to request approval for denied action');
  //   // Now request approval for the denied action
  //   const approvalResponse = await entryNode.use(
  //     new oNodeAddress('o://approval'),
  //     {
  //       method: 'request_approval',
  //       params: {
  //         toolAddress: 'o://storage',
  //         method: 'delete',
  //         params: { key: 'test-key' },
  //         intent: 'Testing approval denial',
  //       },
  //     },
  //   );
  //   console.log('Approval response:', approvalResponse.result.data);

  //   // Verify the action was denied
  //   expect(approvalResponse.result.data).to.exist;
  //   expect((approvalResponse.result.data as any).approved).to.be.false;
  //   expect((approvalResponse.result.data as any).decision).to.equal('deny');
  //   console.log('✓ Action was successfully denied by approval system');

  //   await entryNode.stop();
  //   await humanNode.stop();
  // });
});
