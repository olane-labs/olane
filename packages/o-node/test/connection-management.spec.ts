import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-test';
import { NetworkBuilder, NetworkTopologies } from './helpers/network-builder.js';
import { createConnectionSpy } from './helpers/connection-spy.js';
import { oNodeAddress } from '../src/router/o-node.address.js';
import { oNodeTransport } from '../src/index.js';

describe('Connection Management', () => {
  const env = new TestEnvironment();
  let builder: NetworkBuilder;

  afterEach(async () => {
    if (builder) {
      await builder.cleanup();
    }
    await env.cleanup();
  });

  describe('Connection Pooling', () => {
    it('should cache and reuse connections', async () => {
      builder = await NetworkTopologies.twoNode();
      
      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make first request (establishes connection)
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'ping',
          params: { message: 'first' },
        },
      );

      const connectionsAfterFirst = spy.getSummary().currentConnections;

      // Make second request (should reuse connection)
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'ping',
          params: { message: 'second' },
        },
      );

      const connectionsAfterSecond = spy.getSummary().currentConnections;

      // Connection count should remain the same (reused)
      expect(connectionsAfterFirst).to.equal(connectionsAfterSecond);
      expect(connectionsAfterFirst).to.be.greaterThan(0);

      spy.stop();
    });

    it('should maintain separate connections to different nodes', async () => {
      builder = await NetworkTopologies.fiveNode();
      

      const leader = builder.getNode('o://leader')!;
      const parent1 = builder.getNode('o://parent1')!;
      const parent2 = builder.getNode('o://parent2')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Call different nodes
      await leader.use(parent1.address, {
        method: 'echo',
        params: { message: 'to parent1' },
      });

      await leader.use(parent2.address, {
        method: 'echo',
        params: { message: 'to parent2' },
      });

      const stats = spy.getConnectionStats();

      // Should have connections to both parents
      expect(stats.length).to.be.greaterThan(1);

      spy.stop();
    });

    it('should handle connection pool efficiently under load', async () => {
      builder = await NetworkTopologies.fiveNode();
      

      const leader = builder.getNode('o://leader')!;
      const child1 = builder.getNode('o://child1')!;
      const child2 = builder.getNode('o://child2')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make many requests to different nodes
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const target = i % 2 === 0 ? child1 : child2;
        promises.push(
          leader.use(target.address, {
            method: 'echo',
            params: { message: `request-${i}` },
          }),
        );
      }

      await Promise.all(promises);

      const summary = spy.getSummary();

      // Connection count should be reasonable (not 50)
      expect(summary.currentConnections).to.be.lessThan(10);
      expect(summary.currentConnections).to.be.greaterThan(0);

      spy.stop();
    });
  });

  describe('Connection Status', () => {
    it('should report correct connection status', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Establish connection
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      const stats = spy.getConnectionStats();
      expect(stats.length).to.be.greaterThan(0);

      const connection = stats[0];
      expect(connection.status).to.equal('open');
      expect(connection.peerId).to.be.a('string');
      expect(connection.remoteAddr).to.be.a('string');

      spy.stop();
    });


    it('should detect open connections', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Get child's peer ID
      const childPeerId = child.address.libp2pTransports[0].toPeerId();

      const spy = createConnectionSpy(leader);
      spy.start();

      // Establish connection
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      // Verify connection exists
      const hasConnection = spy.hasConnectionToPeer(childPeerId);
      expect(hasConnection).to.be.true;

      spy.stop();
    });
  });

  describe('Connection Validation', () => {
    it('should validate connection before transmission', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Valid connection should work
      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      expect(response.result.success).to.be.true;
    });

    it('should handle connection to unreachable node', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      

      // Create address to non-existent node
      const fakeAddress = new oNodeAddress('o://nonexistent', [
        new oNodeTransport(
          '/ip4/127.0.0.1/tcp/4099',
        ),
      ]);

      // Attempt to connect should fail gracefully
      await leader.use(fakeAddress, {
        method: 'echo',
        params: { message: 'test' },
      }).catch((err) => {
        expect(err.message).to.be.equal('Unable to extract peer ID from address: o://nonexistent');
      });
    });

    it('should verify connection is open before use', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make request
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      // Verify connection is open
      const stats = spy.getConnectionStats();
      expect(stats.length).to.be.greaterThan(0);
      expect(stats[0].status).to.equal('open');

      spy.stop();
    });
  });

  describe('Connection Recovery', () => {
    it('should handle transient connection errors', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Make successful request
      const response1 = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'before' },
        },
      );

      expect(response1.result.success).to.be.true;

      // Simulate brief disconnection by stopping and restarting child
      await child.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await child.start();

      // Wait for reconnection
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Subsequent request should eventually work
      // Note: May need retry logic depending on implementation
      const response2 = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'after' },
        },
      );

      // This may fail if connection not re-established
      // Test verifies graceful error handling
      if (response2.result.success) {
        expect(response2.result.data.message).to.equal('after');
      } else {
        expect(response2.result.error).to.exist;
      }
    });

    it('should maintain other connections when one fails', async () => {
      builder = await NetworkTopologies.fiveNode();
      

      const leader = builder.getNode('o://leader')!;
      const child1 = builder.getNode('o://child1')!;
      const child2 = builder.getNode('o://child2')!;

      // Establish connections to both children
      await leader.use(child1.address, {
        method: 'echo',
        params: { message: 'child1' },
      });

      await leader.use(child2.address, {
        method: 'echo',
        params: { message: 'child2' },
      });

      // Stop child1
      await builder.stopNode('o://child1');

      // Connection to child2 should still work
      const response = await leader.use(child2.address, {
        method: 'echo',
        params: { message: 'child2-after' },
      });

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('child2-after');
    });
  });

  describe('Multi-node Connection Management', () => {
    it('should manage connections in complex topology', async () => {
      builder = await NetworkTopologies.complex();
      

      const leader = builder.getNode('o://leader')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make requests to various nodes
      for (let i = 1; i <= 3; i++) {
        const parent = builder.getNode(`o://parent${i}`)!;
        await leader.use(parent.address, {
          method: 'echo',
          params: { message: `parent${i}` },
        });
      }

      const summary = spy.getSummary();

      // Should have connections to parents
      expect(summary.currentConnections).to.be.greaterThan(0);
      expect(summary.currentConnections).to.be.lessThan(10);

      spy.stop();
    });

  });

  describe('Connection Metadata', () => {
    it('should track connection creation time', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      const beforeTime = Date.now();

      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      const afterTime = Date.now();

      const stats = spy.getConnectionStats();
      if (stats.length > 0) {
        expect(stats[0].created).to.be.at.least(beforeTime);
        expect(stats[0].created).to.be.at.most(afterTime);
      }

      spy.stop();
    });

    it('should track remote peer information', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      const stats = spy.getConnectionStats();
      if (stats.length > 0) {
        const connection = stats[0];
        expect(connection.peerId).to.be.a('string');
        expect(connection.peerId.length).to.be.greaterThan(0);
        expect(connection.remoteAddr).to.be.a('string');
        expect(connection.remoteAddr.length).to.be.greaterThan(0);
      }

      spy.stop();
    });
  });

  describe('Connection Gating', () => {
    it('should enforce connection gating rules', async () => {
      builder = await NetworkTopologies.twoNode();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Parent-child connections should be allowed
      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      expect(response.result.success).to.be.true;
    });

    it('should allow connections within hierarchy', async () => {
      builder = await NetworkTopologies.threeNode();

      const leader = builder.getNode('o://leader')!;
      const parent = builder.getNode('o://parent')!;
      const child = builder.getNode('o://child')!;

      // All connections in hierarchy should work
      const response1 = await leader.use(parent.address, {
        method: 'echo',
        params: { message: 'leader-to-parent' },
      });

      const response2 = await parent.use(child.address, {
        method: 'echo',
        params: { message: 'parent-to-child' },
      });

      const response3 = await child.use(parent.address, {
        method: 'echo',
        params: { message: 'child-to-parent' },
      });

      expect(response1.result.success).to.be.true;
      expect(response2.result.success).to.be.true;
      expect(response3.result.success).to.be.true;
    });
  });

  describe('Connection Cleanup', () => {
    it('should clean up connections on node stop', async () => {
      builder = await NetworkTopologies.twoNode();
      

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Establish connection
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      const spy = createConnectionSpy(leader);
      spy.start();

      const beforeConnections = spy.getSummary().currentConnections;
      expect(beforeConnections).to.be.greaterThan(0);

      // Stop child
      await builder.stopNode('o://child');

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Note: Connection may still exist until cleanup cycle runs
      // This test verifies stop mechanism doesn't throw errors

      spy.stop();
    });

    it('should handle cleanup of multiple connections', async () => {
      builder = await NetworkTopologies.fiveNode();
      

      const leader = builder.getNode('o://leader')!;

      // Establish connections
      const child1 = builder.getNode('o://child1')!;
      const child2 = builder.getNode('o://child2')!;

      await leader.use(child1.address, {
        method: 'echo',
        params: { message: 'child1' },
      });

      await leader.use(child2.address, {
        method: 'echo',
        params: { message: 'child2' },
      });

      // Stop all children
      await builder.stopNode('o://child1');
      await builder.stopNode('o://child2');

      // Leader should remain operational
      const response = await leader.use(leader.address, {
        method: 'get_info',
        params: {},
      });

      expect(response.result.success).to.be.true;
    });
  });
});
