// import { expect } from 'chai';
// import { RegistryMemoryTool } from '../src/registry/registry-memory.tool.js';
// import { oNodeAddress } from '@olane/o-node';
// import { oAddress, oRequest } from '@olane/o-core';
// import { oRegistrationParams } from '@olane/o-protocol';

// describe('RegistryMemoryTool', () => {
//   let registry: RegistryMemoryTool;

//   beforeEach(() => {
//     registry = new RegistryMemoryTool({
//       name: 'test-registry',
//       parent: oAddress.leader() as oNodeAddress,
//       leader: oAddress.leader() as oNodeAddress,
//       network: {
//         listeners: [],
//       },
//     });
//   });

//   describe('_tool_commit()', () => {
//     it('should register a node with all fields', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-123',
//         address: 'o://leader/services/embeddings',
//         protocols: ['/embeddings/1.0.0', '/text/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/4001'],
//         staticAddress: 'o://embeddings-text',
//         registeredAt: Date.now(),
//       };

//       const request = {
//         params,
//       } as unknown as oRequest;

//       const result = await registry._tool_commit(request);
//       expect(result.success).to.be.true;

//       // Verify node is in registry
//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(1);
//       expect(allNodes[0].peerId).to.equal('peer-123');
//       expect(allNodes[0].address).to.equal('o://leader/services/embeddings');
//     });

//     it('should register a node with minimal fields', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-456',
//         address: 'o://worker',
//         protocols: [],
//         transports: ['/memory'],
//       };

//       const request = {
//         params,
//       } as unknown as oRequest;

//       const result = await registry._tool_commit(request);
//       expect(result.success).to.be.true;

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(1);
//       expect(allNodes[0].peerId).to.equal('peer-456');
//     });

//     it('should update an existing node on re-registration', async () => {
//       const initialParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-789',
//         address: 'o://service-v1',
//         protocols: ['/service/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/4001'],
//       };

//       await registry._tool_commit({
//         params: initialParams,
//       } as unknown as oRequest);

//       // Re-register with updated info
//       const updatedParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-789',
//         address: 'o://service-v2',
//         protocols: ['/service/2.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/4002'],
//       };

//       await registry._tool_commit({
//         params: updatedParams,
//       } as unknown as oRequest);

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(1);
//       expect(allNodes[0].address).to.equal('o://service-v2');
//       expect(allNodes[0].protocols).to.deep.equal(['/service/2.0.0']);
//     });

//     it('should register multiple nodes with same protocols', async () => {
//       const node1: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-001',
//         address: 'o://embeddings-node-1',
//         protocols: ['/embeddings/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/5001'],
//       };

//       const node2: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-002',
//         address: 'o://embeddings-node-2',
//         protocols: ['/embeddings/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/5002'],
//       };

//       await registry._tool_commit({ params: node1 } as unknown as oRequest);
//       await registry._tool_commit({ params: node2 } as unknown as oRequest);

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(2);
//     });

//     it('should set registeredAt timestamp if not provided', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-timestamp',
//         address: 'o://test',
//         protocols: [],
//         transports: ['/memory'],
//       };

//       const beforeTime = Date.now();
//       await registry._tool_commit({ params } as unknown as oRequest);
//       const afterTime = Date.now();

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       const registeredNode = allNodes[0];

//       expect(registeredNode.registeredAt).to.be.a('number');
//       expect(registeredNode.registeredAt).to.be.at.least(beforeTime);
//       expect(registeredNode.registeredAt).to.be.at.most(afterTime);
//     });

//     it('should preserve custom registeredAt timestamp', async () => {
//       const customTimestamp = 1234567890;
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-custom-time',
//         address: 'o://test',
//         protocols: [],
//         transports: ['/memory'],
//         registeredAt: customTimestamp,
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes[0].registeredAt).to.equal(customTimestamp);
//     });

