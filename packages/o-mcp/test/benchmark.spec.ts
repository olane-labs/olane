// import { expect } from 'chai';
// import { GITHUB_TEST_CASES } from './benchmarks/github/github.test-cases.js';
// import { McpBridgeTool } from '../src/index.js';
// import { NodeState, oAddress } from '@olane/o-core';
// import { IntelligenceTool } from '@olane/o-intelligence';
// import { oLeaderNode } from '@olane/o-leader';

// const leader = new oLeaderNode({
//   parent: null,
//   leader: null,
// });
// const mcpTool = new McpBridgeTool({
//   parent: null,
//   leader: null,
// });
// leader.addChildNode(mcpTool);
// const intelligenceTool = new IntelligenceTool({
//   parent: mcpTool.address,
//   leader: mcpTool.address,
// });
// leader.addChildNode(intelligenceTool);

// describe('o-mcp start node', () => {
//   it('should be able to start a node', async () => {
//     await leader.start();
//     expect(mcpTool.state).to.equal(NodeState.RUNNING);
//   });
// });

// describe('o-mcp github-benchmarks', () => {
//   it('should be able to test github benchmarks', async () => {
//     for (const testCase of GITHUB_TEST_CASES) {
//       console.log(testCase.input);
//       const handshakeResponse = await mcpTool.use(mcpTool.address, {
//         method: 'handshake',
//         params: {
//           intent: testCase.input,
//         },
//       });
//       console.log(handshakeResponse.result.data);
//       // const result = await testCase.output;
//       // expect(result).to.contain(testCase.output.contains);
//     }
//   });
// });

// describe('o-mcp stop node', () => {
//   it('should be able to stop a node', async () => {
//     await leader.stop();
//     expect(mcpTool.state).to.equal(NodeState.STOPPED);
//   });
// });
