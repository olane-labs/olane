// import { expect } from 'chai';
// import { oLeaderNode } from '../src/leader.node.js';
// import { oNode } from '@olane/o-node';
// import { oNodeAddress } from '@olane/o-node';
// import { oAddress, RestrictedAddresses, NodeState } from '@olane/o-core';
// import { oRegistrationParams } from '@olane/o-protocol';

// describe('Address Resolution Integration Tests', () => {
//   describe('Leader + Registry + Resolver Integration', () => {
//     let leader: oLeaderNode;

//     beforeEach(async () => {
//       leader = new oLeaderNode({
//         name: 'test-leader',
//         parent: null,
//         leader: null,
//         network: {
//           listeners: [],
//         },
//       });

//       await leader.start();
//     });

//     afterEach(async () => {
//       if (leader && leader.state === NodeState.RUNNING) {
//         await leader.stop();
//       }
//     });

//     it('should start leader with registry as child', async () => {
//       expect(leader.state).to.equal(NodeState.RUNNING);
//       expect(leader.address.value).to.equal(RestrictedAddresses.LEADER);

//       // Verify registry is a child
//       const registryChild = leader.hierarchyManager.getChild(
//         new oAddress(RestrictedAddresses.REGISTRY),
//       );
//       expect(registryChild).to.not.be.null;
//       expect(registryChild?.value).to.equal(RestrictedAddresses.REGISTRY);
//     });

//     it('should be able to register a node in the registry', async () => {
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-embeddings',
//         address: 'o://leader/services/embeddings',
//         staticAddress: 'o://embeddings-text',
//         protocols: ['/embeddings/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/6001'],
//       };

//       const result = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'commit',
//           params: registrationParams,
//         },
//       );

//       expect(result.result.success).to.be.true;
//     });

//     it('should be able to search for registered nodes', async () => {
//       // Register a node
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-search-test',
//         address: 'o://leader/services/search-test',
//         staticAddress: 'o://search-test',
//         protocols: ['/test/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/7001'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       // Search for the node
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://search-test' },
//         },
//       );

//       expect(searchResult.result.data).to.be.an('array');
//       expect(searchResult.result.data).to.have.lengthOf(1);
//       expect((searchResult.result.data as any[])[0].peerId).to.equal(
//         'peer-search-test',
//       );
//     });

//     it('should resolve address using search resolver', async () => {
//       // Register a service
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-embeddings',
//         address: 'o://leader/services/embeddings',
//         staticAddress: 'o://embeddings-text',
//         protocols: ['/embeddings/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/6001'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       // Try to use the service by static address
//       // The resolver should find it in the registry
//       try {
//         const result = await leader.use(new oAddress('o://embeddings-text'), {
//           method: 'ping', // Some method that may not exist, but routing should work
//           params: {},
//         });
//         // If we get here without error, routing worked
//         // The actual method call may fail, but that's expected
//       } catch (error: any) {
//         // Expected - the service doesn't actually exist, but we should have resolved the address
//         // Check that the error is about the method, not about routing
//         expect(error.message).to.not.include('No route');
//       }
//     });

//     it('should handle multiple services with same protocol', async () => {
//       // Register two embedding services
//       const service1: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-embeddings-1',
//         address: 'o://leader/services/embeddings-text',
//         staticAddress: 'o://embeddings-text',
//         protocols: ['/embeddings/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/6001'],
//         registeredAt: 1000,
//       };

//       const service2: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-embeddings-2',
//         address: 'o://leader/services/embeddings-image',
//         staticAddress: 'o://embeddings-image',
//         protocols: ['/embeddings/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/6002'],
//         registeredAt: 2000, // More recent
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: service1,
//       });

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: service2,
//       });

//       // Search by protocol - should return both, sorted by registeredAt
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/embeddings/1.0.0'] },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(2);
//       expect((searchResult.result.data as any[])[0].peerId).to.equal(
//         'peer-embeddings-2',
//       ); // Most recent
//       expect((searchResult.result.data as any[])[1].peerId).to.equal(
//         'peer-embeddings-1',
//       );
//     });

