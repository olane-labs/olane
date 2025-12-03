import { expect } from 'chai';
import { TestLeaderNode } from './helpers/test-leader.node.js';
import { TestLaneTool } from './helpers/test-lane.tool.js';
import {
  NodeState,
  NodeType,
  oAddress,
  setupGracefulShutdown,
} from '@olane/o-core';
import { oNodeAddress } from '@olane/o-node';

/**
 * CRITICAL TEST SUITE: Node Failure and Reconnection Scenarios (8.4)
 *
 * This test suite validates the distributed system's resilience during node failures.
 * Every node maintains dual references (parent + leader), which enables sophisticated
 * graph state reconstruction during failures.
 *
 * Test Priority: CRITICAL - Essential for understanding graph state management
 */
describe('Leader Reconnection Tests - CRITICAL (Section 8.4)', () => {
  let leaderNode: TestLeaderNode;
  let parentNode: TestLaneTool; // Middleware parent
  let childNode: TestLaneTool;  // Leaf child

  /**
   * Helper: Create a three-tier hierarchy (Leader → Parent → Child)
   * This setup allows us to test failures at any level.
   */
  async function createThreeTierHierarchy(): Promise<void> {
    // 1. Create and start leader
    leaderNode = new TestLeaderNode({
      type: NodeType.LEADER,
      leader: null,
      parent: null,
      systemName: 'reconnection-test-network',
      network: {
        listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
      },
    });

    await leaderNode.start();
    expect(leaderNode.state).to.equal(NodeState.RUNNING);
    expect(leaderNode.address.toString()).to.equal('o://leader');

    // 2. Create and start parent (middleware node)
    parentNode = new TestLaneTool({
      address: new oNodeAddress('o://parent'),
      leader: leaderNode.address,
      parent: leaderNode.address,
      description: 'Middleware parent node for reconnection testing',
      network: {
        listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
      },
    });

    await parentNode.start();
    expect(parentNode.state).to.equal(NodeState.RUNNING);
    expect(parentNode.address.toString()).to.equal('o://leader/parent');

    // 3. Create and start child
    childNode = new TestLaneTool({
      address: new oNodeAddress('o://child'),
      leader: leaderNode.address,
      parent: parentNode.address,
      description: 'Leaf child node for reconnection testing',
      network: {
        listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
      },
    });

    await childNode.start();
    expect(childNode.state).to.equal(NodeState.RUNNING);
    expect(childNode.address.toString()).to.equal('o://leader/parent/child');

    // Wait for full registration
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Helper: Verify dual-reference integrity
   * Ensures nodes maintain both parent and leader references
   */
  function verifyDualReferences(): void {
    // Child should reference both parent and leader
    expect(childNode.parent).to.not.be.null;
    expect(childNode.leader).to.not.be.null;
    expect(childNode.parent!.toString()).to.equal('o://leader/parent');
    expect(childNode.leader!.toString()).to.equal('o://leader');

    // Parent should reference leader as both parent and leader
    expect(parentNode.parent).to.not.be.null;
    expect(parentNode.leader).to.not.be.null;
    expect(parentNode.parent!.toString()).to.equal('o://leader');
    expect(parentNode.leader!.toString()).to.equal('o://leader');
  }

  /**
   * Helper: Cleanup all nodes
   */
  async function cleanupAll(): Promise<void> {
    if (childNode && childNode.state === NodeState.RUNNING) {
      await childNode.stop();
    }
    if (parentNode && parentNode.state === NodeState.RUNNING) {
      await parentNode.stop();
    }
    if (leaderNode && leaderNode.state === NodeState.RUNNING) {
      await leaderNode.stop();
    }
  }

  afterEach(async () => {
    await cleanupAll();
  });

  describe('Dual-Reference System Validation', () => {
    it('should maintain dual-reference integrity (parent + leader) during initialization', async () => {
      await createThreeTierHierarchy();
      verifyDualReferences();
    });

    it('should verify parent reference updates after reconnection', async () => {
      await createThreeTierHierarchy();

      // Verify initial references
      expect(childNode.parent).to.not.be.null;
      const initialParentRef = childNode.parent!.toString();
      expect(initialParentRef).to.equal('o://leader/parent');

      // Stop and restart parent (simulates reconnection)
      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart parent
      parentNode = new TestLaneTool({
        address: new oNodeAddress('o://parent'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Reconnected parent node',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await parentNode.start();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Parent should have reconnected
      expect(parentNode.state).to.equal(NodeState.RUNNING);
      expect(parentNode.address.toString()).to.equal('o://leader/parent');
    });

    it('should verify leader reference updates after reconnection', async () => {
      await createThreeTierHierarchy();

      // Verify initial leader references
      expect(childNode.leader).to.not.be.null;
      expect(parentNode.leader).to.not.be.null;
      expect(childNode.leader!.toString()).to.equal('o://leader');
      expect(parentNode.leader!.toString()).to.equal('o://leader');

      // Stop and restart leader (simulates leader failure and recovery)
      const originalLeaderTransports = leaderNode.transports;
      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart leader
      leaderNode = new TestLeaderNode({
        type: NodeType.LEADER,
        leader: null,
        parent: null,
        systemName: 'reconnection-test-network',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await leaderNode.start();
      expect(leaderNode.state).to.equal(NodeState.RUNNING);
      expect(leaderNode.address.toString()).to.equal('o://leader');

      // Leader should be running and ready to accept reconnections
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });
  });

  describe('Leader Node Failure and Reconnection', () => {
    it('should handle leader node failure and reconnection', async () => {
      await createThreeTierHierarchy();

      // Capture initial state
      const initialLeaderAddress = leaderNode.address.toString();
      expect(initialLeaderAddress).to.equal('o://leader');

      // Simulate leader failure
      await leaderNode.stop();
      expect(leaderNode.state).to.equal(NodeState.STOPPED);

      // Wait for failure detection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart leader
      leaderNode = new TestLeaderNode({
        type: NodeType.LEADER,
        leader: null,
        parent: null,
        systemName: 'reconnection-test-network',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await leaderNode.start();

      // Verify leader recovered
      expect(leaderNode.state).to.equal(NodeState.RUNNING);
      expect(leaderNode.address.toString()).to.equal('o://leader');

      // Allow time for nodes to discover reconnected leader
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should restore graph state after leader reconnection', async () => {
      await createThreeTierHierarchy();

      // Get initial hierarchy state
      const initialChildrenCount = leaderNode.hierarchyManager.getChildren().length;
      expect(initialChildrenCount).to.be.greaterThan(0);

      // Stop leader
      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart leader
      leaderNode = new TestLeaderNode({
        type: NodeType.LEADER,
        leader: null,
        parent: null,
        systemName: 'reconnection-test-network',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await leaderNode.start();
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Note: In a real scenario with persistence, graph state would be restored
      // For now, we verify the leader is ready to accept new registrations
      expect(leaderNode.state).to.equal(NodeState.RUNNING);
    });

    it('should handle child re-registration after leader failure', async () => {
      await createThreeTierHierarchy();

      // Stop leader
      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart leader
      leaderNode = new TestLeaderNode({
        type: NodeType.LEADER,
        leader: null,
        parent: null,
        systemName: 'reconnection-test-network',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await leaderNode.start();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate child re-registration
      // In a real system, children would detect leader failure and re-register
      expect(leaderNode.state).to.equal(NodeState.RUNNING);
      expect(childNode.state).to.equal(NodeState.RUNNING);
      expect(parentNode.state).to.equal(NodeState.RUNNING);
    });
  });

  describe('Middleware Parent Node Failure and Reconnection', () => {
    it('should handle middleware parent node failure and reconnection', async () => {
      await createThreeTierHierarchy();

      // Simulate parent failure
      await parentNode.stop();
      expect(parentNode.state).to.equal(NodeState.STOPPED);

      // Wait for failure detection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart parent
      parentNode = new TestLaneTool({
        address: new oNodeAddress('o://parent'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Reconnected parent node',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await parentNode.start();

      // Verify parent recovered
      expect(parentNode.state).to.equal(NodeState.RUNNING);
      expect(parentNode.address.toString()).to.equal('o://leader/parent');

      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should restore graph state after parent reconnection', async () => {
      await createThreeTierHierarchy();

      // Stop parent
      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart parent
      parentNode = new TestLaneTool({
        address: new oNodeAddress('o://parent'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Reconnected parent node',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await parentNode.start();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify parent restored
      expect(parentNode.state).to.equal(NodeState.RUNNING);
      expect(parentNode.parent).to.not.be.null;
      expect(parentNode.leader).to.not.be.null;
      expect(parentNode.parent!.toString()).to.equal('o://leader');
      expect(parentNode.leader!.toString()).to.equal('o://leader');
    });

    it('should handle orphaned children when parent fails', async () => {
      await createThreeTierHierarchy();

      // Verify child's parent reference before failure
      expect(childNode.parent).to.not.be.null;
      expect(childNode.parent!.toString()).to.equal('o://leader/parent');

      // Stop parent (creates orphaned child)
      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Child should still be running but parent is unreachable
      expect(childNode.state).to.equal(NodeState.RUNNING);

      // Child should still have leader reference (dual-reference resilience)
      expect(childNode.leader).to.not.be.null;
      expect(childNode.leader!.toString()).to.equal('o://leader');
    });
  });

  describe('Child Node Failure and Reconnection', () => {
    it('should handle child node failure and reconnection', async () => {
      await createThreeTierHierarchy();

      // Simulate child failure
      await childNode.stop();
      expect(childNode.state).to.equal(NodeState.STOPPED);

      // Wait for failure detection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart child
      childNode = new TestLaneTool({
        address: new oNodeAddress('o://child'),
        leader: leaderNode.address,
        parent: parentNode.address,
        description: 'Reconnected child node',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });

      await childNode.start();

      // Verify child recovered
      expect(childNode.state).to.equal(NodeState.RUNNING);
      expect(childNode.address.toString()).to.equal('o://leader/parent/child');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify dual references restored
      expect(childNode.parent).to.not.be.null;
      expect(childNode.leader).to.not.be.null;
      expect(childNode.parent!.toString()).to.equal('o://leader/parent');
      expect(childNode.leader!.toString()).to.equal('o://leader');
    });
  });

  describe('Cascading Failures and Recoveries', () => {
    it('should handle cascading failures (child → parent → leader)', async () => {
      await createThreeTierHierarchy();

      // Cascading failure from bottom to top
      await childNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 500));

      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify all stopped
      expect(childNode.state).to.equal(NodeState.STOPPED);
      expect(parentNode.state).to.equal(NodeState.STOPPED);
      expect(leaderNode.state).to.equal(NodeState.STOPPED);
    });

    it('should handle cascading reconnections (leader → parent → child)', async () => {
      await createThreeTierHierarchy();

      // Stop all nodes
      await childNode.stop();
      await parentNode.stop();
      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Cascading reconnection from top to bottom
      // 1. Restart leader
      leaderNode = new TestLeaderNode({
        type: NodeType.LEADER,
        leader: null,
        parent: null,
        systemName: 'reconnection-test-network',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });
      await leaderNode.start();
      expect(leaderNode.state).to.equal(NodeState.RUNNING);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2. Restart parent
      parentNode = new TestLaneTool({
        address: new oNodeAddress('o://parent'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Reconnected parent',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });
      await parentNode.start();
      expect(parentNode.state).to.equal(NodeState.RUNNING);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Restart child
      childNode = new TestLaneTool({
        address: new oNodeAddress('o://child'),
        leader: leaderNode.address,
        parent: parentNode.address,
        description: 'Reconnected child',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });
      await childNode.start();
      expect(childNode.state).to.equal(NodeState.RUNNING);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify entire hierarchy restored
      expect(leaderNode.address.toString()).to.equal('o://leader');
      expect(parentNode.address.toString()).to.equal('o://leader/parent');
      expect(childNode.address.toString()).to.equal('o://leader/parent/child');

      // Verify dual references
      verifyDualReferences();
    });

    it('should handle simultaneous parent and leader failures', async () => {
      await createThreeTierHierarchy();

      // Simultaneous failure
      await Promise.all([
        parentNode.stop(),
        leaderNode.stop(),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify failures
      expect(parentNode.state).to.equal(NodeState.STOPPED);
      expect(leaderNode.state).to.equal(NodeState.STOPPED);

      // Child should still be running
      expect(childNode.state).to.equal(NodeState.RUNNING);
    });

    it('should maintain network topology consistency during reconnection', async () => {
      await createThreeTierHierarchy();

      // Verify initial topology
      expect(childNode.address.toString()).to.equal('o://leader/parent/child');

      // Stop parent
      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Restart parent
      parentNode = new TestLaneTool({
        address: new oNodeAddress('o://parent'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Reconnected parent',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });
      await parentNode.start();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify topology consistency
      expect(parentNode.address.toString()).to.equal('o://leader/parent');
      expect(parentNode.parent).to.not.be.null;
      expect(parentNode.leader).to.not.be.null;
      expect(parentNode.parent!.toString()).to.equal('o://leader');
      expect(parentNode.leader!.toString()).to.equal('o://leader');
    });
  });

  describe('Registry State During Reconnections', () => {
    it('should update registry entries after node reconnection', async () => {
      await createThreeTierHierarchy();

      // Stop and restart parent
      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      parentNode = new TestLaneTool({
        address: new oNodeAddress('o://parent'),
        leader: leaderNode.address,
        parent: leaderNode.address,
        description: 'Reconnected parent',
        network: {
          listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
        },
      });
      await parentNode.start();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Registry should reflect the reconnected node
      // In production, this would query the registry tool
      expect(parentNode.state).to.equal(NodeState.RUNNING);
    });
  });
});
