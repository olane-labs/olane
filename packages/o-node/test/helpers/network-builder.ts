import { oNodeTool } from '../../src/o-node.tool.js';
import { oNode } from '../../src/o-node.js';
import { oNodeAddress } from '../../src/router/o-node.address.js';
import { oNodeToolConfig } from '../../src/interfaces/o-node.tool-config.js';
import { oNodeConfig } from '../../src/interfaces/o-node.config.js';
import { NodeType } from '@olane/o-core';

/**
 * Simple test tool for network communication testing
 */
export class TestTool extends oNodeTool {
  public callCount = 0;

  constructor(config: oNodeToolConfig & { address: oNodeAddress }) {
    super(config);
  }

  async _tool_echo(request: any): Promise<any> {
    this.callCount++;
    return {
      message: request.params.message || 'echo',
      nodeAddress: this.address.toString(),
      timestamp: Date.now(),
    };
  }

  async _tool_get_info(request: any): Promise<any> {
    return {
      address: this.address.toString(),
      leader: this.leader?.toString(),
      parent: this.parent?.toString(),
      children: this.getChildren().map((c) => c.toString()),
      callCount: this.callCount,
    };
  }

  async *_tool_stream(request: any): AsyncGenerator<any> {
    const count = request.params.count || 5;
    for (let i = 0; i < count; i++) {
      yield {
        chunk: i + 1,
        total: count,
        nodeAddress: this.address.toString(),
        timestamp: Date.now(),
      };
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Configuration for a node in the network
 */
export interface NodeConfig {
  address: string;
  type?: NodeType;
  parent?: string;
  leader?: string;
  seed?: string;
  disableHeartbeat?: boolean;
  disableReconnection?: boolean;
}

/**
 * Network topology builder for testing
 * Simplifies creation of multi-node hierarchical networks
 */
export class NetworkBuilder {
  private nodes: Map<string, oNode | oNodeTool> = new Map();
  private startedNodes: Set<string> = new Set();

  /**
   * Add a leader node to the network
   */
  async addLeader(config: Partial<NodeConfig> = {}): Promise<oNode> {
    const address = config.address || 'o://leader';
    const seed = config.seed || `leader-seed-${Date.now()}`;

    const node = new oNode({
      address: new oNodeAddress(address),
      type: NodeType.LEADER,
      leader: null,
      parent: null,
      seed,
      connectionHeartbeat: {
        enabled: !config.disableHeartbeat,
      },
    });

    this.nodes.set(address, node);
    return node;
  }

  /**
   * Add a parent node (middle tier) to the network
   */
  async addParent(
    leaderAddress: string,
    config: Partial<NodeConfig> = {},
  ): Promise<oNodeTool> {
    const address = config.address || `o://parent-${this.nodes.size}`;
    const seed = config.seed || `parent-seed-${Date.now()}-${this.nodes.size}`;

    const leader = this.nodes.get(leaderAddress);
    if (!leader) {
      throw new Error(`Leader not found: ${leaderAddress}`);
    }

    // Wait for leader to have transports
    await this.waitForTransports(leader);

    const node = new TestTool({
      address: new oNodeAddress(address),
      leader: new oNodeAddress(
        leader.address.toString(),
        leader.address.libp2pTransports,
      ),
      parent: new oNodeAddress(
        leader.address.toString(),
        leader.address.libp2pTransports,
      ),
      seed,
      connectionHeartbeat: {
        enabled: !config.disableHeartbeat,
      },
    });

    this.nodes.set(address, node);
    return node;
  }

  /**
   * Add a child node to a parent
   */
  async addChild(
    parentAddress: string,
    config: Partial<NodeConfig> = {},
  ): Promise<oNodeTool> {
    const address = config.address || `o://child-${this.nodes.size}`;
    const seed = config.seed || `child-seed-${Date.now()}-${this.nodes.size}`;

    const parent = this.nodes.get(parentAddress);
    if (!parent) {
      throw new Error(`Parent not found: ${parentAddress}`);
    }

    // Wait for parent to have transports
    await this.waitForTransports(parent);

    // Get leader reference
    const leader = parent.leader
      ? new oNodeAddress(
          parent.leader.toString(),
          parent.leader.libp2pTransports,
        )
      : null;

    const node = new TestTool({
      address: new oNodeAddress(address),
      leader,
      parent: new oNodeAddress(
        parent.address.toString(),
        parent.address.libp2pTransports,
      ),
      seed,
      connectionHeartbeat: {
        enabled: !config.disableHeartbeat,
        checkChildren: false, // Children don't monitor children by default
      },
    });

    this.nodes.set(address, node);
    return node;
  }

  /**
   * Add a standalone node (no leader, no parent)
   */
  async addStandalone(config: Partial<NodeConfig> = {}): Promise<oNodeTool> {
    const address = config.address || `o://standalone-${this.nodes.size}`;
    const seed =
      config.seed || `standalone-seed-${Date.now()}-${this.nodes.size}`;

    const node = new TestTool({
      address: new oNodeAddress(address),
      leader: null,
      parent: null,
      seed,
      connectionHeartbeat: {
        enabled: !config.disableHeartbeat,
      },
    });

    this.nodes.set(address, node);
    return node;
  }

  /**
   * Start a specific node
   */
  async startNode(address: string): Promise<void> {
    const node = this.nodes.get(address);
    if (!node) {
      throw new Error(`Node not found: ${address}`);
    }

    if (this.startedNodes.has(address)) {
      return; // Already started
    }

    await node.start();
    this.startedNodes.add(address);

    // Wait for transports to be available
    await this.waitForTransports(node);
  }

  /**
   * Start all nodes in the network
   */
  async startAll(): Promise<void> {
    // Start in dependency order: leaders first, then parents, then children
    for (const [address, node] of this.nodes.entries()) {
      if (!this.startedNodes.has(address)) {
        await this.startNode(address);
        // Small delay to ensure registration completes
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Stop a specific node
   */
  async stopNode(address: string): Promise<void> {
    const node = this.nodes.get(address);
    if (!node) {
      throw new Error(`Node not found: ${address}`);
    }

    if (!this.startedNodes.has(address)) {
      return; // Not started
    }

    await node.stop();
    this.startedNodes.delete(address);
  }

  /**
   * Stop all nodes in the network
   */
  async stopAll(): Promise<void> {
    // Stop in reverse dependency order: children first, then parents, then leaders
    const sortedNodes = Array.from(this.nodes.entries()).reverse();

    for (const [address] of sortedNodes) {
      if (this.startedNodes.has(address)) {
        await this.stopNode(address);
      }
    }
  }

  /**
   * Get a node by address
   */
  getNode(address: string): oNode | oNodeTool | undefined {
    return this.nodes.get(address);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Map<string, oNode | oNodeTool> {
    return new Map(this.nodes);
  }

  /**
   * Wait for a node to have transports available
   */
  private async waitForTransports(
    node: oNode | oNodeTool,
    timeoutMs = 5000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (node.address.libp2pTransports.length > 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(
      `Timeout waiting for transports on ${node.address.toString()}`,
    );
  }

  /**
   * Clean up all nodes
   */
  async cleanup(): Promise<void> {
    await this.stopAll();
    this.nodes.clear();
    this.startedNodes.clear();
  }
}

/**
 * Quick network topology builders for common scenarios
 */
export class NetworkTopologies {
  /**
   * Create a simple two-node network (parent-child)
   */
  static async twoNode(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addLeader({ address: 'o://leader' });
    await builder.addChild('o://leader', { address: 'o://child' });
    return builder;
  }

  /**
   * Create a three-node hierarchy (leader → parent → child)
   */
  static async threeNode(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addLeader({ address: 'o://leader' });
    await builder.addParent('o://leader', { address: 'o://parent' });
    await builder.addChild('o://parent', { address: 'o://child' });
    return builder;
  }

  /**
   * Create a five-node hierarchy (leader → 2 parents → 2 children each)
   */
  static async fiveNode(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addLeader({ address: 'o://leader' });

    // Add two parent nodes
    await builder.addParent('o://leader', { address: 'o://parent1' });
    await builder.addParent('o://leader', { address: 'o://parent2' });

    // Add children to first parent
    await builder.addChild('o://parent1', { address: 'o://child1' });
    await builder.addChild('o://parent1', { address: 'o://child2' });

    return builder;
  }

  /**
   * Create a complex hierarchy for integration testing
   * Leader with 3 parents, each parent has 2 children
   */
  static async complex(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addLeader({ address: 'o://leader' });

    // Add three parent nodes
    for (let i = 1; i <= 3; i++) {
      await builder.addParent('o://leader', {
        address: `o://parent${i}`,
      });

      // Add two children per parent
      for (let j = 1; j <= 2; j++) {
        await builder.addChild(`o://parent${i}`, {
          address: `o://parent${i}-child${j}`,
        });
      }
    }

    return builder;
  }
}