//     it('should handle service removal', async () => {
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-temporary',
//         address: 'o://leader/services/temporary',
//         staticAddress: 'o://temporary',
//         protocols: ['/temp/1.0.0'],
//         transports: ['/memory'],
//       };

//       // Register
//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       // Verify it exists
//       let searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://temporary' },
//         },
//       );
//       expect(searchResult.result.data).to.have.lengthOf(1);

//       // Remove
//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'remove',
//         params: { peerId: 'peer-temporary' },
//       });

//       // Verify it's gone
//       searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://temporary' },
//         },
//       );
//       expect(searchResult.result.data).to.have.lengthOf(0);
//     });

//     it('should list all registered nodes', async () => {
//       // Register multiple nodes
//       const nodes: oRegistrationParams[] = [
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-1',
//           address: 'o://node-1',
//           protocols: [],
//           transports: ['/memory'],
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-2',
//           address: 'o://node-2',
//           protocols: [],
//           transports: ['/memory'],
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-3',
//           address: 'o://node-3',
//           protocols: [],
//           transports: ['/memory'],
//         },
//       ];

//       for (const node of nodes) {
//         await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//           method: 'commit',
//           params: node,
//         });
//       }

//       // Get all nodes
//       const result = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'find_all',
//           params: {},
//         },
//       );

//       expect(result.result.data as any[]).to.be.an('array');
//       expect((result.result.data as any[]).length).to.be.at.least(3); // At least our 3 nodes

//       const peerIds = (result.result.data as any[]).map((n: any) => n.peerId);
//       expect(peerIds).to.include('peer-1');
//       expect(peerIds).to.include('peer-2');
//       expect(peerIds).to.include('peer-3');
//     });
//   });

//   describe('Multi-node scenarios', () => {
//     let leader: oLeaderNode;
//     let childNode: oNode;

//     beforeEach(async () => {
//       leader = new oLeaderNode({
//         name: 'test-leader',
//         parent: null,
//         leader: null,
//         network: {
//           listeners: [],
//         },
//       });

//       await leader.start();
//     });

//     afterEach(async () => {
//       if (childNode && childNode.state === NodeState.RUNNING) {
//         await childNode.stop();
//       }
//       if (leader && leader.state === NodeState.RUNNING) {
//         await leader.stop();
//       }
//     });

//     it('should handle hierarchical node registration', async () => {
//       // Create child node
//       childNode = new oNode({
//         address: new oNodeAddress('o://leader/services'),
//         parent: leader.address as any,
//         leader: leader.address as any,
//         network: {
//           listeners: [],
//         },
//       });

//       await childNode.start();

//       // Register the child in the registry
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-services',
//         address: 'o://leader/services',
//         protocols: ['/services/1.0.0'],
//         transports: ['/memory'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       // Search for it
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { address: 'o://leader/services' },
//         },
//       );

//       expect(searchResult.result.data as any[]).to.have.lengthOf(1);
//       expect((searchResult.result.data as any[])[0].address).to.equal(
//         'o://leader/services',
//       );
//     });

//     it('should support service discovery by protocol', async () => {
//       // Register services with different protocols
//       const services: oRegistrationParams[] = [
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-embeddings',
//           address: 'o://leader/ai/embeddings',
//           protocols: ['/ai/embeddings/1.0.0', '/text/1.0.0'],
//           transports: ['/memory'],
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-chat',
//           address: 'o://leader/ai/chat',
//           protocols: ['/ai/chat/1.0.0', '/text/1.0.0'],
//           transports: ['/memory'],
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-vision',
//           address: 'o://leader/ai/vision',
//           protocols: ['/ai/vision/1.0.0', '/image/1.0.0'],
//           transports: ['/memory'],
//         },
//       ];

//       for (const service of services) {
//         await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//           method: 'commit',
//           params: service,
//         });
//       }

//       // Find all text-based services
//       const textServices = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/text/1.0.0'] },
//         },
//       );

