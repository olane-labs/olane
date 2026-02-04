import { Connection, Libp2p } from '@olane/o-config';
import { oConnectionConfig } from '@olane/o-core';
import { oNodeAddress } from '../../router';

export interface oNodeConnectionConfig extends oConnectionConfig {
  nextHopAddress: oNodeAddress;
  callerAddress?: oNodeAddress;
  targetAddress: oNodeAddress;
  p2pConnection?: Connection;
  runOnLimitedConnection?: boolean;
  /**
   * Timeout in milliseconds for waiting for stream buffer to drain when backpressure occurs.
   * Default: 30000 (30 seconds)
   */
  drainTimeoutMs?: number;
  abortSignal?: AbortSignal;
  /**
   * Timeout in milliseconds for reading response data from a stream.
   * Default: 120000 (2 minutes)
   */
  readTimeoutMs?: number;
}
