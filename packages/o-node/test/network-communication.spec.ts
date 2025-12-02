import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-test';
import { NetworkBuilder, NetworkTopologies } from './helpers/network-builder.js';
import { createConnectionSpy } from './helpers/connection-spy.js';
import { oNodeAddress } from '../src/router/o-node.address.js';

describe('Network Communication', () => {
  const env = new TestEnvironment();
  let builder: NetworkBuilder;

  afterEach(async () => {
    if (builder) {
      await builder.cleanup();
    }
    await env.cleanup();
  });

  describe('Two-Node Direct Communication', () => {
    it('should establish connection between parent and child', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Verify child has leader transports
      expect(child.address.libp2pTransports.length).to.be.greaterThan(0);

      // Create connection spy
      const spy = createConnectionSpy(leader);
      spy.start();

      // Make a call from leader to child
      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'hello from leader' },
        },
      );

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('hello from leader');
      expect(response.result.data.nodeAddress).to.include('child');

      // Verify connection was established
      const summary = spy.getSummary();
      expect(summary.currentConnections).to.be.greaterThan(0);

      spy.stop();
    });

    it('should allow bidirectional communication', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Leader → Child
      const response1 = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'from leader' },
        },
      );

      expect(response1.result.success).to.be.true;
      expect(response1.result.data.message).to.equal('from leader');

      // Child → Leader
      const response2 = await child.use(
        new oNodeAddress(leader.address.toString(), leader.address.libp2pTransports),
        {
          method: 'get_info',
          params: {},
        },
      );

      expect(response2.result.success).to.be.true;
      expect(response2.result.data.address).to.include('leader');
    });

    it('should reuse connections for multiple requests', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const response = await leader.use(
          new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
          {
            method: 'echo',
            params: { message: `request ${i}` },
          },
        );

        expect(response.result.success).to.be.true;
      }

      // Should have only 1 connection (reused)
      const summary = spy.getSummary();
      expect(summary.currentConnections).to.equal(1);

      spy.stop();
    });
  });

  describe('Three-Node Hierarchical Communication', () => {
    it('should route through hierarchy (leader → parent → child)', async () => {
      builder = await NetworkTopologies.threeNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const parent = builder.getNode('o://parent')!;
      const child = builder.getNode('o://child')!;

      // Leader → Child (should route through parent)
      const response = await leader.use(child.address, {
        method: 'echo',
        params: { message: 'hello from leader' },
      });

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal('hello from leader');
      expect(response.result.data.nodeAddress).to.include('child');
    });

    it('should handle multi-hop routing correctly', async () => {
      builder = await NetworkTopologies.threeNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const parent = builder.getNode('o://parent')!;
      const child = builder.getNode('o://child')!;

      // Get info from each node
      const leaderInfo = await leader.use(leader.address, {
        method: 'get_info',
        params: {},
      });

      const parentInfo = await leader.use(parent.address, {
        method: 'get_info',
        params: {},
      });

      const childInfo = await leader.use(child.address, {
        method: 'get_info',
        params: {},
      });

      // Verify hierarchy structure
      expect(leaderInfo.result.data.address).to.include('leader');
      expect(parentInfo.result.data.address).to.include('parent');
      expect(parentInfo.result.data.leader).to.include('leader');
      expect(childInfo.result.data.address).to.include('child');
      expect(childInfo.result.data.parent).to.include('parent');
    });

    it('should maintain connections across hierarchy', async () => {
      builder = await NetworkTopologies.threeNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const parent = builder.getNode('o://parent')!;

      const leaderSpy = createConnectionSpy(leader);
      const parentSpy = createConnectionSpy(parent);

      leaderSpy.start();
      parentSpy.start();

      // Leader has connection to parent (from registration)
      expect(leaderSpy.getSummary().currentConnections).to.be.greaterThan(0);

      // Parent has connection to leader and child
      expect(parentSpy.getSummary().currentConnections).to.be.greaterThan(0);

      leaderSpy.stop();
      parentSpy.stop();
    });
  });

  describe('Self-Routing Optimization', () => {
    it('should execute locally when routing to self', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      const initialStreamCount = spy.getTotalStreamCount();

      // Call self
      const response = await leader.use(leader.address, {
        method: 'get_info',
        params: {},
      });

      expect(response.result.success).to.be.true;
      expect(response.result.data.address).to.include('leader');

      // Stream count should not increase (no network call)
      const finalStreamCount = spy.getTotalStreamCount();
      expect(finalStreamCount).to.equal(initialStreamCount);

      spy.stop();
    });

    it('should handle self-routing with different address formats', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startAll();

      // Call with exact address
      const response1 = await leader.use(leader.address, {
        method: 'get_info',
        params: {},
      });

      expect(response1.result.success).to.be.true;

      // Call with address string (should also detect self)
      const response2 = await leader.use(
        new oNodeAddress('o://leader'),
        {
          method: 'get_info',
          params: {},
        },
      );

      expect(response2.result.success).to.be.true;
    });
  });

  describe('Method Execution', () => {
    it('should execute tool methods correctly', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      // Test echo method
      const echoResponse = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test message' },
        },
      );

      expect(echoResponse.result.success).to.be.true;
      expect(echoResponse.result.data.message).to.equal('test message');
      expect(echoResponse.result.data.timestamp).to.be.a('number');

      // Test get_info method
      const infoResponse = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'get_info',
          params: {},
        },
      );

      expect(infoResponse.result.success).to.be.true;
      expect(infoResponse.result.data.address).to.be.a('string');
      expect(infoResponse.result.data.callCount).to.equal(1); // One echo call
    });

    it('should handle method not found errors', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'non_existent_method',
          params: {},
        },
      );

      expect(response.result.success).to.be.false;
      expect(response.result.error).to.exist;
    });

  });

  describe('Streaming Responses', () => {
    it('should handle streaming responses from remote node', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'stream',
          params: { count: 5 },
        },
      );

      expect(response.result.success).to.be.true;

      // Response should be async iterable
      const chunks: any[] = [];
      for await (const chunk of response.result.data) {
        chunks.push(chunk);
      }

      expect(chunks).to.have.lengthOf(5);
      expect(chunks[0].chunk).to.equal(1);
      expect(chunks[4].chunk).to.equal(5);
      expect(chunks[0].nodeAddress).to.include('child');
    });

    it('should stream across multiple hops', async () => {
      builder = await NetworkTopologies.threeNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const response = await leader.use(child.address, {
        method: 'stream',
        params: { count: 3 },
      });

      expect(response.result.success).to.be.true;

      const chunks: any[] = [];
      for await (const chunk of response.result.data) {
        chunks.push(chunk);
      }

      expect(chunks).to.have.lengthOf(3);
      expect(chunks[0].nodeAddress).to.include('child');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests to same node', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          leader.use(
            new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
            {
              method: 'echo',
              params: { message: `concurrent ${i}` },
            },
          ),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      expect(responses).to.have.lengthOf(10);
      responses.forEach((response, i) => {
        expect(response.result.success).to.be.true;
        expect(response.result.data.message).to.equal(`concurrent ${i}`);
      });
    });

    it('should handle concurrent requests to different nodes', async () => {
      builder = await NetworkTopologies.fiveNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const parent1 = builder.getNode('o://parent1')!;
      const parent2 = builder.getNode('o://parent2')!;
      const child1 = builder.getNode('o://child1')!;
      const child2 = builder.getNode('o://child2')!;

      const promises = [
        leader.use(parent1.address, { method: 'get_info', params: {} }),
        leader.use(parent2.address, { method: 'get_info', params: {} }),
        leader.use(child1.address, { method: 'get_info', params: {} }),
        leader.use(child2.address, { method: 'get_info', params: {} }),
      ];

      const responses = await Promise.all(promises);

      // All should succeed
      expect(responses).to.have.lengthOf(4);
      responses.forEach((response) => {
        expect(response.result.success).to.be.true;
      });

      // Verify correct nodes responded
      expect(responses[0].result.data.address).to.include('parent1');
      expect(responses[1].result.data.address).to.include('parent2');
      expect(responses[2].result.data.address).to.include('child1');
      expect(responses[3].result.data.address).to.include('child2');
    });
  });

  describe('Connection Pooling', () => {
    it('should pool connections efficiently', async () => {
      builder = await NetworkTopologies.fiveNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const spy = createConnectionSpy(leader);
      spy.start();

      const child1 = builder.getNode('o://child1')!;
      const child2 = builder.getNode('o://child2')!;

      // Make multiple calls to same nodes
      for (let i = 0; i < 5; i++) {
        await leader.use(child1.address, {
          method: 'echo',
          params: { message: `child1-${i}` },
        });

        await leader.use(child2.address, {
          method: 'echo',
          params: { message: `child2-${i}` },
        });
      }

      const summary = spy.getSummary();

      // Should have connections to parents (which route to children)
      expect(summary.currentConnections).to.be.greaterThan(0);
      expect(summary.currentConnections).to.be.lessThan(10); // Not 10 (one per call)

      spy.stop();
    });

    it('should maintain connection status correctly', async () => {
      builder = await NetworkTopologies.twoNode();
      await builder.startAll();

      const leader = builder.getNode('o://leader')!;
      const child = builder.getNode('o://child')!;

      const spy = createConnectionSpy(leader);
      spy.start();

      // Make initial request to establish connection
      await leader.use(
        new oNodeAddress(child.address.toString(), child.address.libp2pTransports),
        {
          method: 'echo',
          params: { message: 'test' },
        },
      );

      // Get connection stats
      const stats = spy.getConnectionStats();
      expect(stats.length).to.be.greaterThan(0);

      const connection = stats[0];
      expect(connection.status).to.equal('open');
      expect(connection.peerId).to.be.a('string');

      spy.stop();
    });
  });
});
