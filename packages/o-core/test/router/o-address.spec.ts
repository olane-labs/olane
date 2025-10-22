import { oAddress } from '../../src/index.js';
import { expect } from 'chai';

describe('oAddress helper properties', () => {
  describe('protocol getter', () => {
    it('should convert o:// to /o/', () => {
      const addr = new oAddress('o://leader');
      expect(addr.protocol).to.equal('/o/leader');
    });

    it('should handle nested paths', () => {
      const addr = new oAddress('o://leader/services/embeddings-text');
      expect(addr.protocol).to.equal('/o/leader/services/embeddings-text');
    });
  });

  describe('paths getter', () => {
    it('should strip o:// prefix', () => {
      const addr = new oAddress('o://leader');
      expect(addr.paths).to.equal('leader');
    });

    it('should handle nested paths', () => {
      const addr = new oAddress('o://leader/services/embeddings-text');
      expect(addr.paths).to.equal('leader/services/embeddings-text');
    });
  });

  describe('toRootAddress()', () => {
    it('should return first path segment', () => {
      const addr = new oAddress('o://leader/services/embeddings-text');
      expect(addr.toRootAddress().toString()).to.equal('o://leader');
    });

    it('should return same address if already root', () => {
      const addr = new oAddress('o://leader');
      expect(addr.toRootAddress().toString()).to.equal('o://leader');
    });

    it('should handle static addresses', () => {
      const addr = new oAddress('o://embeddings-text');
      expect(addr.toRootAddress().toString()).to.equal('o://embeddings-text');
    });
  });
});

describe('oAddress.next() routing logic', () => {
  describe('Basic next hop calculation', () => {
    it('should return same address when at destination', () => {
      const current = new oAddress('o://leader');
      const target = new oAddress('o://leader');
      const next = oAddress.next(current, target);
      expect(next.toString()).to.equal('o://leader');
    });

    it('should go one level down when target is direct child', () => {
      const current = new oAddress('o://leader');
      const target = new oAddress('o://leader/services');
      const next = oAddress.next(current, target);
      expect(next.toString()).to.equal('o://leader/services');
    });

    it('should go one level down when target is two levels deep (BUG CASE)', () => {
      const current = new oAddress('o://leader');
      const target = new oAddress('o://leader/services/embeddings-text');
      const next = oAddress.next(current, target);

      // Expected: should return the next immediate child in the hierarchy
      // which is o://leader/services
      console.log('Current:', current.toString());
      console.log('Target:', target.toString());
      console.log('Next hop returned:', next.toString());
      console.log('Expected:', 'o://leader/services');

      expect(next.toString()).to.equal('o://leader/services');
    });

    it('should reach final destination when already at intermediate node', () => {
      const current = new oAddress('o://leader/services');
      const target = new oAddress('o://leader/services/embeddings-text');
      const next = oAddress.next(current, target);

      console.log('Current:', current.toString());
      console.log('Target:', target.toString());
      console.log('Next hop returned:', next.toString());
      console.log('Expected:', 'o://leader/services/embeddings-text');

      expect(next.toString()).to.equal('o://leader/services/embeddings-text');
    });
  });

  describe('Multi-level routing', () => {
    it('should route through three-level hierarchy', () => {
      const current = new oAddress('o://leader');
      const target = new oAddress('o://leader/services/embeddings-text/method');
      const next = oAddress.next(current, target);

      console.log('Current:', current.toString());
      console.log('Target:', target.toString());
      console.log('Next hop returned:', next.toString());
      console.log('Expected:', 'o://leader/services');

      // Should go to first child in path
      expect(next.toString()).to.equal('o://leader/services');
    });

    it('should handle routing from second level to third level', () => {
      const current = new oAddress('o://leader/services');
      const target = new oAddress('o://leader/services/embeddings-text/method');
      const next = oAddress.next(current, target);

      console.log('Current:', current.toString());
      console.log('Target:', target.toString());
      console.log('Next hop returned:', next.toString());
      console.log('Expected:', 'o://leader/services/embeddings-text');

      expect(next.toString()).to.equal('o://leader/services/embeddings-text');
    });
  });

  describe('Edge cases', () => {
    it('should route to leader from non-leader node', () => {
      const current = new oAddress('o://worker');
      const target = new oAddress('o://leader/services');
      const next = oAddress.next(current, target);

      console.log('Current:', current.toString());
      console.log('Target:', target.toString());
      console.log('Next hop returned:', next.toString());
      console.log('Expected:', 'o://leader');

      // Should route back to leader for resolution
      expect(next.toString()).to.equal('o://leader');
    });

    it('should route static address to leader for resolution', () => {
      const current = new oAddress('o://leader');
      const target = new oAddress('o://embeddings-text');
      const next = oAddress.next(current, target);

      console.log('Current:', current.toString());
      console.log('Target:', target.toString());
      console.log('Next hop returned:', next.toString());

      // Static addresses should be resolved by leader
      expect(next.toString()).to.equal('o://leader');
    });
  });

  describe('Exact bug reproduction scenario', () => {
    it('should correctly route o://leader -> o://leader/services/embeddings-text', () => {
      // This is the exact scenario from the bug report
      const current = new oAddress('o://leader');
      const target = new oAddress('o://leader/services/embeddings-text');
      const next = oAddress.next(current, target);

      console.log('=== BUG REPRODUCTION TEST ===');
      console.log('Current address:', current.toString());
      console.log('Current paths:', current.paths);
      console.log('Current protocol:', current.protocol);
      console.log('');
      console.log('Target address:', target.toString());
      console.log('Target paths:', target.paths);
      console.log('Target protocol:', target.protocol);
      console.log('');

      // Calculate what the function does internally
      const remainingPath = target.protocol.replace(current.protocol + '/', '');
      console.log('remainingPath calculation:');
      console.log('  target.protocol:', target.protocol);
      console.log('  current.protocol + "/":', current.protocol + '/');
      console.log('  remainingPath:', remainingPath);
      console.log('');

      const parts = remainingPath.replace('/o/', '').split('/');
      console.log('parts calculation:');
      console.log('  remainingPath.replace("/o/", ""):', remainingPath.replace('/o/', ''));
      console.log('  split("/"):', parts);
      console.log('  reversed:', [...parts].reverse());
      console.log('  pop():', [...parts].reverse().pop());
      console.log('');

      const nextHop = remainingPath.replace('/o/', '').split('/').reverse().pop();
      console.log('nextHop:', nextHop);
      console.log('constructed address:', current.value + '/' + nextHop);
      console.log('');
      console.log('Actual next hop returned:', next.toString());
      console.log('Expected next hop:', 'o://leader/services');
      console.log('=== END BUG REPRODUCTION TEST ===');

      // The bug manifests here - it should return o://leader/services
      // but may return something else causing the duplication
      expect(next.toString()).to.equal('o://leader/services');
    });
  });
});