//     it('should update protocol mapping on registration', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-protocol-map',
//         address: 'o://test',
//         protocols: ['/embeddings/1.0.0', '/chat/1.0.0'],
//         transports: ['/memory'],
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       // Search by protocol to verify mapping
//       const searchResult = await registry._tool_search({
//         params: { protocols: ['/embeddings/1.0.0'] },
//       } as unknown as oRequest);

//       expect(searchResult).to.have.lengthOf(1);
//       expect(searchResult[0].peerId).to.equal('peer-protocol-map');
//     });
//   });

//   describe('_tool_search()', () => {
//     beforeEach(async () => {
//       // Setup test data
//       const nodes: oRegistrationParams[] = [
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-embeddings-1',
//           address: 'o://leader/services/embeddings-text',
//           staticAddress: 'o://embeddings-text',
//           protocols: ['/embeddings/1.0.0', '/text/1.0.0'],
//           transports: ['/ip4/127.0.0.1/tcp/6001'],
//           registeredAt: 1000,
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-embeddings-2',
//           address: 'o://leader/services/embeddings-image',
//           staticAddress: 'o://embeddings-image',
//           protocols: ['/embeddings/1.0.0', '/image/1.0.0'],
//           transports: ['/ip4/127.0.0.1/tcp/6002'],
//           registeredAt: 2000,
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-chat',
//           address: 'o://leader/services/chat',
//           staticAddress: 'o://chat',
//           protocols: ['/chat/1.0.0'],
//           transports: ['/ip4/127.0.0.1/tcp/6003'],
//           registeredAt: 3000,
//         },
//       ];

//       for (const node of nodes) {
//         await registry._tool_commit({ params: node } as unknown as oRequest);
//       }
//     });

//     it('should search by staticAddress (exact match)', async () => {
//       const result = await registry._tool_search({
//         params: { staticAddress: 'o://embeddings-text' },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].peerId).to.equal('peer-embeddings-1');
//       expect(result[0].staticAddress).to.equal('o://embeddings-text');
//     });

//     it('should search by address (exact match)', async () => {
//       const result = await registry._tool_search({
//         params: { address: 'o://leader/services/chat' },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].peerId).to.equal('peer-chat');
//     });

//     it('should search by single protocol', async () => {
//       const result = await registry._tool_search({
//         params: { protocols: ['/chat/1.0.0'] },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].peerId).to.equal('peer-chat');
//     });

//     it('should search by multiple protocols (AND logic)', async () => {
//       const result = await registry._tool_search({
//         params: { protocols: ['/embeddings/1.0.0', '/text/1.0.0'] },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].peerId).to.equal('peer-embeddings-1');
//     });

//     it('should return multiple nodes matching protocol', async () => {
//       const result = await registry._tool_search({
//         params: { protocols: ['/embeddings/1.0.0'] },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(2);
//       expect(result[0].peerId).to.equal('peer-embeddings-2'); // More recent
//       expect(result[1].peerId).to.equal('peer-embeddings-1');
//     });

//     it('should return empty array when no results found', async () => {
//       const result = await registry._tool_search({
//         params: { staticAddress: 'o://nonexistent' },
//       } as unknown as oRequest);

//       expect(result).to.be.an('array');
//       expect(result).to.have.lengthOf(0);
//     });

//     it('should return empty array for non-matching protocol', async () => {
//       const result = await registry._tool_search({
//         params: { protocols: ['/nonexistent/1.0.0'] },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(0);
//     });

//     it('should sort results by registeredAt (most recent first)', async () => {
//       const result = await registry._tool_search({
//         params: { protocols: ['/embeddings/1.0.0'] },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(2);
//       expect(result[0].registeredAt).to.equal(2000);
//       expect(result[1].registeredAt).to.equal(1000);
//       expect(result[0].registeredAt).to.be.greaterThan(result[1].registeredAt!);
//     });

//     it('should handle combined search parameters', async () => {
//       const result = await registry._tool_search({
//         params: {
//           staticAddress: 'o://embeddings-text',
//           protocols: ['/embeddings/1.0.0'],
//         },
//       } as unknown as oRequest);

