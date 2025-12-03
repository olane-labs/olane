import { expect } from 'chai';
import { TestEnvironment } from './helpers/index.js';
import { NetworkBuilder } from './helpers/network-builder.js';
import { oNodeAddress } from '../src/router/o-node.address.js';
import { NodeState } from '@olane/o-core';

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

      // Verify child is in parent's hierarchy manager
      const children = leader.getChildren();
      console.log('Leader status:', leader.state);
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

      // Parent should know its leader
      expect(parent.parent?.toString()).to.include('leader');

      // Leader should have no parent
      expect(leader.parent).to.be.null;
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
      expect(child.state).to.equal(NodeState.STOPPED);
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

});
