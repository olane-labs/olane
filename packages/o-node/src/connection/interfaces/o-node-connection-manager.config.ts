import { oConnectionManagerConfig } from '@olane/o-core';
import { Libp2p } from '@olane/o-config';

export interface oNodeConnectionManagerConfig extends oConnectionManagerConfig {
  p2pNode: Libp2p;
  runOnLimitedConnection?: boolean;
  callerAddress?: string;
  /**
   * Default timeout in milliseconds for reading response data from a stream.
   * Can be overridden per connection.
   * Default: 120000 (2 minutes)
   */
  defaultReadTimeoutMs?: number;
  /**
   * Default timeout in milliseconds for waiting for stream buffer to drain when backpressure occurs.
   * Can be overridden per connection.
   * Default: 30000 (30 seconds)
   */
  defaultDrainTimeoutMs?: number;
}
