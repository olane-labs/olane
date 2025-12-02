import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-test';
import { oSearchResolver } from '../src/router/resolvers/o-node.search-resolver.js';
import {
  oAddress,
  oCore,
  oRequest,
  oResponse,
  RestrictedAddresses,
  NodeState,
  TransportType,
  oRouterRequest,
} from '@olane/o-core';
import { oNodeTransport } from '../src/router/o-node.transport.js';
import { oNodeAddress } from '../src/router/o-node.address.js';
import { oProtocolMethods } from '@olane/o-protocol';

describe('oSearchResolver', () => {
  const env = new TestEnvironment();
  let resolver: oSearchResolver;
  let mockNode: Partial<oCore>;
  const testAddress = new oNodeAddress('o://test-node');

  afterEach(async () => {
    await env.cleanup();
  });

  // Helper to create a proper oRouterRequest
  const createRouterRequest = (): oRouterRequest =>
    ({
      method: oProtocolMethods.ROUTE,
      params: {
        _connectionId: 'test-connection',
        _requestMethod: 'test',
        address: 'o://test',
        payload: {},
      },
      jsonrpc: '2.0',
      id: '1',
      state: {} as any,
      connectionId: 'test-connection',
      toJSON: () => ({}),
      setState: () => {},
      logger: {} as any,
    }) as unknown as oRouterRequest;

  // Helper to create a proper oResponse
  const createResponse = (result: any): oResponse =>
    ({
      jsonrpc: '2.0',
      id: '1',
      result,
    }) as oResponse;

  beforeEach(() => {
    resolver = new oSearchResolver(testAddress);

    // Create mock node with necessary properties
    mockNode = {
      address: testAddress,
      state: NodeState.RUNNING,
      leader: new oNodeAddress(RestrictedAddresses.LEADER, [
        new oNodeTransport('/ip4/127.0.0.1/tcp/4001'),
      ]),
      hierarchyManager: {
        getChild: (address: oAddress) => null,
      } as any,
      use: async (address: oAddress, request: any): Promise<oResponse> => {
        // Mock registry search response
        return createResponse({
          data: [],
        });
      },
    };
  });

  describe('Basic resolver configuration', () => {
    it('should have custom transport for /search', () => {
      const transports = resolver.customTransports;
      expect(transports).to.have.lengthOf(1);
      expect(transports[0].value).to.equal('/search');
    });


    it('should use "search" as default method', () => {
      const method = (resolver as any).getSearchMethod();
      expect(method).to.equal('search');
    });
  });

  describe('resolve() - Basic flow', () => {
    it('should skip search if address already has transports', async () => {
      const addressWithTransports = new oNodeAddress('o://test', [
        new oNodeTransport('/ip4/127.0.0.1/tcp/5001'),
      ]);

      const result = await resolver.resolve({
        address: addressWithTransports,
        targetAddress: addressWithTransports,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.nextHopAddress.value).to.equal('o://test');
      expect(result.nextHopAddress.transports).to.have.lengthOf(1);
    });

    it('should return original address when no search results found', async () => {
      const address = new oNodeAddress('o://unknown-service');

      mockNode.use = async () => createResponse({ data: [] });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.nextHopAddress.value).to.equal('o://unknown-service');
    });

    it('should resolve address using registry search results', async () => {
      const address = new oNodeAddress('o://embeddings-text');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings',
              staticAddress: 'o://embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.value).to.equal(
        'o://leader/services/embeddings',
      );
      expect(result.targetAddress.transports).to.have.lengthOf(1);
    });

    it('should preserve extra path parameters in resolved address', async () => {
      const address = new oNodeAddress('o://embeddings-text/method/params');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings',
              staticAddress: 'o://embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.value).to.equal(
        'o://leader/services/embeddings/method/params',
      );
    });

    it('should handle hierarchical address resolution', async () => {
      const address = new oNodeAddress('o://leader/services/embeddings-text');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.transports).to.have.lengthOf(1);
    });
  });

  describe('buildSearchParams()', () => {
    it('should include both staticAddress and address', () => {
      const address = new oNodeAddress('o://leader/services/embeddings-text');
      const params = (resolver as any).buildSearchParams(address);

      expect(params.staticAddress).to.equal('o://leader');
      expect(params.address).to.equal('o://leader/services/embeddings-text');
    });

    it('should use root address for staticAddress', () => {
      const address = new oNodeAddress('o://leader/deep/nested/path');
      const params = (resolver as any).buildSearchParams(address);

      expect(params.staticAddress).to.equal('o://leader');
      expect(params.address).to.equal('o://leader/deep/nested/path');
    });

    it('should handle static addresses', () => {
      const address = new oNodeAddress('o://embeddings-text');
      const params = (resolver as any).buildSearchParams(address);

      expect(params.staticAddress).to.equal('o://embeddings-text');
      expect(params.address).to.equal('o://embeddings-text');
    });
  });

  describe('filterSearchResults()', () => {
    it('should filter out registry address to prevent loops', () => {
      const results = [
        {
          staticAddress: RestrictedAddresses.REGISTRY,
          address: 'o://registry',
        },
        { staticAddress: 'o://service', address: 'o://service' },
      ];

      const filtered = (resolver as any).filterSearchResults(results, mockNode);

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].staticAddress).to.equal('o://service');
    });


    it('should allow all valid results', () => {
      const results = [
        { address: 'o://service-1', staticAddress: 'o://s1' },
        { address: 'o://service-2', staticAddress: 'o://s2' },
        { address: 'o://service-3', staticAddress: 'o://s3' },
      ];

      const filtered = (resolver as any).filterSearchResults(results, mockNode);

      expect(filtered).to.have.lengthOf(3);
    });

    it('should handle empty results array', () => {
      const filtered = (resolver as any).filterSearchResults([], mockNode);
      expect(filtered).to.be.an('array').that.is.empty;
    });
  });

  describe('selectResult()', () => {
    it('should select first result from multiple options', () => {
      const results = [
        { address: 'o://service-1', peerId: 'peer-1' },
        { address: 'o://service-2', peerId: 'peer-2' },
        { address: 'o://service-3', peerId: 'peer-3' },
      ];

      const selected = (resolver as any).selectResult(results);

      expect(selected).to.equal(results[0]);
      expect(selected.peerId).to.equal('peer-1');
    });

    it('should return null for empty results', () => {
      const selected = (resolver as any).selectResult([]);
      expect(selected).to.be.null;
    });

    it('should return single result', () => {
      const results = [{ address: 'o://only-service', peerId: 'only-peer' }];
      const selected = (resolver as any).selectResult(results);

      expect(selected).to.equal(results[0]);
    });
  });

  describe('mapTransports()', () => {
    it('should map transport objects to oNodeTransport instances', () => {
      const result = {
        transports: [
          { value: '/ip4/127.0.0.1/tcp/4001', type: TransportType.LIBP2P },
          { value: '/ip4/192.168.1.1/tcp/4002', type: TransportType.LIBP2P },
        ],
      };

      const transports = (resolver as any).mapTransports(result);

      expect(transports).to.have.lengthOf(2);
      expect(transports[0]).to.be.instanceOf(oNodeTransport);
      expect(transports[0].value).to.equal('/ip4/127.0.0.1/tcp/4001');
      expect(transports[1].value).to.equal('/ip4/192.168.1.1/tcp/4002');
    });

    it('should handle empty transports array', () => {
      const result = { transports: [] };
      const transports = (resolver as any).mapTransports(result);

      expect(transports).to.be.an('array').that.is.empty;
    });

    it('should handle single transport', () => {
      const result = {
        transports: [{ value: '/memory', type: TransportType.CUSTOM }],
      };

      const transports = (resolver as any).mapTransports(result);

      expect(transports).to.have.lengthOf(1);
      expect(transports[0].value).to.equal('/memory');
    });
  });

  describe('resolveNextHopTransports()', () => {
    it('should use leader transports when next hop is leader', () => {
      const nextHop = new oNodeAddress(RestrictedAddresses.LEADER);
      const targetTransports = [
        new oNodeTransport('/ip4/192.168.1.1/tcp/9999'),
      ];

      const resolved = (resolver as any).resolveNextHopTransports(
        nextHop,
        targetTransports,
        mockNode,
      );

      expect(resolved).to.have.lengthOf(1);
      expect(resolved[0].value).to.equal('/ip4/127.0.0.1/tcp/4001'); // Leader transport from mock
    });

    it('should use child transports when next hop is known child', () => {
      const childAddress = new oNodeAddress('o://known-child', [
        new oNodeTransport('/ip4/10.0.0.1/tcp/7001'),
      ]);

      mockNode.hierarchyManager = {
        getChild: (address: oAddress) => {
          if (address.value === 'o://known-child') {
            return childAddress;
          }
          return null;
        },
      } as any;

      const nextHop = new oNodeAddress('o://known-child');
      const targetTransports = [
        new oNodeTransport('/ip4/192.168.1.1/tcp/9999'),
      ];

      const resolved = (resolver as any).resolveNextHopTransports(
        nextHop,
        targetTransports,
        mockNode,
      );

      expect(resolved).to.have.lengthOf(1);
      expect(resolved[0].value).to.equal('/ip4/10.0.0.1/tcp/7001');
    });

    it('should use target transports for unknown next hop', () => {
      const nextHop = new oNodeAddress('o://unknown-node');
      const targetTransports = [
        new oNodeTransport('/ip4/192.168.1.1/tcp/8001'),
      ];

      const resolved = (resolver as any).resolveNextHopTransports(
        nextHop,
        targetTransports,
        mockNode,
      );

      expect(resolved).to.have.lengthOf(1);
      expect(resolved[0].value).to.equal('/ip4/192.168.1.1/tcp/8001');
    });

    it('should return empty array when leader has no transports', () => {
      // Create a new mock node with leader that has no transports
      const mockNodeNoLeaderTransports: Partial<oCore> = {
        ...mockNode,
        leader: new oNodeAddress(RestrictedAddresses.LEADER, []),
      };

      const nextHop = new oNodeAddress(RestrictedAddresses.LEADER);
      const targetTransports = [
        new oNodeTransport('/ip4/192.168.1.1/tcp/9999'),
      ];

      const resolved = (resolver as any).resolveNextHopTransports(
        nextHop,
        targetTransports,
        mockNodeNoLeaderTransports,
      );

      expect(resolved).to.be.an('array').that.is.empty;
    });
  });

  describe('determineNextHop()', () => {
    it('should use oAddress.next() for hierarchy routing', async () => {
      const resolvedTarget = new oNodeAddress('o://leader/services/embeddings');
      const searchResult = {
        transports: [
          { value: '/ip4/127.0.0.1/tcp/6001', type: TransportType.LIBP2P },
        ],
      };

      mockNode.address = new oNodeAddress(RestrictedAddresses.LEADER);

      const nextHop = (resolver as any).determineNextHop(
        mockNode,
        resolvedTarget,
        searchResult,
      );

      // From leader to o://leader/services/embeddings, next hop should be o://leader/services
      expect(nextHop.value).to.equal('o://leader/services');
      expect(nextHop.transports).to.not.be.empty;
    });

    it('should set transports on next hop address', async () => {
      const resolvedTarget = new oNodeAddress('o://leader/services');
      const searchResult = {
        transports: [
          { value: '/ip4/127.0.0.1/tcp/6001', type: TransportType.LIBP2P },
        ],
      };

      mockNode.address = new oNodeAddress(RestrictedAddresses.LEADER);

      const nextHop = (resolver as any).determineNextHop(
        mockNode,
        resolvedTarget,
        searchResult,
      );

      expect(nextHop.transports).to.not.be.undefined;
      expect(nextHop.transports).to.not.be.empty;
    });

    it('should handle routing to immediate child', async () => {
      const resolvedTarget = new oNodeAddress('o://leader/services');
      const searchResult = {
        transports: [
          { value: '/ip4/127.0.0.1/tcp/6001', type: TransportType.LIBP2P },
        ],
      };

      mockNode.address = new oNodeAddress(RestrictedAddresses.LEADER);

      const nextHop = (resolver as any).determineNextHop(
        mockNode,
        resolvedTarget,
        searchResult,
      );

      expect(nextHop.value).to.equal('o://leader/services');
    });
  });

  describe('Custom resolver subclassing', () => {
    it('should allow overriding getRegistryAddress()', () => {
      class CustomRegistryResolver extends oSearchResolver {
        protected getRegistryAddress(): oAddress {
          return new oAddress('o://custom-registry');
        }
      }

      const customResolver = new CustomRegistryResolver(testAddress);
      const registryAddress = (customResolver as any).getRegistryAddress();

      expect(registryAddress.value).to.equal('o://custom-registry');
    });

    it('should allow overriding getSearchMethod()', () => {
      class CustomMethodResolver extends oSearchResolver {
        protected getSearchMethod(): string {
          return 'custom_search';
        }
      }

      const customResolver = new CustomMethodResolver(testAddress);
      const method = (customResolver as any).getSearchMethod();

      expect(method).to.equal('custom_search');
    });

    it('should allow custom result selection (e.g., round-robin)', () => {
      class RoundRobinResolver extends oSearchResolver {
        private currentIndex = 0;

        protected selectResult(results: any[]): any | null {
          if (results.length === 0) return null;
          const result = results[this.currentIndex % results.length];
          this.currentIndex++;
          return result;
        }
      }

      const customResolver = new RoundRobinResolver(testAddress);
      const results = [
        { address: 'o://service-1' },
        { address: 'o://service-2' },
        { address: 'o://service-3' },
      ];

      // First call
      let selected = (customResolver as any).selectResult(results);
      expect(selected.address).to.equal('o://service-1');

      // Second call
      selected = (customResolver as any).selectResult(results);
      expect(selected.address).to.equal('o://service-2');

      // Third call
      selected = (customResolver as any).selectResult(results);
      expect(selected.address).to.equal('o://service-3');

      // Fourth call - wraps around
      selected = (customResolver as any).selectResult(results);
      expect(selected.address).to.equal('o://service-1');
    });

    it('should allow custom filtering logic', () => {
      class StatusFilterResolver extends oSearchResolver {
        protected filterSearchResults(results: any[], node: oCore): any[] {
          // First apply parent filtering
          const filtered = super.filterSearchResults(results, node);
          // Then apply custom filtering
          return filtered.filter((result) => result.status === 'active');
        }
      }

      const customResolver = new StatusFilterResolver(testAddress);
      const results = [
        { address: 'o://service-1', status: 'active', staticAddress: 'o://s1' },
        {
          address: 'o://service-2',
          status: 'inactive',
          staticAddress: 'o://s2',
        },
        { address: 'o://service-3', status: 'active', staticAddress: 'o://s3' },
      ];

      const filtered = (customResolver as any).filterSearchResults(
        results,
        mockNode,
      );

      expect(filtered).to.have.lengthOf(2);
      expect(filtered.every((r: any) => r.status === 'active')).to.be.true;
    });

    it('should allow direct routing by overriding determineNextHop()', () => {
      class DirectRoutingResolver extends oSearchResolver {
        protected determineNextHop(
          node: oCore,
          resolvedTargetAddress: oAddress,
          searchResult: any,
        ): oAddress {
          // Always route directly to target, bypassing hierarchy
          const targetTransports = this.mapTransports(searchResult);
          resolvedTargetAddress.setTransports(targetTransports);
          return resolvedTargetAddress;
        }
      }

      const customResolver = new DirectRoutingResolver(testAddress);
      const resolvedTarget = new oNodeAddress('o://leader/services/embeddings');
      const searchResult = {
        transports: [
          { value: '/ip4/127.0.0.1/tcp/6001', type: TransportType.LIBP2P },
        ],
      };

      mockNode.address = new oNodeAddress(RestrictedAddresses.LEADER);

      const nextHop = (customResolver as any).determineNextHop(
        mockNode,
        resolvedTarget,
        searchResult,
      );

      // Direct routing: next hop is the target itself
      expect(nextHop.value).to.equal('o://leader/services/embeddings');
      expect(nextHop.transports).to.have.lengthOf(1);
    });
  });

  describe('Integration with registry calls', () => {

    it('should pass correct search parameters to registry', async () => {
      const address = new oNodeAddress('o://leader/services/embeddings');
      let capturedParams: any;

      mockNode.use = async (addr: oAddress, req: any) => {
        capturedParams = req.params;
        return createResponse({ data: [] });
      };

      await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(capturedParams.staticAddress).to.equal('o://leader');
      expect(capturedParams.address).to.equal('o://leader/services/embeddings');
    });

  });

  describe('Address duplication bug fix', () => {
    it('should NOT duplicate path segments when registry returns full hierarchical address', async () => {
      // This test verifies the fix for the bug where o://services/embeddings-text
      // was being resolved to o://leader/services/embeddings-text/services/embeddings-text
      const address = new oNodeAddress('o://services/embeddings-text');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings-text',
              staticAddress: 'o://embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      // Should be o://leader/services/embeddings-text, NOT o://leader/services/embeddings-text/embeddings-text
      expect(result.targetAddress.value).to.equal(
        'o://leader/services/embeddings-text',
      );
    });

    it('should NOT duplicate when calling via static address', async () => {
      const address = new oNodeAddress('o://embeddings-text');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings-text',
              staticAddress: 'o://embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.value).to.equal(
        'o://leader/services/embeddings-text',
      );
    });

    it('should still append legitimate extra params beyond the service name', async () => {
      // If someone calls o://embeddings-text/custom/path, we should preserve /custom/path
      const address = new oNodeAddress('o://embeddings-text/custom/path');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings-text',
              staticAddress: 'o://embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      // Should append the extra /custom/path
      expect(result.targetAddress.value).to.equal(
        'o://leader/services/embeddings-text/custom/path',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle address with long nested paths', async () => {
      const address = new oNodeAddress('o://leader/a/b/c/d/e/f');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/a/b/c/d/e/f',
              transports: [{ value: '/memory', type: TransportType.CUSTOM }],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.value).to.equal('o://leader/a/b/c/d/e/f');
    });

    it('should handle static addresses correctly', async () => {
      const address = new oNodeAddress('o://embeddings-text');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://leader/services/embeddings',
              staticAddress: 'o://embeddings-text',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/6001',
                  type: TransportType.LIBP2P,
                },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.value).to.equal(
        'o://leader/services/embeddings',
      );
    });

    it('should handle when leader is undefined', async () => {
      const address = new oNodeAddress('o://test');

      // Create a new mock node with undefined leader
      const mockNodeNoLeader: Partial<oCore> = {
        ...mockNode,
        leader: undefined,
      };

      mockNodeNoLeader.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://test',
              transports: [{ value: '/memory', type: TransportType.CUSTOM }],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNodeNoLeader as oCore,
        request: createRouterRequest(),
      });

      // Should still work, just won't have leader transports
      expect(result.targetAddress.value).to.equal('o://test');
    });

    it('should handle multiple transports in search result', async () => {
      const address = new oNodeAddress('o://multi-transport');

      mockNode.use = async () =>
        createResponse({
          data: [
            {
              address: 'o://multi-transport',
              transports: [
                {
                  value: '/ip4/127.0.0.1/tcp/4001',
                  type: TransportType.LIBP2P,
                },
                {
                  value: '/ip4/192.168.1.1/tcp/4002',
                  type: TransportType.LIBP2P,
                },
                { value: '/memory', type: TransportType.CUSTOM },
              ],
            },
          ],
        });

      const result = await resolver.resolve({
        address,
        targetAddress: address,
        node: mockNode as oCore,
        request: createRouterRequest(),
      });

      expect(result.targetAddress.transports).to.have.lengthOf(3);
    });
  });
});
