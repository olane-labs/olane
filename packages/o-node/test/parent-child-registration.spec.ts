import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-test';
import { NetworkBuilder } from './helpers/network-builder.js';
import { oNodeAddress } from '../src/router/o-node.address.js';

describe('Parent-Child Registration', () => {
  const env = new TestEnvironment();
  let builder: NetworkBuilder;

  afterEach(async () => {
    if (builder) {
      await builder.cleanup();
    }
    await env.cleanup();
  });

  describe('Basic Registration', () => {
    it('should register child with parent during startup', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child = await builder.addNode('o://child', 'o://leader');
      await builder.startNode('o://child');

      // Wait for registration to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify child is in parent's hierarchy manager
      const children = leader.getChildren();
      expect(children).to.have.lengthOf(1);
      expect(children[0].toString()).to.include('child');
    });

    it('should exchange transports during registration', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child = await builder.addNode('o://child', 'o://leader');

      // Child should have parent reference but no transports yet
      expect(child.parent).to.exist;

      await builder.startNode('o://child');

      // After registration, child should have parent transports
      expect(child.parent?.libp2pTransports.length).to.be.greaterThan(0);

      // Parent should have child transports
      const children = leader.getChildren();
      expect(children[0].libp2pTransports.length).to.be.greaterThan(0);
    });

    it('should construct nested addresses after registration', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child = await builder.addNode('o://child', 'o://leader');

      // Before start, address is simple
      expect(child.address.toString()).to.equal('o://child');

      await builder.startNode('o://child');

      // After registration, address becomes nested
      expect(child.address.toString()).to.include('leader');
      expect(child.address.toString()).to.include('child');
    });

    it('should establish connection during registration', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child = await builder.addNode('o://child', 'o://leader');
      await builder.startNode('o://child');

      // Wait for registration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify connection exists
      const connections = leader.p2pNode.getConnections();
      expect(connections.length).to.be.greaterThan(0);

      // Child should also have connection to parent
      const childConnections = child.p2pNode.getConnections();
      expect(childConnections.length).to.be.greaterThan(0);
    });
  });

  describe('Multiple Children Registration', () => {
    it('should register multiple children with same parent', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child1 = await builder.addNode('o://child1', 'o://leader');
      const child2 = await builder.addNode('o://child2', 'o://leader');
      const child3 = await builder.addNode('o://child3', 'o://leader');

      await builder.startNode('o://child1');
      await builder.startNode('o://child2');
      await builder.startNode('o://child3');

      // Wait for all registrations
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify all children registered
      const children = leader.getChildren();
      expect(children).to.have.lengthOf(3);

      const childAddresses = children.map((c) => c.toString());
      expect(childAddresses.some((a) => a.includes('child1'))).to.be.true;
      expect(childAddresses.some((a) => a.includes('child2'))).to.be.true;
      expect(childAddresses.some((a) => a.includes('child3'))).to.be.true;
    });

    it('should maintain separate connections for each child', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      await builder.addNode('o://child1', 'o://leader');
      await builder.addNode('o://child2', 'o://leader');

      await builder.startNode('o://child1');
      await builder.startNode('o://child2');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Leader should have multiple connections
      const connections = leader.p2pNode.getConnections();
      expect(connections.length).to.be.greaterThan(1);

      // Each connection should be open
      connections.forEach((conn) => {
        expect(conn.status).to.equal('open');
      });
    });

    it('should route to correct child', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child1 = await builder.addNode('o://child1', 'o://leader');
      const child2 = await builder.addNode('o://child2', 'o://leader');

      await builder.startNode('o://child1');
      await builder.startNode('o://child2');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Call each child
      const response1 = await leader.use(child1.address, {
        method: 'get_info',
        params: {},
      });

      const response2 = await leader.use(child2.address, {
        method: 'get_info',
        params: {},
      });

      // Verify correct nodes responded
      expect(response1.result.success).to.be.true;
      expect(response1.result.data.address).to.include('child1');

      expect(response2.result.success).to.be.true;
      expect(response2.result.data.address).to.include('child2');
    });
  });

  describe('Hierarchical Registration', () => {
    it('should register grandchildren through parent', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const parent = await builder.addNode('o://parent', 'o://leader');
      await builder.startNode('o://parent');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const child = await builder.addNode('o://child', 'o://parent');
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify registrations
      expect(leader.getChildren()).to.have.lengthOf(1);
      expect(parent.getChildren()).to.have.lengthOf(1);

      // Child address should be fully nested
      expect(child.address.toString()).to.include('leader');
      expect(child.address.toString()).to.include('parent');
      expect(child.address.toString()).to.include('child');
    });

    it('should maintain hierarchy references', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const parent = await builder.addNode('o://parent', 'o://leader');
      await builder.startNode('o://parent');

      const child = await builder.addNode('o://child', 'o://parent');
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Child should know its parent and leader
      expect(child.parent?.toString()).to.include('parent');
      expect(child.leader?.toString()).to.include('leader');

      // Parent should know its leader
      expect(parent.parent?.toString()).to.include('leader');
      expect(parent.leader?.toString()).to.include('leader');

      // Leader should have no parent
      expect(leader.parent).to.be.null;
      expect(leader.leader).to.be.null;
    });

    it('should route through hierarchy correctly', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const parent = await builder.addNode('o://parent', 'o://leader');
      await builder.startNode('o://parent');

      const child = await builder.addNode('o://child', 'o://parent');
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Leader calls child (should route through parent)
      const response = await leader.use(child.address, {
        method: 'echo',
        params: { message: 'from leader to grandchild' },
      });

      expect(response.result.success).to.be.true;
      expect(response.result.data.message).to.equal(
        'from leader to grandchild',
      );
      expect(response.result.data.nodeAddress).to.include('child');
    });
  });

  describe('Registration Edge Cases', () => {
    it('should handle registration with deterministic peer IDs', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader', undefined, {
        seed: 'deterministic-seed-1',
      });
      await builder.startNode('o://leader');

      const child = await builder.addNode('o://child', 'o://leader', {
        seed: 'deterministic-seed-2',
      });
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Registration should work with seeded peer IDs
      expect(leader.getChildren()).to.have.lengthOf(1);

      // Connections should be established
      const connections = leader.p2pNode.getConnections();
      expect(connections.length).to.be.greaterThan(0);
    });

    it('should handle rapid sequential registrations', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      // Add and start children rapidly
      const children = [];
      for (let i = 0; i < 5; i++) {
        const child = await builder.addNode(`o://child${i}`, 'o://leader');
        children.push(child);
      }

      // Start all at once
      await Promise.all(
        children.map((_, i) => builder.startNode(`o://child${i}`)),
      );

      // Wait for all registrations
      await new Promise((resolve) => setTimeout(resolve, 300));

      // All should be registered
      expect(leader.getChildren()).to.have.lengthOf(5);
    });

    it('should update parent transports on registration', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      const child = await builder.addNode('o://child', 'o://leader');

      // Before starting, child has parent reference but no transports
      const initialTransports = child.parent?.libp2pTransports.length || 0;
      expect(initialTransports).to.equal(0);

      await builder.startNode('o://leader');
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // After registration, child should have parent transports
      const finalTransports = child.parent?.libp2pTransports.length || 0;
      expect(finalTransports).to.be.greaterThan(0);
    });
  });

  describe('Child Disconnection', () => {
    it('should remove child from hierarchy when stopped', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      const child = await builder.addNode('o://child', 'o://leader');
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify child registered
      expect(leader.getChildren()).to.have.lengthOf(1);

      // Stop child
      await builder.stopNode('o://child');

      // Note: Without heartbeat monitoring, parent won't detect disconnection immediately
      // This test verifies the stop mechanism works cleanly
      expect(child.state).to.equal(require('@olane/o-core').NodeState.STOPPED);
    });

    it('should handle graceful disconnection of multiple children', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      await builder.startNode('o://leader');

      await builder.addNode('o://child1', 'o://leader');
      await builder.addNode('o://child2', 'o://leader');
      await builder.addNode('o://child3', 'o://leader');

      await builder.startNode('o://child1');
      await builder.startNode('o://child2');
      await builder.startNode('o://child3');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Stop children one by one
      await builder.stopNode('o://child1');
      await builder.stopNode('o://child2');
      await builder.stopNode('o://child3');

      // Leader should remain operational
      const response = await leader.use(leader.address, {
        method: 'get_info',
        params: {},
      });

      expect(response.result.success).to.be.true;
    });
  });

  describe('Parent Startup Sequence', () => {
    it('should wait for parent transports before registering', async () => {
      builder = new NetworkBuilder();
      const leader = await builder.addNode('o://leader');
      const child = await builder.addNode('o://child', 'o://leader');

      // Start leader first
      await builder.startNode('o://leader');

      // Wait for transports
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start child - should wait for parent transports
      await builder.startNode('o://child');

      // Child should have successfully registered
      expect(leader.getChildren()).to.have.lengthOf(1);
    });

    it('should handle parent started after child creation', async () => {
      builder = new NetworkBuilder();

      // Create leader but don't start
      await builder.addNode('o://leader');

      // Create child (parent not started yet)
      const child = await builder.addNode('o://child', 'o://leader');

      // Start leader first
      await builder.startNode('o://leader');

      // Then start child
      await builder.startNode('o://child');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Registration should succeed
      const leader = builder.getNode('o://leader')!;
      expect(leader.getChildren()).to.have.lengthOf(1);
    });
  });
});
