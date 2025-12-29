import { oAddress } from '../../router/o-address.js';
import type { oRequest } from '../o-request.js';
import type { Stream } from '@libp2p/interface';
import type { RunResult } from '@olane/o-tool';

export interface oConnectionConfig {
  nextHopAddress: oAddress;
  callerAddress?: oAddress;
  targetAddress: oAddress;
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
  isStream?: boolean;
  abortSignal?: AbortSignal;
  /**
   * Optional handler for processing router requests received on outgoing streams
   * This enables bidirectional communication where the client can receive and process
   * router requests while waiting for responses
   */
  requestHandler?: (request: oRequest, stream: Stream) => Promise<RunResult>;
}