//       expect(textServices.result.data as any[]).to.have.lengthOf(2);
//       const peerIds = (textServices.result.data as any[]).map(
//         (s: any) => s.peerId,
//       );
//       expect(peerIds).to.include.members(['peer-embeddings', 'peer-chat']);

//       // Find embeddings service specifically
//       const embeddingsService = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/ai/embeddings/1.0.0'] },
//         },
//       );

//       expect(embeddingsService.result.data).to.have.lengthOf(1);
//       expect((embeddingsService.result.data as any[])[0].peerId).to.equal(
//         'peer-embeddings',
//       );
//     });

//     it('should handle service updates on re-registration', async () => {
//       const initialRegistration: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-dynamic',
//         address: 'o://leader/services/dynamic',
//         protocols: ['/service/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/4001'],
//         registeredAt: 1000,
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: initialRegistration,
//       });

//       // Simulate service update (new transport)
//       const updatedRegistration: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-dynamic',
//         address: 'o://leader/services/dynamic',
//         protocols: ['/service/1.0.0', '/service/2.0.0'], // Added new protocol
//         transports: ['/ip4/192.168.1.1/tcp/4001'], // New transport
//         registeredAt: 2000,
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: updatedRegistration,
//       });

//       // Verify update
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { address: 'o://leader/services/dynamic' },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(1);
//       expect((searchResult.result.data as any[])[0].protocols).to.include(
//         '/service/2.0.0',
//       );
//       expect((searchResult.result.data as any[])[0].transports[0]).to.equal(
//         '/ip4/192.168.1.1/tcp/4001',
//       );
//       expect((searchResult.result.data as any[])[0].registeredAt).to.equal(
//         2000,
//       );
//     });
//   });

//   describe('Real-world routing scenarios', () => {
//     let leader: oLeaderNode;

//     beforeEach(async () => {
//       leader = new oLeaderNode({
//         name: 'test-leader',
//         parent: null,
//         leader: null,
//         network: {
//           listeners: [],
//         },
//       });

//       await leader.start();
//     });

//     afterEach(async () => {
//       if (leader && leader.state === NodeState.RUNNING) {
//         await leader.stop();
//       }
//     });

//     it('should route to static address via registry lookup', async () => {
//       // Register service with static address
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-static-service',
//         address: 'o://leader/services/my-service',
//         staticAddress: 'o://my-service',
//         protocols: ['/service/1.0.0'],
//         transports: ['/memory'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       // Verify static address search works
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://my-service' },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(1);
//       expect((searchResult.result.data as any[])[0].address).to.equal(
//         'o://leader/services/my-service',
//       );
//       expect((searchResult.result.data as any[])[0].staticAddress).to.equal(
//         'o://my-service',
//       );
//     });

//     it('should handle hierarchical routing through services', async () => {
//       // Register nested services
//       const services: oRegistrationParams[] = [
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-services-parent',
//           address: 'o://leader/services',
//           protocols: ['/services/1.0.0'],
//           transports: ['/memory'],
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-embeddings-child',
//           address: 'o://leader/services/embeddings',
//           protocols: ['/embeddings/1.0.0'],
//           transports: ['/memory'],
//         },
//         {
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: 'peer-embeddings-text-leaf',
//           address: 'o://leader/services/embeddings/text',
//           staticAddress: 'o://embeddings-text',
//           protocols: ['/embeddings/text/1.0.0'],
//           transports: ['/memory'],
//         },
//       ];

//       for (const service of services) {
//         await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//           method: 'commit',
//           params: service,
//         });
//       }

//       // Verify all are registered
//       const allServices = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'find_all',
//           params: {},
//         },
//       );

//       const peerIds = (allServices.result.data as any[]).map(
//         (s: any) => s.peerId,
//       );
//       expect(peerIds).to.include.members([
//         'peer-services-parent',
//         'peer-embeddings-child',
//         'peer-embeddings-text-leaf',
//       ]);

//       // Test routing through hierarchy using oAddress.next()
//       const currentAddress = new oAddress('o://leader');
//       const targetAddress = new oAddress('o://leader/services/embeddings/text');

