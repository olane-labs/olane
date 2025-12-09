/**
 * TestEnvironment - Core test setup and lifecycle management for O-Network nodes
 *
 * Provides automatic cleanup, node factories, and common test utilities
 * to eliminate boilerplate in O-Network package tests.
 *
 * @example
 * ```typescript
 * describe('MyTool', () => {
 *   const env = new TestEnvironment();
 *
 *   afterEach(async () => {
 *     await env.cleanup();
 *   });
 *
 *   it('should work', async () => {
 *     const { leader, tool } = await env.createToolWithLeader(MyTool);
 *     expect(tool.state).to.equal(NodeState.RUNNING);
 *   });
 * });
 * ```
 */

import { NodeState } from '@olane/o-core';
import type { oNode, oNodeAddress } from '@olane/o-node';

/**
 * Node configuration for test environment
 */
export interface TestNodeConfig {
  address?: oNodeAddress;
  leader?: oNodeAddress | null;
  parent?: oNodeAddress | null;
  description?: string;
  [key: string]: any;
}

/**
 * Options for creating leader nodes
 */
export interface LeaderNodeOptions {
  address?: oNodeAddress;
  description?: string;
  autoStart?: boolean;
}

/**
 * Result of creating a tool with leader
 */
export interface ToolWithLeaderResult<T = any> {
  leader: any;
  tool: T;
}

/**
 * Core test environment class for O-Network testing
 *
 * Manages node lifecycle, automatic cleanup, and provides
 * factory methods for common test scenarios.
 */
export class TestEnvironment {
  private nodes: oNode[] = [];
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  /**
   * Create a leader node for testing
   *
   * @param LeaderClass - Leader node class (e.g., oLeaderNode)
   * @param options - Configuration options
   * @returns Started leader node instance
   *
   * @example
   * ```typescript
   * const leader = await env.createLeader(oLeaderNode);
   * ```
   */
  async createLeader<T extends oNode>(
    LeaderClass: new (config: any) => T,
    options: LeaderNodeOptions = {},
  ): Promise<T> {
    const { autoStart = true, ...config } = options;

    const leader = new LeaderClass({
      parent: null,
      leader: null,
      ...config,
    });

    this.track(leader);

    if (autoStart) {
      await leader.start();
    }

    return leader;
  }

  /**
   * Create a tool with a leader node
   *
   * Automatically handles:
   * - Leader creation and startup
   * - Tool creation with parent/leader references
   * - Hook injection for child registration
   * - Lifecycle tracking for cleanup
   *
   * @param ToolClass - Tool class to instantiate
   * @param config - Tool configuration
   * @param LeaderClass - Leader class (defaults to oLeaderNode if available)
   * @returns Object with leader and tool instances
   *
   * @example
   * ```typescript
   * const { leader, tool } = await env.createToolWithLeader(MyTool, {
   *   apiKey: 'test-key'
   * });
   * ```
   */
  async createToolWithLeader<T extends oNode>(
    ToolClass: new (config: any) => T,
    config: TestNodeConfig = {},
    LeaderClass?: new (config: any) => any,
  ): Promise<ToolWithLeaderResult<T>> {
    // Dynamic import to avoid circular dependency
    let leader: any;

    if (LeaderClass) {
      leader = await this.createLeader(LeaderClass);
    } else {
      // Try to import oLeaderNode dynamically
      try {
        const { oLeaderNode } = await import('@olane/o-leader');
        leader = await this.createLeader(oLeaderNode);
      } catch (error) {
        throw new Error(
          'LeaderClass not provided and @olane/o-leader not available. ' +
            'Please provide LeaderClass explicitly.',
        );
      }
    }

    const tool = new ToolClass({
      ...config,
      parent: leader.address,
      leader: leader.address,
    });

    // Inject hook for parent-child registration
    (tool as any).onInitFinished(() => {
      leader.addChildNode(tool);
    });

    this.track(tool);
    await tool.start();

    return { leader, tool };
  }

  /**
   * Create a simple node without leader
   *
   * @param NodeClass - Node class to instantiate
   * @param config - Node configuration
   * @param autoStart - Whether to start node automatically (default: true)
   * @returns Node instance
   *
   * @example
   * ```typescript
   * const node = await env.createNode(MyTool, {
   *   address: new oNodeAddress('o://test')
   * });
   * ```
   */
  async createNode<T extends oNode>(
    NodeClass: new (config: any) => T,
    config: TestNodeConfig = {},
    autoStart: boolean = true,
  ): Promise<T> {
    const node = new NodeClass({
      parent: null,
      leader: null,
      ...config,
    });

    this.track(node);

    if (autoStart) {
      await node.start();
    }

    return node;
  }

  /**
   * Track a node for automatic cleanup
   *
   * @param node - Node instance to track
   *
   * @example
   * ```typescript
   * const node = new MyNode({});
   * env.track(node);
   * await node.start();
   * ```
   */
  track(node: oNode): void {
    this.nodes.push(node);
  }

  /**
   * Register a cleanup callback
   *
   * Useful for cleaning up external resources (databases, files, etc.)
   *
   * @param callback - Async cleanup function
   *
   * @example
   * ```typescript
   * const db = await createTestDB();
   * env.onCleanup(async () => {
   *   await db.close();
   * });
   * ```
   */
  onCleanup(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Stop all tracked nodes and execute cleanup callbacks
   *
   * Stops nodes in reverse order (children before parents)
   * Call this in afterEach hooks.
   *
   * @example
   * ```typescript
   * afterEach(async () => {
   *   await env.cleanup();
   * });
   * ```
   */
  async cleanup(): Promise<void> {
    // Stop nodes in reverse order (children first)
    const nodesToStop = [...this.nodes].reverse();

    for (const node of nodesToStop) {
      try {
        if (node.state === NodeState.RUNNING) {
          await node.stop();
        }
      } catch (error) {
        console.error('Error stopping node:', error);
      }
    }

    // Execute cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    }

    // Clear tracking
    this.nodes = [];
    this.cleanupCallbacks = [];
  }

  /**
   * Get all tracked nodes
   *
   * @returns Array of tracked node instances
   */
  getNodes(): oNode[] {
    return [...this.nodes];
  }

  /**
   * Get count of tracked nodes
   *
   * @returns Number of tracked nodes
   */
  getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * Check if all tracked nodes are stopped
   *
   * @returns True if all nodes are stopped
   */
  allNodesStopped(): boolean {
    return this.nodes.every((node) => node.state === NodeState.STOPPED);
  }

  /**
   * Wait for a condition to be true
   *
   * @param condition - Function that returns true when condition is met
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
   * @param intervalMs - Check interval in milliseconds (default: 100)
   * @returns Promise that resolves when condition is met or rejects on timeout
   *
   * @example
   * ```typescript
   * await env.waitFor(() => tool.isReady, 10000);
   * ```
   */
  async waitFor(
    condition: () => boolean,
    timeoutMs: number = 5000,
    intervalMs: number = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
