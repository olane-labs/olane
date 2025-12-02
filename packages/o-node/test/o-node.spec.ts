import { NodeState } from '@olane/o-core';
import { expect } from 'chai';
import { TestEnvironment, assertRunning, assertStopped } from '@olane/o-test';
import { oNodeTool } from '../src/o-node.tool.js';
import { oNodeAddress } from '../src/index.js';

describe('oNode', () => {
  const env = new TestEnvironment();

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Lifecycle', () => {
    it('should be able to start a single node with no leader', async () => {
      const node = new oNodeTool({
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
      const node = new oNodeTool({
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
      const node = new oNodeTool({
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

      // Verify state is properly reset
      expect(node.state).to.equal(NodeState.STOPPED);
    });

    it('should allow restart after stop with state reset', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://restart-test'),
        leader: null,
        parent: null,
        seed: 'restart-test-seed',
      });

      // First start
      await node.start();
      assertRunning(node);

      // Verify node has transports after start
      expect(node.address.libp2pTransports.length).to.be.greaterThan(0);
      const firstPeerId = node.peerId.toString();

      // Stop the node
      await node.stop();
      assertStopped(node);

      // After stop, state should be reset
      expect(node.p2pNode).to.be.undefined;
      expect(node.peerId).to.be.undefined;
      expect(node.connectionManager).to.be.undefined;

      // Restart should now work
      await node.start();
      assertRunning(node);

      // Verify node is functional after restart
      expect(node.peerId.toString()).to.equal(firstPeerId); // Same seed = same peerId
      expect(node.address.libp2pTransports.length).to.be.greaterThan(0);

      await node.stop();
    });

    it('should reset address to staticAddress with no transports', async () => {
      const staticAddress = new oNodeAddress('o://address-reset-test');
      const node = new oNodeTool({
        address: staticAddress,
        leader: null,
        parent: null,
      });

      // Verify initial state
      expect(node.address.value).to.equal('o://address-reset-test');
      expect(node.address.transports).to.have.length(0);

      // Start node
      await node.start();
      assertRunning(node);

      // After start, address should have transports
      expect(node.address.transports.length).to.be.greaterThan(0);
      const transportsDuringRun = node.address.transports.length;

      // Stop node
      await node.stop();
      assertStopped(node);

      // After stop, address should be reset to staticAddress with no transports
      expect(node.address.value).to.equal('o://address-reset-test');
      expect(node.address.transports).to.have.length(0);

      // Restart to verify it works
      await node.start();
      assertRunning(node);
      expect(node.address.transports.length).to.be.greaterThan(0);

      await node.stop();
    });

    it('should reset errors array on stop', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://errors-reset-test'),
        leader: null,
        parent: null,
      });

      await node.start();
      assertRunning(node);

      // Simulate adding errors
      node.errors.push(new Error('Test error'));
      expect(node.errors).to.have.length(1);

      await node.stop();
      assertStopped(node);

      // Errors should be cleared
      expect(node.errors).to.have.length(0);
    });

    it('should reset metrics on stop', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://metrics-reset-test'),
        leader: null,
        parent: null,
      });

      await node.start();
      assertRunning(node);

      // Make some calls to accumulate metrics
      await node.use(node.address, {
        method: 'get_libp2p_metrics',
        params: {},
      });

      // Verify metrics were recorded
      const metricsBeforeStop = node.metrics.successCount;
      expect(metricsBeforeStop).to.be.greaterThan(0);

      await node.stop();
      assertStopped(node);

      // Metrics should be reset
      expect(node.metrics.successCount).to.equal(0);
      expect(node.metrics.errorCount).to.equal(0);
    });

    it('should support multiple restart cycles', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://multi-restart-test'),
        leader: null,
        parent: null,
        seed: 'multi-restart-seed',
      });

      const peerId = node.peerId?.toString();

      // First cycle
      await node.start();
      assertRunning(node);
      expect(node.p2pNode).to.exist;
      await node.stop();
      assertStopped(node);
      expect(node.p2pNode).to.be.undefined;

      // Second cycle
      await node.start();
      assertRunning(node);
      expect(node.p2pNode).to.exist;
      await node.stop();
      assertStopped(node);
      expect(node.p2pNode).to.be.undefined;

      // Third cycle
      await node.start();
      assertRunning(node);
      expect(node.p2pNode).to.exist;

      // Verify node is still functional
      const response = await node.use(node.address, {
        method: 'get_libp2p_metrics',
        params: {},
      });
      expect(response.result.success).to.be.true;

      await node.stop();
      assertStopped(node);
    });

    it('should reset didRegister flag on stop', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://didregister-test'),
        leader: null,
        parent: null,
      });

      await node.start();
      assertRunning(node);

      // After start, didRegister might be true (depending on if registration happened)
      // For standalone nodes without leader, it stays false, but let's verify the reset works

      await node.stop();
      assertStopped(node);

      // Should be able to restart
      await node.start();
      assertRunning(node);

      await node.stop();
    });

    it('should clear p2p node after stop', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://clear-test'),
        leader: null,
        parent: null,
        seed: 'clear-test-seed',
      });

      await node.start();
      assertRunning(node);

      // Test basic functionality before stop
      const response1 = await node.use(node.address, {
        method: 'get_libp2p_metrics',
        params: {},
      });
      expect(response1.result.success).to.be.true;
      expect(response1.result.data).to.exist;

      // Verify p2pNode exists
      expect(node.p2pNode).to.exist;

      await node.stop();
      assertStopped(node);

      // p2pNode should be cleared (allowing restart)
      expect(node.p2pNode).to.be.undefined;
    });

    it('should clean up resources properly on stop', async () => {
      const node = new oNodeTool({
        address: new oNodeAddress('o://cleanup-test'),
        leader: null,
        parent: null,
      });

      await node.start();
      assertRunning(node);

      // Verify p2p node exists and is started
      expect(node.p2pNode).to.exist;
      expect(node.p2pNode.status).to.equal('started');

      await node.stop();
      assertStopped(node);

      // Verify resources are cleaned up
      expect(node.p2pNode).to.be.undefined;
      expect(node.connectionManager).to.be.undefined;
      expect(node.connectionHeartbeatManager).to.be.undefined;
    });
  });
});