//       // First hop: leader -> leader/services
//       const firstHop = oAddress.next(currentAddress, targetAddress);
//       expect(firstHop.toString()).to.equal('o://leader/services');

//       // Second hop: leader/services -> leader/services/embeddings
//       const secondHop = oAddress.next(firstHop, targetAddress);
//       expect(secondHop.toString()).to.equal('o://leader/services/embeddings');

//       // Third hop: leader/services/embeddings -> leader/services/embeddings/text
//       const thirdHop = oAddress.next(secondHop, targetAddress);
//       expect(thirdHop.toString()).to.equal(
//         'o://leader/services/embeddings/text',
//       );

//       // Fourth hop: at destination
//       const fourthHop = oAddress.next(thirdHop, targetAddress);
//       expect(fourthHop.toString()).to.equal(
//         'o://leader/services/embeddings/text',
//       );
//     });

//     it('should support searching with combined parameters', async () => {
//       // Register service with multiple attributes
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-complex',
//         address: 'o://leader/ai/embeddings',
//         staticAddress: 'o://embeddings-text',
//         protocols: ['/embeddings/1.0.0', '/text/1.0.0', '/ai/1.0.0'],
//         transports: ['/ip4/127.0.0.1/tcp/6001'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       // Search by static address
//       const byStatic = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://embeddings-text' },
//         },
//       );
//       expect(byStatic.result.data).to.have.lengthOf(1);

//       // Search by exact address
//       const byAddress = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { address: 'o://leader/ai/embeddings' },
//         },
//       );
//       expect(byAddress.result.data).to.have.lengthOf(1);

//       // Search by multiple protocols (AND logic)
//       const byProtocols = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/embeddings/1.0.0', '/text/1.0.0'] },
//         },
//       );
//       expect(byProtocols.result.data).to.have.lengthOf(1);

//       // Search by single protocol
//       const bySingleProtocol = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/ai/1.0.0'] },
//         },
//       );
//       expect(bySingleProtocol.result.data).to.have.lengthOf(1);
//     });

//     it('should handle registry preventing infinite loops', async () => {
//       // Try to register registry itself (should work, but search should filter it)
//       const registryRegistration: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-registry',
//         address: RestrictedAddresses.REGISTRY,
//         staticAddress: RestrictedAddresses.REGISTRY,
//         protocols: ['/registry/1.0.0'],
//         transports: ['/memory'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registryRegistration,
//       });

//       // Verify it's in the registry
//       const allNodes = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'find_all',
//           params: {},
//         },
//       );

//       const registryNode = (allNodes.result.data as any[]).find(
//         (n: any) => n.peerId === 'peer-registry',
//       );
//       expect(registryNode).to.exist;

//       // But search resolver should filter it out to prevent loops
//       // This is tested in the resolver unit tests
//     });

//     it('should handle empty registry gracefully', async () => {
//       // Search empty registry
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://nonexistent' },
//         },
//       );

//       expect(searchResult.result.data).to.be.an('array');
//       expect(searchResult.result.data).to.have.lengthOf(0);
//     });

//     it('should handle multiple transports per service', async () => {
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-multi-transport',
//         address: 'o://leader/services/multi',
//         staticAddress: 'o://multi-transport',
//         protocols: ['/multi/1.0.0'],
//         transports: [
//           '/ip4/127.0.0.1/tcp/4001',
//           '/ip4/192.168.1.1/tcp/4001',
//           '/ip6/::1/tcp/4001',
//         ],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://multi-transport' },
//         },
//       );

//       expect(
//         (searchResult.result.data as any[])[0].transports,
//       ).to.have.lengthOf(3);
//       expect((searchResult.result.data as any[])[0].transports).to.include(
//         '/ip4/127.0.0.1/tcp/4001',
//       );
//       expect((searchResult.result.data as any[])[0].transports).to.include(
//         '/ip4/192.168.1.1/tcp/4001',
//       );
//       expect((searchResult.result.data as any[])[0].transports).to.include(
//         '/ip6/::1/tcp/4001',
//       );
//     });
//   });