describe('oAddress additional methods', () => {
  describe('toStaticAddress()', () => {
    it('should return last path segment as static address', () => {
      const addr = new oAddress('o://leader/services/embeddings-text');
      const staticAddr = addr.toStaticAddress();

      expect(staticAddr.toString()).to.equal('o://embeddings-text');
    });

    it('should preserve transports when converting', () => {
      const addr = new oAddress('o://leader/services/test', []);
      // Mock adding transports
      const mockTransport = { toString: () => '/mock', type: 'LIBP2P' as any };
      addr.transports = [mockTransport as any];

      const staticAddr = addr.toStaticAddress();
      expect(staticAddr.transports).to.have.lengthOf(1);
    });

    it('should return same address if already at root level', () => {
      const addr = new oAddress('o://embeddings-text');
      const staticAddr = addr.toStaticAddress();

      expect(staticAddr.toString()).to.equal('o://embeddings-text');
    });

    it('should handle deeply nested paths', () => {
      const addr = new oAddress('o://a/b/c/d/e/final');
      const staticAddr = addr.toStaticAddress();

      expect(staticAddr.toString()).to.equal('o://final');
    });
  });

  describe('Transport operations', () => {
    it('setTransports() should replace existing transports', () => {
      const addr = new oAddress('o://test');
      const transport1 = { toString: () => '/transport1', type: 'LIBP2P' as any };
      const transport2 = { toString: () => '/transport2', type: 'LIBP2P' as any };

      addr.setTransports([transport1 as any]);
      expect(addr.transports).to.have.lengthOf(1);

      addr.setTransports([transport2 as any]);
      expect(addr.transports).to.have.lengthOf(1);
      expect(addr.transports[0]).to.equal(transport2);
    });

    it('setTransports() should allow empty array', () => {
      const addr = new oAddress('o://test');
      addr.setTransports([]);

      expect(addr.transports).to.be.an('array');
      expect(addr.transports).to.have.lengthOf(0);
    });

    it('transportsEqual() should return true for matching transports', () => {
      const transport1 = { toString: () => '/transport1', type: 'LIBP2P' as any };
      const transport2 = { toString: () => '/transport2', type: 'LIBP2P' as any };

      const addr1 = new oAddress('o://test', [transport1 as any, transport2 as any]);
      const addr2 = new oAddress('o://test', [transport1 as any, transport2 as any]);

      expect(addr1.transportsEqual(addr2)).to.be.true;
    });

    it('transportsEqual() should return true for transports in different order', () => {
      const transport1 = { toString: () => '/transport1', type: 'LIBP2P' as any };
      const transport2 = { toString: () => '/transport2', type: 'LIBP2P' as any };

      const addr1 = new oAddress('o://test', [transport1 as any, transport2 as any]);
      const addr2 = new oAddress('o://test', [transport2 as any, transport1 as any]);

      expect(addr1.transportsEqual(addr2)).to.be.true;
    });

    it('transportsEqual() should return false for different transports', () => {
      const transport1 = { toString: () => '/transport1', type: 'LIBP2P' as any };
      const transport2 = { toString: () => '/transport2', type: 'LIBP2P' as any };

      const addr1 = new oAddress('o://test', [transport1 as any]);
      const addr2 = new oAddress('o://test', [transport2 as any]);

      expect(addr1.transportsEqual(addr2)).to.be.false;
    });

    it('supportsTransport() should return true for matching type', () => {
      const transport = { toString: () => '/transport', type: 'LIBP2P' as any };
      const addr = new oAddress('o://test', [transport as any]);

      const queryTransport = { type: 'LIBP2P' as any };
      expect(addr.supportsTransport(queryTransport as any)).to.be.true;
    });

    it('supportsTransport() should return false for non-matching type', () => {
      const transport = { toString: () => '/transport', type: 'LIBP2P' as any };
      const addr = new oAddress('o://test', [transport as any]);

      const queryTransport = { type: 'CUSTOM' as any };
      expect(addr.supportsTransport(queryTransport as any)).to.be.false;
    });

    it('supportsTransport() should handle empty transports', () => {
      const addr = new oAddress('o://test', []);
      const queryTransport = { type: 'LIBP2P' as any };

      expect(addr.supportsTransport(queryTransport as any)).to.be.false;
    });

    it('libp2pTransports getter should filter LIBP2P transports', () => {
      const libp2pTransport = { toString: () => '/libp2p', type: 'LIBP2P' as any };
      const customTransport = { toString: () => '/custom', type: 'CUSTOM' as any };

      const addr = new oAddress('o://test', [libp2pTransport as any, customTransport as any]);

      expect(addr.libp2pTransports).to.have.lengthOf(1);
      expect(addr.libp2pTransports[0]).to.equal(libp2pTransport);
    });

    it('customTransports getter should filter CUSTOM transports', () => {
      const libp2pTransport = { toString: () => '/libp2p', type: 'LIBP2P' as any };
      const customTransport = { toString: () => '/custom', type: 'CUSTOM' as any };

      const addr = new oAddress('o://test', [libp2pTransport as any, customTransport as any]);

      expect(addr.customTransports).to.have.lengthOf(1);
      expect(addr.customTransports[0]).to.equal(customTransport);
    });
  });

  describe('Validation', () => {
    it('validate() should return true for valid o:// address', () => {
      const addr = new oAddress('o://valid-address');
      expect(addr.validate()).to.be.true;
    });

    it('validate() should return false for address without o:// prefix', () => {
      const addr = new oAddress('invalid-address');
      expect(addr.validate()).to.be.false;
    });

    it('validate() should return false for http:// address', () => {
      const addr = new oAddress('http://example.com');
      expect(addr.validate()).to.be.false;
    });

    it('validate() should return false for empty address', () => {
      const addr = new oAddress('');
      expect(addr.validate()).to.be.false;
    });

    it('validate() should return true for address with special characters', () => {
      const addr = new oAddress('o://service-name_v2.0');
      expect(addr.validate()).to.be.true;
    });
  });

  describe('Static helper methods', () => {
    it('oAddress.leader() should return leader address', () => {
      const leader = oAddress.leader();
      expect(leader.toString()).to.equal('o://leader');
    });

    it('oAddress.lane() should return lane address', () => {
      const lane = oAddress.lane();
      expect(lane.toString()).to.equal('o://lane');
    });

    it('oAddress.registry() should return registry address', () => {
      const registry = oAddress.registry();
      expect(registry.toString()).to.equal('o://registry');
    });

    it('oAddress.isStatic() should return true for non-leader addresses', () => {
      const addr = new oAddress('o://embeddings-text');
      expect(oAddress.isStatic(addr)).to.be.true;
    });

    it('oAddress.isStatic() should return false for leader hierarchical addresses', () => {
      const addr = new oAddress('o://leader/services/embeddings');
      expect(oAddress.isStatic(addr)).to.be.false;
    });

    it('oAddress.isStatic() should return false for leader root address', () => {
      const addr = new oAddress('o://leader');
      expect(oAddress.isStatic(addr)).to.be.false;
    });

    it('oAddress.equals() should compare addresses by value', () => {
      const addr1 = new oAddress('o://test');
      const addr2 = new oAddress('o://test');

      expect(oAddress.equals(addr1, addr2)).to.be.true;
    });

    it('oAddress.equals() should return false for different addresses', () => {
      const addr1 = new oAddress('o://test1');
      const addr2 = new oAddress('o://test2');

      expect(oAddress.equals(addr1, addr2)).to.be.false;
    });
  });

  describe('equals() method', () => {
    it('should return true for same address and transports', () => {
      const transport = { toString: () => '/transport', type: 'LIBP2P' as any };
      const addr1 = new oAddress('o://test', [transport as any]);
      const addr2 = new oAddress('o://test', [transport as any]);

      expect(addr1.equals(addr2)).to.be.true;
    });

    it('should return false for same address but different transports', () => {
      const transport1 = { toString: () => '/transport1', type: 'LIBP2P' as any };
      const transport2 = { toString: () => '/transport2', type: 'LIBP2P' as any };

      const addr1 = new oAddress('o://test', [transport1 as any]);
      const addr2 = new oAddress('o://test', [transport2 as any]);

      expect(addr1.equals(addr2)).to.be.false;
    });

    it('should return false for different addresses', () => {
      const addr1 = new oAddress('o://test1');
      const addr2 = new oAddress('o://test2');

      expect(addr1.equals(addr2)).to.be.false;
    });
  });

  describe('toJSON()', () => {
    it('should serialize address to JSON', () => {
      const transport = { toString: () => '/transport', type: 'LIBP2P' as any };
      const addr = new oAddress('o://test', [transport as any]);

      const json = addr.toJSON();

      expect(json.value).to.equal('o://test');
      expect(json.transports).to.be.an('array');
      expect(json.transports).to.have.lengthOf(1);
      expect(json.transports[0]).to.equal('/transport');
    });

    it('should handle address with no transports', () => {
      const addr = new oAddress('o://test');

      const json = addr.toJSON();

      expect(json.value).to.equal('o://test');
      expect(json.transports).to.be.an('array').that.is.empty;
    });

    it('should handle multiple transports', () => {
      const transport1 = { toString: () => '/transport1', type: 'LIBP2P' as any };
      const transport2 = { toString: () => '/transport2', type: 'CUSTOM' as any };

      const addr = new oAddress('o://test', [transport1 as any, transport2 as any]);

      const json = addr.toJSON();

      expect(json.transports).to.have.lengthOf(2);
      expect(json.transports).to.include('/transport1');
      expect(json.transports).to.include('/transport2');
    });
  });

  describe('root getter', () => {
    it('should return root address as string', () => {
      const addr = new oAddress('o://leader/services/embeddings');
      expect(addr.root).to.equal('o://leader');
    });

    it('should return same for root address', () => {
      const addr = new oAddress('o://leader');
      expect(addr.root).to.equal('o://leader');
    });

    it('should handle static addresses', () => {
      const addr = new oAddress('o://embeddings-text');
      expect(addr.root).to.equal('o://embeddings-text');
    });
  });

  describe('Edge cases', () => {
    it('should handle addresses with numbers', () => {
      const addr = new oAddress('o://service123');
      expect(addr.validate()).to.be.true;
      expect(addr.paths).to.equal('service123');
    });

    it('should handle addresses with dashes and underscores', () => {
      const addr = new oAddress('o://my-service_v2');
      expect(addr.validate()).to.be.true;
      expect(addr.toString()).to.equal('o://my-service_v2');
    });

    it('should handle deeply nested hierarchies', () => {
      const addr = new oAddress('o://a/b/c/d/e/f/g/h/i/j');
      expect(addr.validate()).to.be.true;
      expect(addr.toRootAddress().toString()).to.equal('o://a');
      expect(addr.toStaticAddress().toString()).to.equal('o://j');
    });

    it('should handle single character path segments', () => {
      const addr = new oAddress('o://a/b/c');
      expect(addr.paths).to.equal('a/b/c');
      expect(addr.toRootAddress().toString()).to.equal('o://a');
    });
  });
});
