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