//       // Should return the node that matches staticAddress
//       // Note: Current implementation concatenates results, may have duplicates
//       expect(result.length).to.be.at.least(1);
//       const textEmbedding = result.find(
//         (r: any) => r.peerId === 'peer-embeddings-1',
//       );
//       expect(textEmbedding).to.exist;
//     });

//     it('should handle search with no parameters', async () => {
//       const result = await registry._tool_search({
//         params: {},
//       } as unknown as oRequest);

//       // Empty search should return empty array
//       expect(result).to.be.an('array');
//       expect(result).to.have.lengthOf(0);
//     });

//     it('should handle partial protocol match failure', async () => {
//       // Search for both protocols when node only has one
//       const result = await registry._tool_search({
//         params: { protocols: ['/chat/1.0.0', '/embeddings/1.0.0'] },
//       } as unknown as oRequest);

//       // AND logic: node must have ALL protocols
//       expect(result).to.have.lengthOf(0);
//     });

//     it('should handle nodes without registeredAt timestamp', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-no-timestamp',
//         address: 'o://test-no-timestamp',
//         protocols: ['/test/1.0.0'],
//         transports: ['/memory'],
//         // No registeredAt
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       const result = await registry._tool_search({
//         params: { protocols: ['/test/1.0.0'] },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].peerId).to.equal('peer-no-timestamp');
//     });
//   });

//   describe('_tool_find_all()', () => {
//     it('should return empty array for empty registry', async () => {
//       const result = await registry._tool_find_all({} as oRequest);
//       expect(result).to.be.an('array');
//       expect(result).to.have.lengthOf(0);
//     });

//     it('should return single node', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'single-peer',
//         address: 'o://single',
//         protocols: [],
//         transports: ['/memory'],
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       const result = await registry._tool_find_all({} as oRequest);
//       expect(result).to.have.lengthOf(1);
//       expect(result[0].peerId).to.equal('single-peer');
//     });

//     it('should return all registered nodes', async () => {
//       const nodes = [
//         {
//           peerId: 'peer-1',
//           address: 'o://node-1',
//           protocols: [],
//           transports: ['/memory'],
//         },
//         {
//           peerId: 'peer-2',
//           address: 'o://node-2',
//           protocols: [],
//           transports: ['/memory'],
//         },
//         {
//           peerId: 'peer-3',
//           address: 'o://node-3',
//           protocols: [],
//           transports: ['/memory'],
//         },
//       ];

//       for (const node of nodes) {
//         await registry._tool_commit({
//           params: node as unknown as oRegistrationParams,
//         } as unknown as unknown as oRequest);
//       }

//       const result = await registry._tool_find_all({} as oRequest);
//       expect(result).to.have.lengthOf(3);

//       const peerIds = result.map((r: any) => r.peerId);
//       expect(peerIds).to.include.members(['peer-1', 'peer-2', 'peer-3']);
//     });

//     it('should return nodes with all their properties', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'full-peer',
//         address: 'o://full-node',
//         staticAddress: 'o://static',
//         protocols: ['/protocol/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/4001'],
//         ttl: 3600,
//         registeredAt: 12345,
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       const result = await registry._tool_find_all({} as oRequest);
//       expect(result[0]).to.deep.include({
//         peerId: 'full-peer',
//         address: 'o://full-node',
//         staticAddress: 'o://static',
//         ttl: 3600,
//         registeredAt: 12345,
//       });
//       expect(result[0].protocols).to.deep.equal(['/protocol/1.0.0']);
//       expect(result[0].transports).to.deep.equal(['/ip4/127.0.0.1/tcp/4001']);
//     });
//   });

//   describe('_tool_remove()', () => {
//     it('should remove an existing node', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-to-remove',
//         address: 'o://removable',
//         protocols: ['/test/1.0.0'],
//         transports: ['/memory'],
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       let allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(1);

//       const result = await registry._tool_remove({
//         params,
//       } as unknown as oRequest);
//       expect(result.success).to.be.true;

//       allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(0);
//     });

//     it('should handle removing non-existent node', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'nonexistent-peer',
//         address: 'o://nonexistent',
//         protocols: [],
//         transports: [],
//       };

//       const result = await registry._tool_remove({
//         params,
//       } as unknown as oRequest);
//       expect(result.success).to.be.true; // Should succeed silently
//     });

//     it('should remove correct node when multiple exist', async () => {
//       const nodes = [
//         {
//           peerId: 'peer-1',
//           address: 'o://node-1',
//           protocols: [],
//           transports: ['/memory'],
//         },
//         {
//           peerId: 'peer-2',
//           address: 'o://node-2',
//           protocols: [],
//           transports: ['/memory'],
//         },
//         {
//           peerId: 'peer-3',
//           address: 'o://node-3',
//           protocols: [],
//           transports: ['/memory'],
//         },
//       ];

//       for (const node of nodes) {
//         await registry._tool_commit({
//           params: node as unknown as oRegistrationParams,
//         } as unknown as unknown as oRequest);
//       }

//       await registry._tool_remove({
//         params: { peerId: 'peer-2' } as unknown as oRegistrationParams,
//       } as unknown as oRequest);

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(2);

//       const peerIds = allNodes.map((r: any) => r.peerId);
//       expect(peerIds).to.not.include('peer-2');
//       expect(peerIds).to.include.members(['peer-1', 'peer-3']);
//     });

//     it('should not affect search results after removal', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-search-remove',
//         address: 'o://test',
//         staticAddress: 'o://test-static',
//         protocols: ['/test/1.0.0'],
//         transports: ['/memory'],
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       let searchResult = await registry._tool_search({
//         params: { staticAddress: 'o://test-static' },
//       } as unknown as oRequest);
//       expect(searchResult).to.have.lengthOf(1);

//       await registry._tool_remove({ params } as unknown as oRequest);

//       searchResult = await registry._tool_search({
//         params: { staticAddress: 'o://test-static' },
//       } as unknown as oRequest);
//       expect(searchResult).to.have.lengthOf(0);
//     });
//   });

//   describe('Edge cases and error scenarios', () => {
//     it('should handle registry with large number of nodes', async () => {
//       const nodeCount = 100;
//       for (let i = 0; i < nodeCount; i++) {
//         const params: oRegistrationParams = {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: `peer-${i}`,
//           address: `o://node-${i}`,
//           protocols: ['/test/1.0.0'],
//           transports: ['/memory'],
//           registeredAt: i,
//         };
//         await registry._tool_commit({ params } as unknown as oRequest);
//       }

//       const allNodes = await registry._tool_find_all({} as oRequest);
//       expect(allNodes).to.have.lengthOf(nodeCount);

//       // Verify sorting still works
//       const searchResult = await registry._tool_search({
//         params: { protocols: ['/test/1.0.0'] },
//       } as unknown as oRequest);
//       expect(searchResult[0].registeredAt).to.equal(nodeCount - 1); // Most recent
//     });

//     it('should handle nodes with empty protocols array', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-no-protocols',
//         address: 'o://no-protocols',
//         protocols: [],
//         transports: ['/memory'],
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       const result = await registry._tool_search({
//         params: { address: 'o://no-protocols' },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].protocols).to.be.an('array').that.is.empty;
//     });

//     it('should handle special characters in addresses', async () => {
//       const params: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-special',
//         address: 'o://service-name_v2.0',
//         staticAddress: 'o://service-name_v2.0',
//         protocols: [],
//         transports: ['/memory'],
//       };

//       await registry._tool_commit({ params } as unknown as oRequest);

//       const result = await registry._tool_search({
//         params: { staticAddress: 'o://service-name_v2.0' },
//       } as unknown as oRequest);

//       expect(result).to.have.lengthOf(1);
//       expect(result[0].address).to.equal('o://service-name_v2.0');
//     });
//   });
// });
