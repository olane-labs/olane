/**
 * LeaderChildBuilder - Fluent API for creating leader-child hierarchies
 *
 * @example
 * ```typescript
 * const { leader, tool } = await new LeaderChildBuilder(MyTool)
 *   .withToolConfig({ apiKey: 'test' })
 *   .withLeaderAddress('o://test-leader')
 *   .build(env);
 * ```
 */

import type { oNode, oNodeAddress } from '@olane/o-node';
import type { TestEnvironment, TestNodeConfig, ToolWithLeaderResult } from '../test-environment.js';

export interface LeaderConfig {
  address?: oNodeAddress;
  description?: string;
  autoStart?: boolean;
}

export class LeaderChildBuilder<T extends oNode = any> {
  private toolClass: new (config: any) => T;
  private toolConfig: TestNodeConfig = {};
  private leaderClass?: new (config: any) => any;
  private leaderConfig: LeaderConfig = {};

  constructor(ToolClass: new (config: any) => T) {
    this.toolClass = ToolClass;
  }

  /**
   * Set tool configuration
   */
  withToolConfig(config: TestNodeConfig): this {
    this.toolConfig = { ...this.toolConfig, ...config };
    return this;
  }

  /**
   * Set leader class (optional, defaults to oLeaderNode)
   */
  withLeaderClass(LeaderClass: new (config: any) => any): this {
    this.leaderClass = LeaderClass;
    return this;
  }

  /**
   * Set leader configuration
   */
  withLeaderConfig(config: LeaderConfig): this {
    this.leaderConfig = { ...this.leaderConfig, ...config };
    return this;
  }

  /**
   * Set leader address
   */
  withLeaderAddress(address: string | oNodeAddress): this {
    this.leaderConfig.address = address as any;
    return this;
  }

  /**
   * Set leader description
   */
  withLeaderDescription(description: string): this {
    this.leaderConfig.description = description;
    return this;
  }

  /**
   * Build and create the leader-child hierarchy
   */
  async build(env: TestEnvironment): Promise<ToolWithLeaderResult<T>> {
    return await env.createToolWithLeader(
      this.toolClass,
      this.toolConfig,
      this.leaderClass
    );
  }
}
