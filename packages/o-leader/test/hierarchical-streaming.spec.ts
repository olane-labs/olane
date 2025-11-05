import { expect } from 'chai';
import { TestLeaderNode } from './helpers/test-leader.node.js';
import { TestLaneTool } from './helpers/test-lane.tool.js';
import {
  NodeState,
  NodeType,
  oAddress,
  setupGracefulShutdown,
} from '@olane/o-core';
import { oNodeAddress, oNodeTransport } from '@olane/o-node';
import { oResponse } from '@olane/o-core';

describe('Hierarchical Network Streaming Tests', () => {
  let leaderNode: TestLeaderNode;
  let childNode: TestLaneTool;
  let serviceNode: TestLaneTool;
  let clientNode: TestLaneTool;

  describe('Test 1: Basic Network Formation', () => {
    it('should create and start the leader node', async () => {
      leaderNode = new TestLeaderNode({
        type: NodeType.LEADER,
        leader: null,
        parent: null,
        systemName: 'test-network',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await leaderNode.start();
      expect(leaderNode.state).to.equal(NodeState.RUNNING);
      expect(leaderNode.address.toString()).to.equal('o://leader');
      expect(leaderNode.transports.length).to.be.greaterThan(0);
    });

    it('should create and start the child node (o://leader/node)', async () => {
      childNode = new TestLaneTool({
        address: new oNodeAddress('o://node'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Child node for testing',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      setupGracefulShutdown(async () => {
        await leaderNode.stop();
        await childNode.stop();
      });

      await childNode.start();
      expect(childNode.state).to.equal(NodeState.RUNNING);
      expect(childNode.address.toString()).to.equal('o://leader/node');

      // Wait for registration to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should verify parent-child relationship between leader and child', () => {
      // Check leader has child
      const leaderChildren = leaderNode.hierarchyManager.getChildren();
      expect(leaderChildren[leaderChildren.length - 1].toString()).to.equal(
        'o://leader/node',
      );

      // Check child has parent
      const childParents = childNode.hierarchyManager.getParents();
      expect(childParents.length).to.equal(1);
      expect(childParents[0].toString()).to.equal('o://leader');
    });

    it('should create and start the service node (o://leader/node/service)', async () => {
      serviceNode = new TestLaneTool({
        address: new oNodeAddress('o://service'),
        leader: leaderNode.address,
        parent: childNode.address,
        description: 'Service node for testing',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      setupGracefulShutdown(async () => {
        await serviceNode.stop();
      });

      await serviceNode.start();
      expect(serviceNode.state).to.equal(NodeState.RUNNING);
      expect(serviceNode.address.toString()).to.equal(
        'o://leader/node/service',
      );

      // Wait for registration to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it('should verify parent-child relationship in the hierarchy', () => {
      // Check child node has service as child
      const childChildren = childNode.hierarchyManager.getChildren();
      console.log('childChildren', childChildren);
      expect(childChildren.length).to.equal(1);
      expect(childChildren[0].toString()).to.equal('o://leader/node/service');

      // Check service has child node as parent
      const serviceParents = serviceNode.hierarchyManager.getParents();
      console.log('serviceParents', serviceParents);
      expect(serviceParents.length).to.equal(1);
      expect(serviceParents[0].toString()).to.equal('o://leader/node');
    });

    it('should create and start the standalone client node', async () => {
      clientNode = new TestLaneTool({
        address: new oNodeAddress('o://client'),
        leader: null,
        parent: null,
        description: 'Standalone client node',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await clientNode.start();
      expect(clientNode.state).to.equal(NodeState.RUNNING);
      expect(clientNode.address.toString()).to.equal('o://client');
      expect(clientNode.leader).to.be.null;
      expect(clientNode.parent).to.be.null;
    });
  });

  describe('Test 2: Client → Leader Streaming', () => {
    it('should successfully stream from client to leader node', async function (this: Mocha.Context) {
      this.timeout(15000); // 15 seconds for streaming

      const chunks: any[] = [];
      let lastChunk: oResponse | null = null;

      const leaderAddressWithTransports = new oNodeAddress(
        'o://leader',
        leaderNode.transports,
      );

      const response = await clientNode.useStream(
        leaderAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
            lastChunk = chunk;
          },
        },
      );

      // Wait for all chunks to arrive
      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Verify we received chunks
      expect(chunks.length).to.be.greaterThan(0);
      expect(chunks.length).to.be.lessThanOrEqual(100);

      // Verify chunk structure
      const firstChunk = chunks[0];
      expect(firstChunk).to.have.property('chunk');
      expect(firstChunk).to.have.property('timestamp');
      expect(firstChunk).to.have.property('nodeAddress');
      expect(firstChunk.nodeAddress).to.equal('o://leader');

      // Verify last chunk
      expect(lastChunk).to.not.be.null;
      if (lastChunk) {
        expect((lastChunk as any).result._last).to.be.true;
      }
    });

    it('should receive chunks in sequential order', async function (this: Mocha.Context) {
      this.timeout(15000);

      const chunks: any[] = [];

      const leaderAddressWithTransports = new oNodeAddress(
        'o://leader',
        leaderNode.transports,
      );

      await clientNode.useStream(
        leaderAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Verify chunks are sequential
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].chunk).to.equal(i + 1);
      }
    });
  });

  describe('Test 3: Client → Child Node Streaming', () => {
    it('should successfully stream from client to child node through leader', async function (this: Mocha.Context) {
      this.timeout(15000);

      const chunks: any[] = [];
      let lastChunk: oResponse | null = null;

      const childAddressWithTransports = new oNodeAddress(
        'o://leader/node',
        leaderNode.transports, // Use leader transports to route through leader
      );

      await clientNode.useStream(
        childAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
            lastChunk = chunk;
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Verify we received chunks
      expect(chunks.length).to.be.greaterThan(0);

      // Verify chunks came from the child node
      const firstChunk = chunks[0];
      expect(firstChunk.nodeAddress).to.equal('o://leader/node');

      // Verify last chunk
      expect(lastChunk).to.not.be.null;
      if (lastChunk) {
        expect((lastChunk as any).result._last).to.be.true;
      }
    });

    it('should handle routing correctly through the hierarchy', async function (this: Mocha.Context) {
      this.timeout(15000);

      const chunks: any[] = [];

      const childAddressWithTransports = new oNodeAddress(
        'o://leader/node',
        leaderNode.transports,
      );

      await clientNode.useStream(
        childAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 11000));

      // All chunks should be from the same node
      chunks.forEach((chunk) => {
        expect(chunk.nodeAddress).to.equal('o://leader/node');
      });
    });
  });

  describe('Test 4: Client → Service Node Streaming', () => {
    it('should successfully stream from client to service node through multi-hop routing', async function (this: Mocha.Context) {
      this.timeout(15000);

      const chunks: any[] = [];
      let lastChunk: oResponse | null = null;

      const serviceAddressWithTransports = new oNodeAddress(
        'o://leader/node/service',
        leaderNode.transports, // Route through leader
      );

      await clientNode.useStream(
        serviceAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
            lastChunk = chunk;
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Verify we received chunks
      expect(chunks.length).to.be.greaterThan(0);

      // Verify chunks came from the service node
      const firstChunk = chunks[0];
      expect(firstChunk.nodeAddress).to.equal('o://leader/node/service');

      // Verify last chunk
      expect(lastChunk).to.not.be.null;
      if (lastChunk) {
        expect((lastChunk as any).result._last).to.be.true;
      }
    });

    it('should maintain chunk delivery through deep hierarchy', async function (this: Mocha.Context) {
      this.timeout(15000);

      const chunks: any[] = [];

      const serviceAddressWithTransports = new oNodeAddress(
        'o://leader/node/service',
        leaderNode.transports,
      );

      await clientNode.useStream(
        serviceAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Verify sequential delivery
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].chunk).to.equal(i + 1);
      }

      // All chunks from service
      chunks.forEach((chunk) => {
        expect(chunk.nodeAddress).to.equal('o://leader/node/service');
      });
    });

    it('should handle backpressure correctly in multi-hop streaming', async function (this: Mocha.Context) {
      this.timeout(15000);

      const chunks: any[] = [];
      const timestamps: Date[] = [];

      const serviceAddressWithTransports = new oNodeAddress(
        'o://leader/node/service',
        leaderNode.transports,
      );

      await clientNode.useStream(
        serviceAddressWithTransports,
        {
          method: 'test_stream',
          params: {},
        },
        {
          onChunk: (chunk: oResponse) => {
            chunks.push((chunk as any).result);
            timestamps.push(new Date());
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Verify chunks arrived with reasonable timing
      expect(chunks.length).to.be.greaterThan(0);

      // Calculate average time between chunks
      if (timestamps.length > 1) {
        const totalTime =
          timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime();
        const avgTimeBetweenChunks = totalTime / (timestamps.length - 1);

        // Should be roughly 100ms between chunks (allowing for network overhead)
        expect(avgTimeBetweenChunks).to.be.lessThan(200); // Max 200ms
      }
    });
  });

  describe('Test 5: Error Handling', () => {
    it('should handle streaming to non-existent node gracefully', async function (this: Mocha.Context) {
      this.timeout(15000);

      const nonExistentAddress = new oNodeAddress(
        'o://leader/nonexistent',
        leaderNode.transports,
      );

      let errorOccurred = false;
      let errorMessage = '';

      try {
        await clientNode.useStream(
          nonExistentAddress,
          {
            method: 'test_stream',
            params: {},
          },
          {
            onChunk: (chunk: oResponse) => {
              // Should not receive chunks
            },
          },
        );
      } catch (error: any) {
        errorOccurred = true;
        errorMessage = error.message;
      }

      // Wait a bit to ensure no delayed chunks
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(errorOccurred).to.be.true;
      expect(errorMessage).to.exist;
    });

    it('should handle timeout scenarios appropriately', async function (this: Mocha.Context) {
      this.timeout(5000); // Short timeout

      const leaderAddressWithTransports = new oNodeAddress(
        'o://leader',
        leaderNode.transports,
      );

      const chunks: any[] = [];

      // This should work without timeout
      try {
        await clientNode.useStream(
          leaderAddressWithTransports,
          {
            method: 'test_stream',
            params: {},
          },
          {
            onChunk: (chunk: oResponse) => {
              chunks.push((chunk as any).result);
            },
            readTimeoutMs: 120000, // 2 minutes, should be enough
          },
        );

        // Don't wait for all chunks, just a few
        await new Promise((resolve) => setTimeout(resolve, 2000));

        expect(chunks.length).to.be.greaterThan(0);
      } catch (error) {
        // Should not timeout with proper timeout setting
        throw error;
      }
    });

    it('should properly handle stream errors with error chunks', async function (this: Mocha.Context) {
      this.timeout(10000);

      // Try to call a non-existent method
      const leaderAddressWithTransports = new oNodeAddress(
        'o://leader',
        leaderNode.transports,
      );

      let errorReceived = false;

      try {
        await clientNode.useStream(
          leaderAddressWithTransports,
          {
            method: 'nonexistent_method',
            params: {},
          },
          {
            onChunk: (chunk: oResponse) => {
              if ((chunk as any).error) {
                errorReceived = true;
              }
            },
          },
        );
      } catch (error: any) {
        // Error is expected
        expect(error).to.exist;
        errorReceived = true;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(errorReceived).to.be.true;
    });
  });

  describe('Cleanup', () => {
    it('should stop all nodes gracefully', async () => {
      // Stop in reverse order
      await clientNode.stop();
      expect(clientNode.state).to.equal(NodeState.STOPPED);

      await serviceNode.stop();
      expect(serviceNode.state).to.equal(NodeState.STOPPED);

      await childNode.stop();
      expect(childNode.state).to.equal(NodeState.STOPPED);

      await leaderNode.stop();
      expect(leaderNode.state).to.equal(NodeState.STOPPED);
    });
  });
});
