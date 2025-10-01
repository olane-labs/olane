import { oAddress, NodeState } from '@olane/o-core';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { defaultOSInstance } from '../utils/os.default.js';
import { OlaneOSSystemStatus } from '../../src/o-olane-os/enum/o-os.status-enum.js';

dotenv.config();

const network = defaultOSInstance;

describe('basic-usage @initialize', async () => {
  it('should be able to startup the network', async () => {
    await network.start();
    expect(network.status).to.equal(OlaneOSSystemStatus.RUNNING);
  });

  // disabled for now, to avoid unecessary indexing costs
  // it('should be able to index the network', async () => {
  //   const entryNode = network.entryNode();
  //   expect(entryNode).to.exist;
  //   expect(entryNode.state).to.equal(NodeState.RUNNING);
  //   const response = await entryNode.use(new oAddress('o://leader'), {
  //     method: 'index_network',
  //     params: {},
  //   });
  //   const data = response.result.data;
  //   expect(data).to.exist;
  //   expect(data.error).to.be.undefined;
  //   expect(data.message).to.equal('Network indexed!');
  // });

  it('should be able to use olane remote services', async () => {
    const entryNode = network.entryNode();
    expect(entryNode).to.exist;
    expect(entryNode.state).to.equal(NodeState.RUNNING);
    // configure the intelligence tool
    // await entryNode.use(new oAddress('o://intelligence'), {
    //   method: 'configure',
    //   params: {
    //     modelProvider: 'anthropic',
    //     hostingProvider: 'olane',
    //     accessToken: 'test',
    //     address: 'o://leader/intelligence',
    //   },
    // });
    // use the intelligence tool
    const response2 = await entryNode.use(new oAddress('o://perplexity'), {
      method: 'completion',
      params: {
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: 'What is the weather in Tokyo?',
          },
        ],
      },
    });
    console.log(response2.result.data);
  });
});

// describe('olane network usage', async () => {
//   it('should be able to use the olane network', async () => {
//     // let's dial the other network

//     const response = await network.use(
//       new oAddress('o://leader', [
//         multiaddr('/dns4/leader.olane.com/tcp/4000/tls/ws'),
//       ]),
//       {
//         method: 'intent',
//         params: {
//           intent: 'What can I do?',
//         },
//       },
//     );
//     console.log(response.result.data);
//   });
// });

// describe('external-networks', async () => {
//   it('should be able to use an external network', async () => {
//     const network2 = new oNetwork({
//       // configFilePath: path.join(os.homedir(), '.olane', 'config.json'),
//       nodes: [
//         {
//           type: NodeType.LEADER,
//           address: new oAddress('o://leader'),
//           leader: null,
//           parent: null,
//         },
//         {
//           type: NodeType.NODE,
//           address: new oAddress('o://node2'),
//           leader: null,
//           parent: null,
//         },
//       ],
//       plans: [],
//       noIndexNetwork: true,
//     });
//     await network2.start();
//     expect(network2.status).to.equal(NetworkStatus.RUNNING);

//     // let's dial the other network

//     await network2.use(
//       new oAddress('o://leader', [
//         ...(network?.rootLeader?.address.libp2pTransports || []),
//       ]),
//       {
//         method: 'index_network',
//         params: {},
//       },
//     );
//   });
// });

describe('basic-usage @stop-network', async () => {
  it('should be able to stop the network', async () => {
    await network.stop();
    expect(network.status).to.equal(OlaneOSSystemStatus.STOPPED);
  });
});
