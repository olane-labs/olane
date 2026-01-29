import { oNodeTool } from '../../src/o-node.tool.js';
import { oNodeAddress } from '../../src/router/o-node.address.js';
import { oNodeToolConfig } from '../../src/interfaces/o-node.tool-config.js';
import { oAddress, oRequest } from '@olane/o-core';
import { Libp2pConfig } from '@olane/o-config';

/**
 * Simple test tool for network communication testing
 */
export class TestTool extends oNodeTool {
  public callCount = 0;

  constructor(config: oNodeToolConfig & { address: oNodeAddress }) {
    super(config);
  }

  async configure(): Promise<Libp2pConfig> {
    const config = await super.configure();
    config.connectionGater = {
      denyDialPeer: (peerId) => {
        return false;
      },
      // who can call us?
      denyInboundEncryptedConnection: (peerId, maConn) => {
        return false;
      },
    };
    return config;
  }

  // NEED TO OVERRIDE to ensure that we can test fully without a proper leader node
  async registerParent(): Promise<void> {
    if (!this.parent) {
      this.logger.warn('no parent, skipping registration');
      return;
    }

    if (!this.parent?.libp2pTransports?.length) {
      this.logger.debug(
        'Parent has no transports, waiting for reconnection & leader ack',
      );
      if (this.parent?.toString() === oAddress.leader().toString()) {
        this.parent.setTransports(this.leader?.libp2pTransports || []);
      } else {
        this.logger.debug('Waiting for parent and reconnecting...');
        await this.reconnectionManager?.waitForParentAndReconnect();
      }
    }

    // if no parent transports, register with the parent to get them
    // TODO: should we remove the transports check to make this more consistent?
    if (this.config.parent) {
      this.logger.debug(
        'Registering node with parent...',
        this.config.parent?.toString(),
      );
      // avoid transports to ensure we do not try direct connection, we need to route via the leader for proper access controls
      await this.use(this.config.parent, {
        method: 'child_register',
        params: {
          address: this.address.toString(),
          transports: this.transports.map((t) => t.toString()),
          peerId: this.peerId.toString(),
          _token: this.config.joinToken,
        },
      });
      this.setKeepAliveTag(this.parent as oNodeAddress);
    }
  }

  async _tool_echo(request: oRequest): Promise<any> {
    this.callCount++;
    return {
      message: request.params.message || 'echo',
      nodeAddress: this.address.toString(),
      timestamp: Date.now(),
    };
  }

  async _tool_get_info(request: oRequest): Promise<any> {
    return {
      address: this.address.toString(),
      parent: this.parent?.toString(),
      children: this.getChildren().map((c) => c.toString()),
      callCount: this.callCount,
    };
  }

  async *_tool_stream(request: oRequest): AsyncGenerator<any> {
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
  parent?: string;
  seed?: string;
  disableHeartbeat?: boolean;
}

/**
 * Simplified network topology builder for testing node-to-node communication
 * Focuses on peer connections and parent-child relationships without leader abstractions
 */
export class NetworkBuilder {
  private nodes: Map<string, TestTool> = new Map();
  private startedNodes: Set<string> = new Set();