//   describe('Edge cases and error handling', () => {
//     let leader: oLeaderNode;

//     beforeEach(async () => {
//       leader = new oLeaderNode({
//         name: 'test-leader',
//         parent: null,
//         leader: null,
//         network: {
//           listeners: [],
//         },
//       });

//       await leader.start();
//     });

//     afterEach(async () => {
//       if (leader && leader.state === NodeState.RUNNING) {
//         await leader.stop();
//       }
//     });

//     it('should handle service with long address path', async () => {
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-deep',
//         address: 'o://leader/a/b/c/d/e/f/g/h/i/j/service',
//         protocols: ['/deep/1.0.0'],
//         transports: ['/memory'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { address: 'o://leader/a/b/c/d/e/f/g/h/i/j/service' },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(1);
//     });

//     it('should handle service with special characters', async () => {
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-special-chars',
//         address: 'o://leader/my-service_v2.0',
//         staticAddress: 'o://my-service_v2.0',
//         protocols: ['/service/2.0.0'],
//         transports: ['/memory'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { staticAddress: 'o://my-service_v2.0' },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(1);
//       expect((searchResult.result.data as any[])[0].address).to.equal(
//         'o://leader/my-service_v2.0',
//       );
//     });

//     it('should handle service with empty protocols array', async () => {
//       const registrationParams: oRegistrationParams = {
//         _connectionId: 'test-connection',
//         _requestMethod: 'test-method',
//         peerId: 'peer-no-protocols',
//         address: 'o://leader/services/no-protocols',
//         protocols: [],
//         transports: ['/memory'],
//       };

//       await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//         method: 'commit',
//         params: registrationParams,
//       });

//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { address: 'o://leader/services/no-protocols' },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(1);
//       expect((searchResult.result.data as any[])[0].protocols).to.be.an('array')
//         .that.is.empty;
//     });

//     it('should handle concurrent registrations', async () => {
//       const registrations: oRegistrationParams[] = [];
//       for (let i = 0; i < 10; i++) {
//         registrations.push({
//           _connectionId: 'test-connection',
//           _requestMethod: 'test-method',
//           peerId: `peer-concurrent-${i}`,
//           address: `o://leader/services/concurrent-${i}`,
//           protocols: ['/concurrent/1.0.0'],
//           transports: ['/memory'],
//           registeredAt: Date.now() + i,
//         });
//       }

//       // Register concurrently
//       const promises = registrations.map((params) =>
//         leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//           method: 'commit',
//           params,
//         }),
//       );

//       await Promise.all(promises);

//       // Verify all were registered
//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/concurrent/1.0.0'] },
//         },
//       );

//       expect(searchResult.result.data).to.have.lengthOf(10);
//     });

//     it('should maintain sort order after multiple operations', async () => {
//       const nodes = [
//         { peerId: 'peer-1', registeredAt: 1000 },
//         { peerId: 'peer-2', registeredAt: 2000 },
//         { peerId: 'peer-3', registeredAt: 3000 },
//       ];

//       for (const node of nodes) {
//         await leader.use(new oAddress(RestrictedAddresses.REGISTRY), {
//           method: 'commit',
//           params: {
//             ...node,
//             address: `o://${node.peerId}`,
//             protocols: ['/test/1.0.0'],
//             transports: ['/memory'],
//           } as oRegistrationParams,
//         });
//       }

//       const searchResult = await leader.use(
//         new oAddress(RestrictedAddresses.REGISTRY),
//         {
//           method: 'search',
//           params: { protocols: ['/test/1.0.0'] },
//         },
//       );

//       // Should be sorted by registeredAt descending (most recent first)
//       expect((searchResult.result.data as any[])[0].peerId).to.equal('peer-3');
//       expect((searchResult.result.data as any[])[1].peerId).to.equal('peer-2');
//       expect((searchResult.result.data as any[])[2].peerId).to.equal('peer-1');
//     });
//   });
// });
