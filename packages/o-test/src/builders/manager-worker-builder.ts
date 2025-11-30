/**
 * ManagerWorkerBuilder - Fluent API for manager-worker pattern tests
 *
 * @example
 * ```typescript
 * const { leader, manager, workers } = await new ManagerWorkerBuilder(MyManager, MyWorker)
 *   .withManagerConfig({ maxInstances: 5 })
 *   .withWorkerCount(3)
 *   .withWorkerConfig({ timeout: 5000 })
 *   .build(env);
 * ```
 */

import type { oNode } from '@olane/o-node';
import type { TestEnvironment, TestNodeConfig } from '../test-environment.js';

export interface ManagerWorkerResult<M = any, W = any> {
  leader: any;
  manager: M;
  workers: W[];
}

export class ManagerWorkerBuilder<M extends oNode = any, W extends oNode = any> {
  private managerClass: new (config: any) => M;
  private workerClass?: new (config: any) => W;
  private managerConfig: TestNodeConfig = {};
  private workerConfig: TestNodeConfig = {};
  private workerCount: number = 0;
  private leaderClass?: new (config: any) => any;

  constructor(
    ManagerClass: new (config: any) => M,
    WorkerClass?: new (config: any) => W
  ) {
    this.managerClass = ManagerClass;
    this.workerClass = WorkerClass;
  }

  /**
   * Set manager configuration
   */
  withManagerConfig(config: TestNodeConfig): this {
    this.managerConfig = { ...this.managerConfig, ...config };
    return this;
  }

  /**
   * Set worker configuration
   */
  withWorkerConfig(config: TestNodeConfig): this {
    this.workerConfig = { ...this.workerConfig, ...config };
    return this;
  }

  /**
   * Set number of workers to create
   */
  withWorkerCount(count: number): this {
    this.workerCount = count;
    return this;
  }

  /**
   * Set leader class
   */
  withLeaderClass(LeaderClass: new (config: any) => any): this {
    this.leaderClass = LeaderClass;
    return this;
  }

  /**
   * Build and create the manager-worker hierarchy
   */
  async build(env: TestEnvironment): Promise<ManagerWorkerResult<M, W>> {
    // Create leader and manager
    const { leader, tool: manager } = await env.createToolWithLeader(
      this.managerClass,
      this.managerConfig,
      this.leaderClass
    );

    const workers: W[] = [];

    // Create workers if count specified and worker class provided
    if (this.workerCount > 0 && this.workerClass) {
      for (let i = 0; i < this.workerCount; i++) {
        // Use manager's create_worker method if available
        const createMethod = 'create_worker';
        if (typeof (manager as any).useSelf === 'function') {
          try {
            await (manager as any).useSelf({
              method: createMethod,
              params: {
                workerId: `worker-${i}`,
                config: this.workerConfig,
              },
            });
          } catch (error) {
            console.warn(`Could not create worker ${i} via manager method:`, error);
          }
        }
      }
    }

    return { leader, manager, workers };
  }
}
