import {
  oNodeConnection,
  oNodeConnectionConfig,
  oNodeTool,
} from '@olane/o-node';
import { oLimitedConnectionManager } from './connection/o-limited-connection-manager.js';

export class oLimitedTool extends oNodeTool {
  async connect(config: oNodeConnectionConfig): Promise<oNodeConnection> {
    this.handleProtocol(config.nextHopAddress);

    // Inject requestHandler to enable bidirectional stream processing
    // This allows incoming router requests to be processed through the tool's execute method
    const configWithHandler: oNodeConnectionConfig = {
      ...config,
      requestHandler: this.execute.bind(this),
    };

    return super.connect(configWithHandler);
  }

  async initConnectionManager(): Promise<void> {
    this.connectionManager = new oLimitedConnectionManager({
      p2pNode: this.p2pNode,
      defaultReadTimeoutMs: this.config.connectionTimeouts?.readTimeoutMs,
      defaultDrainTimeoutMs: this.config.connectionTimeouts?.drainTimeoutMs,
      runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
    });
  }
}
