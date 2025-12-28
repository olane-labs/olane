import {
  oNodeConnection,
  oNodeConnectionConfig,
  oNodeTool,
} from '@olane/o-node';
import { oLimitedConnectionManager } from './connection/o-limited-connection-manager.js';
import { oNodeConfig } from '@olane/o-node';

export class oLimitedTool extends oNodeTool {
  constructor(config: oNodeConfig) {
    super({
      ...config,
      network: {
        ...(config.network || {}),
        listeners: config.network?.listeners || [], // default to no listeners
      },
      runOnLimitedConnection: true,
    });
  }

  async connect(config: oNodeConnectionConfig): Promise<oNodeConnection> {
    this.handleProtocol(config.nextHopAddress).catch((error) => {
      this.logger.error('Error handling protocol:', error);
    });

    // Inject requestHandler to enable bidirectional stream processing
    // This allows incoming router requests to be processed through the tool's execute method
    // The StreamPoolManager (in oLimitedConnection) will use this handler for the dedicated reader
    const configWithHandler: oNodeConnectionConfig = {
      ...config,
      requestHandler: this.execute.bind(this),
    };

    const connection = await super.connect(configWithHandler);

    return connection;
  }

  async initConnectionManager(): Promise<void> {
    this.connectionManager = new oLimitedConnectionManager({
      p2pNode: this.p2pNode,
      defaultReadTimeoutMs: this.config.connectionTimeouts?.readTimeoutMs,
      defaultDrainTimeoutMs: this.config.connectionTimeouts?.drainTimeoutMs,
      runOnLimitedConnection: true,
    });
  }
}
