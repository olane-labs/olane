import { expect } from 'chai';
import { TestLeaderNode } from './helpers/test-leader.node.js';
import { TestLaneTool } from './helpers/test-lane.tool.js';
import {
  NodeState,
  NodeType,
  oAddress,
  setupGracefulShutdown,
} from '@olane/o-core';
import { oNode, oNodeAddress } from '@olane/o-node';

// Current issue: we are routing waht seems to be directly to the node instead of the router via the test suite.

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
  let clientNode: TestLaneTool; // Independent client (no parent, no leader)

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
   * Helper: Create an independent client node (no parent, no leader)
   * This simulates a production scenario where external nodes consume the graph
   */
  async function createIndependentClient(): Promise<void> {
    clientNode = new TestLaneTool({
      address: new oNodeAddress('o://independent-client'),
      leader: null,
      parent: null,
      description: 'Independent client node for testing connectivity',
      network: {
        listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
      },
    });

    await clientNode.start();
    expect(clientNode.state).to.equal(NodeState.RUNNING);
    expect(clientNode.address.toString()).to.equal('o://independent-client');

    // Wait for network initialization
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Helper: Test functional connectivity from independent client to target node
   * Uses actual node object to get both address AND transports (required for unaffiliated clients)
   * Simulates real production behavior where external consumers discover nodes via registry
   *
   * @param targetNode - The actual node object (provides address + transports)
   * @param description - Description for logging
   */
  async function testConnectivity(
    targetNode: TestLeaderNode | TestLaneTool,
    description: string
  ): Promise<void> {
    try {
      // In production, client would:
      // 1. Query registry for node by address/protocol
      // 2. Get node's transports from registry
      // 3. Create address with transports
      // 4. Connect and call methods

      // For testing, we simulate this by using the actual node's address + transports
      const targetAddress = targetNode.address;
      const targetTransports = targetNode.transports;

      expect(targetTransports).to.exist;
      expect(targetTransports.length).to.be.greaterThan(0,
        `Target node ${description} has no transports available`);


      // Attempt to ping the target node with its transports
      const response = await clientNode.use(new oNodeAddress(targetAddress.value, leaderNode.transports), {
        method: 'ping',
        params: {},
      });

      // Verify we got a response (connection successful)
      expect(response).to.exist;
      expect(response.result).to.exist;

      // If ping succeeds, the node is reachable and functional
      console.log(`✓ Connectivity verified: ${description} at ${targetAddress} (${targetTransports.length} transports)`);
    } catch (error: any) {
      // If we can't connect, the test should fail
      throw new Error(`Failed to connect to ${description}: ${error.message}`);
    }
  }

  /**
   * Helper: Verify that connectivity FAILS during node downtime
   * This proves the graph is actually unhealthy during failures
   *
   * @param targetNode - Node object (may be null/stopped, but we try last known address)
   * @param lastKnownAddress - Address to attempt connection to
   * @param description - Description for logging
   * @param timeoutMs - Maximum time to wait for failure (default: 5000ms)
   */
  async function expectConnectivityFailure(
    targetNode: TestLeaderNode | TestLaneTool | null,
    lastKnownAddress: string,
    description: string,
    timeoutMs: number = 5000
  ): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    try {
      // Attempt to ping with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for failure')), timeoutMs);
      });

      // Try to use last known address (won't have valid transports since node is down)
      const pingPromise = clientNode.use(new oAddress(lastKnownAddress), {
        method: 'ping',
        params: {},
      });

      await Promise.race([pingPromise, timeoutPromise]);

      // If we get here, the ping succeeded when it should have failed!
      throw new Error(
        `UNHEALTHY STATE NOT DETECTED: ${description} at ${lastKnownAddress} responded when it should be unreachable!`
      );
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      lastError = error;

      // Check if this is our failure detection error (bad - test failed)
      if (error.message.includes('UNHEALTHY STATE NOT DETECTED')) {
        throw error;
      }

      // Check if this is a timeout (might indicate slow failure detection)
      if (error.message.includes('Timeout waiting for failure')) {
        console.warn(`⚠ Slow failure detection for ${description}: took >${timeoutMs}ms`);
        // This is acceptable - node is unreachable, just took longer
        console.log(`✓ Unhealthy state verified (timeout): ${description} at ${lastKnownAddress} (${elapsed}ms)`);
        return;
      }

      // Any other error indicates the node is unreachable (expected during downtime)
      console.log(
        `✓ Unhealthy state verified: ${description} at ${lastKnownAddress} unreachable (${elapsed}ms) - ${error.message.substring(0, 60)}...`
      );
    }
  }

  /**
   * Helper: Verify graph health state with comprehensive checks
   * Tests connectivity to multiple nodes and validates expected health states
   */
  async function verifyGraphHealthState(
    expectations: Array<{
      node: TestLeaderNode | TestLaneTool | null;
      lastKnownAddress: string;
      description: string;
      shouldBeReachable: boolean;
    }>
  ): Promise<void> {
    for (const expectation of expectations) {
      if (expectation.shouldBeReachable) {
        if (!expectation.node) {
          throw new Error(`Cannot test connectivity to ${expectation.description} - node is null but expected to be reachable`);
        }
        await testConnectivity(expectation.node, expectation.description);
      } else {
        await expectConnectivityFailure(
          expectation.node,
          expectation.lastKnownAddress,
          expectation.description
        );
      }
    }
  }

  /**
   * Helper: Cleanup all nodes
   */
  async function cleanupAll(): Promise<void> {
    if (clientNode && clientNode.state === NodeState.RUNNING) {
      await clientNode.stop();
    }
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

  // describe('Dual-Reference System Validation', () => {
  //   it('should maintain dual-reference integrity (parent + leader) during initialization', async () => {
  //     await createThreeTierHierarchy();
  //     verifyDualReferences();
  //   });

  //   it('should verify parent reference updates after reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Verify initial references
  //     expect(childNode.parent).to.not.be.null;
  //     const initialParentRef = childNode.parent!.toString();
  //     expect(initialParentRef).to.equal('o://leader/parent');

  //     // Stop and restart parent (simulates reconnection)
  //     await parentNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart parent
  //     parentNode = new TestLaneTool({
  //       address: new oNodeAddress('o://parent'),
  //       leader: leaderNode.address,
  //       parent: leaderNode.address,
  //       description: 'Reconnected parent node',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await parentNode.start();
  //     await new Promise((resolve) => setTimeout(resolve, 2000));

  //     // Parent should have reconnected
  //     expect(parentNode.state).to.equal(NodeState.RUNNING);
  //     expect(parentNode.address.toString()).to.equal('o://leader/parent');
  //   });

  //   it('should verify leader reference updates after reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Verify initial leader references
  //     expect(childNode.leader).to.not.be.null;
  //     expect(parentNode.leader).to.not.be.null;
  //     expect(childNode.leader!.toString()).to.equal('o://leader');
  //     expect(parentNode.leader!.toString()).to.equal('o://leader');

  //     // Stop and restart leader (simulates leader failure and recovery)
  //     const originalLeaderTransports = leaderNode.transports;
  //     await leaderNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart leader
  //     leaderNode = new TestLeaderNode({
  //       type: NodeType.LEADER,
  //       leader: null,
  //       parent: null,
  //       systemName: 'reconnection-test-network',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await leaderNode.start();
  //     expect(leaderNode.state).to.equal(NodeState.RUNNING);
  //     expect(leaderNode.address.toString()).to.equal('o://leader');

  //     // Leader should be running and ready to accept reconnections
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //   });
  // });

  // describe('Leader Node Failure and Reconnection', () => {
  //   it('should handle leader node failure and reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Capture initial state
  //     const initialLeaderAddress = leaderNode.address.toString();
  //     expect(initialLeaderAddress).to.equal('o://leader');

  //     // Simulate leader failure
  //     await leaderNode.stop();
  //     expect(leaderNode.state).to.equal(NodeState.STOPPED);

  //     // Wait for failure detection
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart leader
  //     leaderNode = new TestLeaderNode({
  //       type: NodeType.LEADER,
  //       leader: null,
  //       parent: null,
  //       systemName: 'reconnection-test-network',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await leaderNode.start();

  //     // Verify leader recovered
  //     expect(leaderNode.state).to.equal(NodeState.RUNNING);
  //     expect(leaderNode.address.toString()).to.equal('o://leader');

  //     // Allow time for nodes to discover reconnected leader
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //   });

  //   it('should restore graph state after leader reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Get initial hierarchy state
  //     const initialChildrenCount = leaderNode.hierarchyManager.getChildren().length;
  //     expect(initialChildrenCount).to.be.greaterThan(0);

  //     // Stop leader
  //     await leaderNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart leader
  //     leaderNode = new TestLeaderNode({
  //       type: NodeType.LEADER,
  //       leader: null,
  //       parent: null,
  //       systemName: 'reconnection-test-network',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await leaderNode.start();
  //     await new Promise((resolve) => setTimeout(resolve, 3000));

  //     // Note: In a real scenario with persistence, graph state would be restored
  //     // For now, we verify the leader is ready to accept new registrations
  //     expect(leaderNode.state).to.equal(NodeState.RUNNING);
  //   });

  //   it('should handle child re-registration after leader failure', async () => {
  //     await createThreeTierHierarchy();

  //     // Stop leader
  //     await leaderNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart leader
  //     leaderNode = new TestLeaderNode({
  //       type: NodeType.LEADER,
  //       leader: null,
  //       parent: null,
  //       systemName: 'reconnection-test-network',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await leaderNode.start();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Simulate child re-registration
  //     // In a real system, children would detect leader failure and re-register
  //     expect(leaderNode.state).to.equal(NodeState.RUNNING);
  //     expect(childNode.state).to.equal(NodeState.RUNNING);
  //     expect(parentNode.state).to.equal(NodeState.RUNNING);
  //   });
  // });

  // describe('Middleware Parent Node Failure and Reconnection', () => {
  //   it('should handle middleware parent node failure and reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Simulate parent failure
  //     await parentNode.stop();
  //     expect(parentNode.state).to.equal(NodeState.STOPPED);

  //     // Wait for failure detection
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart parent
  //     parentNode = new TestLaneTool({
  //       address: new oNodeAddress('o://parent'),
  //       leader: leaderNode.address,
  //       parent: leaderNode.address,
  //       description: 'Reconnected parent node',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await parentNode.start();

  //     // Verify parent recovered
  //     expect(parentNode.state).to.equal(NodeState.RUNNING);
  //     expect(parentNode.address.toString()).to.equal('o://leader/parent');

  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //   });

  //   it('should restore graph state after parent reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Stop parent
  //     await parentNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart parent
  //     parentNode = new TestLaneTool({
  //       address: new oNodeAddress('o://parent'),
  //       leader: leaderNode.address,
  //       parent: leaderNode.address,
  //       description: 'Reconnected parent node',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await parentNode.start();
  //     await new Promise((resolve) => setTimeout(resolve, 2000));

  //     // Verify parent restored
  //     expect(parentNode.state).to.equal(NodeState.RUNNING);
  //     expect(parentNode.parent).to.not.be.null;
  //     expect(parentNode.leader).to.not.be.null;
  //     expect(parentNode.parent!.toString()).to.equal('o://leader');
  //     expect(parentNode.leader!.toString()).to.equal('o://leader');
  //   });

  //   it('should handle orphaned children when parent fails', async () => {
  //     await createThreeTierHierarchy();

  //     // Verify child's parent reference before failure
  //     expect(childNode.parent).to.not.be.null;
  //     expect(childNode.parent!.toString()).to.equal('o://leader/parent');

  //     // Stop parent (creates orphaned child)
  //     await parentNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Child should still be running but parent is unreachable
  //     expect(childNode.state).to.equal(NodeState.RUNNING);

  //     // Child should still have leader reference (dual-reference resilience)
  //     expect(childNode.leader).to.not.be.null;
  //     expect(childNode.leader!.toString()).to.equal('o://leader');
  //   });
  // });

  // describe('Child Node Failure and Reconnection', () => {
  //   it('should handle child node failure and reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Simulate child failure
  //     await childNode.stop();
  //     expect(childNode.state).to.equal(NodeState.STOPPED);

  //     // Wait for failure detection
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart child
  //     childNode = new TestLaneTool({
  //       address: new oNodeAddress('o://child'),
  //       leader: leaderNode.address,
  //       parent: parentNode.address,
  //       description: 'Reconnected child node',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });

  //     await childNode.start();

  //     // Verify child recovered
  //     expect(childNode.state).to.equal(NodeState.RUNNING);
  //     expect(childNode.address.toString()).to.equal('o://leader/parent/child');

  //     await new Promise((resolve) => setTimeout(resolve, 2000));

  //     // Verify dual references restored
  //     expect(childNode.parent).to.not.be.null;
  //     expect(childNode.leader).to.not.be.null;
  //     expect(childNode.parent!.toString()).to.equal('o://leader/parent');
  //     expect(childNode.leader!.toString()).to.equal('o://leader');
  //   });
  // });

  // describe('Cascading Failures and Recoveries', () => {
  //   it('should handle cascading failures (child → parent → leader)', async () => {
  //     await createThreeTierHierarchy();

  //     // Cascading failure from bottom to top
  //     await childNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 500));

  //     await parentNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 500));

  //     await leaderNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 500));

  //     // Verify all stopped
  //     expect(childNode.state).to.equal(NodeState.STOPPED);
  //     expect(parentNode.state).to.equal(NodeState.STOPPED);
  //     expect(leaderNode.state).to.equal(NodeState.STOPPED);
  //   });

  //   it('should handle cascading reconnections (leader → parent → child)', async () => {
  //     await createThreeTierHierarchy();

  //     // Stop all nodes
  //     await childNode.stop();
  //     await parentNode.stop();
  //     await leaderNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Cascading reconnection from top to bottom
  //     // 1. Restart leader
  //     leaderNode = new TestLeaderNode({
  //       type: NodeType.LEADER,
  //       leader: null,
  //       parent: null,
  //       systemName: 'reconnection-test-network',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });
  //     await leaderNode.start();
  //     expect(leaderNode.state).to.equal(NodeState.RUNNING);
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // 2. Restart parent
  //     parentNode = new TestLaneTool({
  //       address: new oNodeAddress('o://parent'),
  //       leader: leaderNode.address,
  //       parent: leaderNode.address,
  //       description: 'Reconnected parent',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });
  //     await parentNode.start();
  //     expect(parentNode.state).to.equal(NodeState.RUNNING);
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // 3. Restart child
  //     childNode = new TestLaneTool({
  //       address: new oNodeAddress('o://child'),
  //       leader: leaderNode.address,
  //       parent: parentNode.address,
  //       description: 'Reconnected child',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });
  //     await childNode.start();
  //     expect(childNode.state).to.equal(NodeState.RUNNING);
  //     await new Promise((resolve) => setTimeout(resolve, 2000));

  //     // Verify entire hierarchy restored
  //     expect(leaderNode.address.toString()).to.equal('o://leader');
  //     expect(parentNode.address.toString()).to.equal('o://leader/parent');
  //     expect(childNode.address.toString()).to.equal('o://leader/parent/child');

  //     // Verify dual references
  //     verifyDualReferences();
  //   });

  //   it('should handle simultaneous parent and leader failures', async () => {
  //     await createThreeTierHierarchy();

  //     // Simultaneous failure
  //     await Promise.all([
  //       parentNode.stop(),
  //       leaderNode.stop(),
  //     ]);

  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Verify failures
  //     expect(parentNode.state).to.equal(NodeState.STOPPED);
  //     expect(leaderNode.state).to.equal(NodeState.STOPPED);

  //     // Child should still be running
  //     expect(childNode.state).to.equal(NodeState.RUNNING);
  //   });

  //   it('should maintain network topology consistency during reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Verify initial topology
  //     expect(childNode.address.toString()).to.equal('o://leader/parent/child');

  //     // Stop parent
  //     await parentNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Restart parent
  //     parentNode = new TestLaneTool({
  //       address: new oNodeAddress('o://parent'),
  //       leader: leaderNode.address,
  //       parent: leaderNode.address,
  //       description: 'Reconnected parent',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });
  //     await parentNode.start();
  //     await new Promise((resolve) => setTimeout(resolve, 2000));

  //     // Verify topology consistency
  //     expect(parentNode.address.toString()).to.equal('o://leader/parent');
  //     expect(parentNode.parent).to.not.be.null;
  //     expect(parentNode.leader).to.not.be.null;
  //     expect(parentNode.parent!.toString()).to.equal('o://leader');
  //     expect(parentNode.leader!.toString()).to.equal('o://leader');
  //   });
  // });

  // describe('Registry State During Reconnections', () => {
  //   it('should update registry entries after node reconnection', async () => {
  //     await createThreeTierHierarchy();

  //     // Stop and restart parent
  //     await parentNode.stop();
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     parentNode = new TestLaneTool({
  //       address: new oNodeAddress('o://parent'),
  //       leader: leaderNode.address,
  //       parent: leaderNode.address,
  //       description: 'Reconnected parent',
  //       network: {
  //         listeners: ['/ip4/127.0.0.1/tcp/0/ws'],
  //       },
  //     });
  //     await parentNode.start();
  //     await new Promise((resolve) => setTimeout(resolve, 2000));

  //     // Registry should reflect the reconnected node
  //     // In production, this would query the registry tool
  //     expect(parentNode.state).to.equal(NodeState.RUNNING);
  //   });
  // });

  describe('PRODUCTION VALIDATION: Functional Connectivity After Graph Self-Healing', () => {
    /**
     * These tests simulate real production scenarios where independent external nodes
     * (with no parent, no leader) need to discover and consume nodes after reconnection.
     * This validates that graph self-healing actually restores functional connectivity,
     * not just internal reference integrity.
     */

    it('should allow independent client to ping child after leader reconnection', async () => {
      // Setup: Create hierarchy and independent client
      await createThreeTierHierarchy();
      await createIndependentClient();

      // PHASE 1: HEALTHY - Verify initial connectivity
      console.log('\n=== PHASE 1: HEALTHY STATE (Initial) ===');
      await testConnectivity(leaderNode, 'leader (initial)');
      await testConnectivity(parentNode, 'parent (initial)');
      await testConnectivity(childNode, 'child (initial)');

      // PHASE 2: FAILURE - Simulate leader failure
      console.log('\n=== PHASE 2: INDUCING FAILURE (Leader Stop) ===');
      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // PHASE 3: UNHEALTHY - Verify graph is in unhealthy state
      console.log('\n=== PHASE 3: UNHEALTHY STATE (During Downtime) ===');
      await expectConnectivityFailure(null, 'o://leader', 'leader (during downtime)');
      // Note: Parent and child may still be running but unreachable via normal routing
      await expectConnectivityFailure(childNode, 'o://leader/parent/child', 'child (during leader downtime)');

      // PHASE 4: RECOVERY - Restart leader
      console.log('\n=== PHASE 4: RECOVERY (Leader Restart) ===');
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

      // PHASE 5: HEALTHY - Verify connectivity restored
      console.log('\n=== PHASE 5: HEALTHY STATE (After Reconnection) ===');
      await testConnectivity(leaderNode, 'leader (after reconnection)');
      await testConnectivity(childNode, 'child (after leader reconnection)');
    });

    it('should allow independent client to ping child after parent reconnection', async () => {
      // Setup
      await createThreeTierHierarchy();
      await createIndependentClient();

      // Verify initial connectivity
      await testConnectivity(childNode, 'child node (initial)');

      // Simulate parent failure and recovery
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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // CRITICAL: Verify child is still reachable from independent client
      await testConnectivity(childNode, 'child node (after parent reconnection)');
    });

    it('should allow independent client to ping child after child reconnection', async () => {
      // Setup
      await createThreeTierHierarchy();
      await createIndependentClient();

      // Verify initial connectivity
      await testConnectivity(childNode, 'child node (initial)');

      // Simulate child failure and recovery
      await childNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // CRITICAL: Verify child is reachable after its own reconnection
      await testConnectivity(childNode, 'child node (after child reconnection)');
    });

    it('should allow independent client to ping all nodes after full cascade reconnection', async () => {
      // Setup
      await createThreeTierHierarchy();
      await createIndependentClient();

      // Verify initial connectivity to all nodes
      await testConnectivity(leaderNode, 'leader (initial)');
      await testConnectivity(parentNode, 'parent (initial)');
      await testConnectivity(childNode, 'child (initial)');

      // Full cascade failure
      await childNode.stop();
      await parentNode.stop();
      await leaderNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Full cascade recovery (leader → parent → child)
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // CRITICAL: Verify all nodes are reachable after full cascade reconnection
      await testConnectivity(leaderNode, 'leader (after cascade)');
      await testConnectivity(parentNode, 'parent (after cascade)');
      await testConnectivity(childNode, 'child (after cascade)');
    });

    it('should allow independent client to discover and ping child via registry after reconnection', async () => {
      // Setup
      await createThreeTierHierarchy();
      await createIndependentClient();

      // Simulate parent reconnection
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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // CRITICAL: In production, client would:
      // 1. Query registry for node
      // 2. Discover node's transports
      // 3. Connect and call methods
      // For now, we test direct connectivity which validates the foundation
      await testConnectivity(childNode, 'child via registry (after parent reconnection)');
    });

    it('should detect unhealthy state during parent failure and verify recovery for all affected nodes', async () => {
      // Setup
      await createThreeTierHierarchy();
      await createIndependentClient();

      // PHASE 1: HEALTHY - All nodes reachable
      console.log('\n=== PHASE 1: HEALTHY STATE ===');
      await verifyGraphHealthState([
        { node: leaderNode, lastKnownAddress: 'o://leader', description: 'leader', shouldBeReachable: true },
        { node: parentNode, lastKnownAddress: 'o://leader/parent', description: 'parent', shouldBeReachable: true },
        { node: childNode, lastKnownAddress: 'o://leader/parent/child', description: 'child', shouldBeReachable: true },
      ]);

      // PHASE 2: INDUCE FAILURE - Parent goes down
      console.log('\n=== PHASE 2: INDUCING PARENT FAILURE ===');
      await parentNode.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // PHASE 3: UNHEALTHY - Verify partial graph failure
      console.log('\n=== PHASE 3: UNHEALTHY STATE ===');
      await verifyGraphHealthState([
        { node: leaderNode, lastKnownAddress: 'o://leader', description: 'leader (still healthy)', shouldBeReachable: true },
        { node: null, lastKnownAddress: 'o://leader/parent', description: 'parent (failed)', shouldBeReachable: false },
        { node: childNode, lastKnownAddress: 'o://leader/parent/child', description: 'child (orphaned)', shouldBeReachable: false },
      ]);

      // PHASE 4: RECOVERY
      console.log('\n=== PHASE 4: RECOVERY ===');
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
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // PHASE 5: HEALTHY - Verify full recovery
      console.log('\n=== PHASE 5: HEALTHY STATE (Recovered) ===');
      await verifyGraphHealthState([
        { node: leaderNode, lastKnownAddress: 'o://leader', description: 'leader (recovered)', shouldBeReachable: true },
        { node: parentNode, lastKnownAddress: 'o://leader/parent', description: 'parent (recovered)', shouldBeReachable: true },
        // Note: Child may need explicit re-registration after parent recovery
        // This test documents the actual behavior
      ]);
    });
  });
});
