import { oNodeConnection } from '@olane/o-node';
import type { oNodeConnectionConfig } from '@olane/o-node';

/**
 * oLimitedConnection extends oNodeConnection with stream reuse enabled
 * This is optimized for limited connections where creating new streams is expensive
 */
export class oLimitedConnection extends oNodeConnection {
  constructor(config: oNodeConnectionConfig) {
    const reusePolicy = config.reusePolicy ?? 'reuse';
    super({
      ...config,
      reusePolicy: reusePolicy,
    });
    this.reusePolicy = reusePolicy;
  }
}
