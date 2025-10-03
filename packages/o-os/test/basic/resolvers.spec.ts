// import { oAddress, NodeState } from '@olane/o-core';
// import { expect } from 'chai';
// import dotenv from 'dotenv';
// import { defaultOSInstance } from '../utils/os.default.js';
// import { OlaneOSSystemStatus } from '../../src/o-olane-os/enum/o-os.status-enum.js';

// dotenv.config();

// const network = defaultOSInstance;

// describe('basic-usage @initialize', async () => {
//   it('should be able to startup the network', async () => {
//     await network.start();
//     expect(network.status).to.equal(OlaneOSSystemStatus.RUNNING);
//   });

//   it('should be able to handshake with a method address', async () => {
//     const entryNode = network.entryNode();
//     expect(entryNode).to.exist;
//     expect(entryNode.state).to.equal(NodeState.RUNNING);
//     // configure the intelligence tool
//     const response = await entryNode.use(
//       new oAddress('o://leader/node/mcp/validate_url'),
//       {
//         method: 'handshake',
//         params: {
//           intent: 'Validate the URL of an MCP server',
//         },
//       },
//     );
//     console.log(response.result.data);
//   });
// });

// describe('basic-usage @stop-network', async () => {
//   it('should be able to stop the network', async () => {
//     await network.stop();
//     expect(network.status).to.equal(OlaneOSSystemStatus.STOPPED);
//   });
// });
