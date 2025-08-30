// import {
//   NodeType,
//   oAddress,
//   NetworkStatus,
//   oNetwork,
//   setupGracefulShutdown,
// } from '../../src/index.js';
// import { expect } from 'chai';
// import { NodeState } from '@olane/o-core';
// import dotenv from 'dotenv';

// dotenv.config();

// const network = new oNetwork({
//   // configFilePath: path.join(os.homedir(), '.olane', 'config.json'),
//   nodes: [
//     {
//       type: NodeType.LEADER,
//       address: new oAddress('o://leader'),
//       leader: null,
//       parent: null,
//     },
//     {
//       type: NodeType.NODE,
//       address: new oAddress('o://node'),
//       leader: null,
//       parent: null,
//     },
//   ],
//   plans: [],
//   noIndexNetwork: true,
// });

// setupGracefulShutdown(
//   async () => {
//     console.log('Stopping o-network...');
//     await network.stop();
//     console.log('o-network stopped successfully');
//   },
//   {
//     timeout: 30000, // 30 seconds timeout
//     onTimeout: () => {
//       console.error('Shutdown timeout reached, forcing exit');
//     },
//   },
// );

// describe('basic-usage @initialize', async () => {
//   it('should be able to startup the network', async () => {
//     await network.start();
//     expect(network.status).to.equal(NetworkStatus.RUNNING);
//   });

//   // disabled for now, to avoid unecessary indexing costs
//   // it('should be able to index the network', async () => {
//   //   const entryNode = network.entryNode();
//   //   expect(entryNode).to.exist;
//   //   expect(entryNode.state).to.equal(NodeState.RUNNING);
//   //   const response = await entryNode.use(new oAddress('o://leader'), {
//   //     method: 'index_network',
//   //     params: {},
//   //   });
//   //   const data = response.result.data;
//   //   expect(data).to.exist;
//   //   expect(data.error).to.be.undefined;
//   //   expect(data.message).to.equal('Network indexed!');
//   // });
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

// describe('basic-usage @stop-network', async () => {
//   it('should be able to stop the network', async () => {
//     await network.stop();
//     expect(network.status).to.equal(NetworkStatus.STOPPED);
//   });
// });