  /**
   * Add a node to the network
   * If parentAddress is provided, the node will register as a child
   */
  async addNode(
    address: string,
    parentAddress?: string,
    config: Partial<NodeConfig> = {},
  ): Promise<TestTool> {
    const seed = config.seed || `node-seed-${address}-${Date.now()}`;

    let parentNode: TestTool | undefined;
    let parentRef: oNodeAddress | null = null;

    if (parentAddress) {
      parentNode = this.nodes.get(parentAddress);
      if (!parentNode) {
        throw new Error(`Parent node not found: ${parentAddress}`);
      }

      // Wait for parent to have transports
      // await this.waitForTransports(parentNode);

      parentRef = new oNodeAddress(
        parentNode.address.toString(),
        parentNode.address.libp2pTransports,
      );
    }

    const node = new TestTool({
      address: new oNodeAddress(address),
      parent: parentRef,
      leader: null, // No leader abstraction in o-node tests
      seed,
      connectionHeartbeat: {
        enabled: !config.disableHeartbeat,
        checkChildren: parentAddress ? false : true, // Only root monitors children
      },
    });

    this.nodes.set(address, node);
    await this.startNode(address);
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
    // await this.waitForTransports(node);
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
   * Stops in reverse dependency order: children first, then parents
   */
  async stopAll(): Promise<void> {
    const sortedNodes = this.getSortedNodesByDepth().reverse();

    for (const address of sortedNodes) {
      if (this.startedNodes.has(address)) {
        await this.stopNode(address);
      }
    }
  }

  /**
   * Get a node by address
   */
  getNode(address: string): TestTool | undefined {
    return this.nodes.get(address);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Map<string, TestTool> {
    return new Map(this.nodes);
  }

  /**
   * Sort nodes by hierarchy depth (root nodes first)
   */
  private getSortedNodesByDepth(): string[] {
    const depths = new Map<string, number>();
    const addresses = Array.from(this.nodes.keys());

    // Calculate depth for each node
    const calculateDepth = (address: string): number => {
      if (depths.has(address)) {
        return depths.get(address)!;
      }

      const node = this.nodes.get(address)!;
      if (!node.parent) {
        depths.set(address, 0);
        return 0;
      }

      // Find parent address in our map
      const parentAddress = Array.from(this.nodes.entries()).find(
        ([_, n]) => n.address.toString() === node.parent?.toString(),
      )?.[0];

      if (!parentAddress) {
        depths.set(address, 0);
        return 0;
      }

      const depth = calculateDepth(parentAddress) + 1;
      depths.set(address, depth);
      return depth;
    };

    addresses.forEach((addr) => calculateDepth(addr));

    // Sort by depth (ascending)
    return addresses.sort((a, b) => {
      const depthA = depths.get(a) || 0;
      const depthB = depths.get(b) || 0;
      return depthA - depthB;
    });
  }

  /**
   * Wait for a node to have transports available
   */
  private async waitForTransports(
    node: TestTool,
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
 * Quick network topology builders for common test scenarios
 * All topologies use simple parent-child relationships without leader abstractions
 * Note: "leader" in address names is just a convention, not a special node type
 */
export class NetworkTopologies {
  /**
   * Create a simple two-node network (parent-child)
   * Addresses: o://leader (root), o://child
   */
  static async twoNode(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addNode('o://leader');
    await builder.addNode('o://child', 'o://leader');
    return builder;
  }

  /**
   * Create a three-node hierarchy (leader → parent → child)
   * Addresses: o://leader (root), o://parent, o://child
   */
  static async threeNode(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addNode('o://leader');
    await builder.addNode('o://parent', 'o://leader');
    await builder.addNode('o://child', 'o://parent');
    return builder;
  }

  /**
   * Create a five-node hierarchy with two branches
   * Structure: leader → parent1 → child1, child2
   *                  → parent2
   */
  static async fiveNode(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addNode('o://leader');
    await builder.addNode('o://parent1', 'o://leader');
    await builder.addNode('o://parent2', 'o://leader');
    await builder.addNode('o://child1', 'o://parent1');
    await builder.addNode('o://child2', 'o://parent1');
    return builder;
  }

  /**
   * Create two standalone nodes (peer-to-peer)
   */
  static async twoStandalone(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addNode('o://node1');
    await builder.addNode('o://node2');
    return builder;
  }

  /**
   * Create a complex hierarchy for integration testing
   * Structure: leader → parent1 → child1, child2
   *                  → parent2 → child3, child4
   *                  → parent3 → child5, child6
   */
  static async complex(): Promise<NetworkBuilder> {
    const builder = new NetworkBuilder();
    await builder.addNode('o://leader');

    // Add three parent nodes
    await builder.addNode('o://parent1', 'o://leader');
    await builder.addNode('o://parent2', 'o://leader');
    await builder.addNode('o://parent3', 'o://leader');

    // Add children to each parent
    await builder.addNode('o://parent1-child1', 'o://parent1');
    await builder.addNode('o://parent1-child2', 'o://parent1');
    await builder.addNode('o://parent2-child1', 'o://parent2');
    await builder.addNode('o://parent2-child2', 'o://parent2');
    await builder.addNode('o://parent3-child1', 'o://parent3');
    await builder.addNode('o://parent3-child2', 'o://parent3');

    return builder;
  }
}
