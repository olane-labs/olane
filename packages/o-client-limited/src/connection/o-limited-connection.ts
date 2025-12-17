import { oNodeConnection } from '@olane/o-node';
import type { oNodeConnectionConfig } from '@olane/o-node/src/connection/interfaces/o-node-connection.config.js';

/**
 * oLimitedConnection extends oNodeConnection with stream reuse enabled
 * This is optimized for limited connections where creating new streams is expensive
 */
export class oLimitedConnection extends oNodeConnection {
  constructor(config: oNodeConnectionConfig) {
    super(config);
    // Override default 'none' policy with 'reuse' for limited connections
    // Can still be overridden via config.reusePolicy
    this.reusePolicy = config.reusePolicy ?? 'reuse';
  }
}
