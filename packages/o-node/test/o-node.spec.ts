import { NodeState } from '@olane/o-core';
import { expect } from 'chai';
import { TestEnvironment, assertRunning, assertStopped } from '@olane/o-test';
import { oNode } from '../src/index.js';
import { oNodeAddress } from '../src/router/o-node.address.js';

describe('oNode', () => {
  const env = new TestEnvironment();

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Lifecycle', () => {
    it('should be able to start a single node with no leader', async () => {
      const node = new oNode({
        address: new oNodeAddress('o://test'),
        leader: null,
        parent: null,
      });

      await node.start();

      // Use o-test assertion helpers
      assertRunning(node);

      const transports = node.transports;
      // expect(transports.length).to.equal(1);
      // expect(transports[0].toString()).to.contain('/memory');

      await node.stop();
      assertStopped(node);

      // Also verify with traditional chai for backward compatibility
      expect(node.state).to.equal(NodeState.STOPPED);
    });

    it('should initialize with correct address', async () => {
      const testAddress = new oNodeAddress('o://test-node');
      const node = new oNode({
        address: testAddress,
        leader: null,
        parent: null,
      });

      await node.start();

      expect(node.address.value).to.equal('o://test-node');
      assertRunning(node);

      await node.stop();
    });

    it('should handle start and stop lifecycle correctly', async () => {
      const node = new oNode({
        address: new oNodeAddress('o://lifecycle-test'),
        leader: null,
        parent: null,
      });

      // Initially not started
      expect(node.state).to.equal(NodeState.STOPPED);

      // Start node
      await node.start();
      assertRunning(node);

      // Stop node
      await node.stop();
      assertStopped(node);

      // Verify can't be started again after stop
      expect(node.state).to.equal(NodeState.STOPPED);
    });
  });
});
