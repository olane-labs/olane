/**
 * SimpleNodeBuilder - Fluent API for creating single-node tests
 *
 * @example
 * ```typescript
 * const node = await new SimpleNodeBuilder(MyTool)
 *   .withConfig({ apiKey: 'test' })
 *   .withAddress('o://test-tool')
 *   .build(env);
 * ```
 */

import type { oNode, oNodeAddress, oNodeTool } from '@olane/o-node';
import type { TestEnvironment } from '../test-environment.js';
import type { TestNodeConfig } from '../test-environment.js';

export class SimpleNodeBuilder<T extends oNodeTool = any> {
  private nodeClass: new (config: any) => T;
  private config: TestNodeConfig = {};
  private autoStart: boolean = true;

  constructor(NodeClass: new (config: any) => T) {
    this.nodeClass = NodeClass;
  }

  /**
   * Set node configuration
   */
  withConfig(config: TestNodeConfig): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Set node address
   */
  withAddress(address: oNodeAddress): this {
    this.config.address = address as any;
    return this;
  }

  /**
   * Set node description
   */
  withDescription(description: string): this {
    this.config.description = description;
    return this;
  }

  /**
   * Set leader reference
   */
  withLeader(leader: oNodeAddress | null): this {
    this.config.leader = leader;
    return this;
  }

  /**
   * Set parent reference
   */
  withParent(parent: oNodeAddress | null): this {
    this.config.parent = parent;
    return this;
  }

  /**
   * Control automatic start
   */
  withAutoStart(autoStart: boolean): this {
    this.autoStart = autoStart;
    return this;
  }

  /**
   * Build and create the node
   */
  async build(env: TestEnvironment): Promise<T> {
    return await env.createNode(this.nodeClass, this.config, this.autoStart);
  }
}
