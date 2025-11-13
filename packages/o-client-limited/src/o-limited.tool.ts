import { oNodeTool } from '@olane/o-node';
import { oLimitedConnectionManager } from './connection/o-limited-connection-manager.js';

export class oLimitedTool extends oNodeTool {
  async initConnectionManager(): Promise<void> {
    this.connectionManager = new oLimitedConnectionManager({
      p2pNode: this.p2pNode,
      defaultReadTimeoutMs: this.config.connectionTimeouts?.readTimeoutMs,
      defaultDrainTimeoutMs: this.config.connectionTimeouts?.drainTimeoutMs,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
    });
  }
}
