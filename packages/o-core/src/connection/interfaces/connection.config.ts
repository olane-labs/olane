import { oAddress } from '../../router/o-address.js';

export interface oConnectionConfig {
  nextHopAddress: oAddress;
  callerAddress?: oAddress;
  address: oAddress;
  /**
   * Timeout in milliseconds for reading response data from a stream.
   * Default: 120000 (2 minutes)
   */
  readTimeoutMs?: number;
  /**
   * Timeout in milliseconds for waiting for stream buffer to drain when backpressure occurs.
   * Default: 30000 (30 seconds)
   */
  drainTimeoutMs?: number;
}
