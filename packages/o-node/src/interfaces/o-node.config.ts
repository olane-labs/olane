import { oCoreConfig } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';

export interface oNodeConfig extends oCoreConfig {
  leader: oNodeAddress | null;
  parent: oNodeAddress | null;

  /**
   * Connection health monitoring configuration
   * Detects dead connections by checking libp2p connection state
   */
  connectionHeartbeat?: {
    enabled?: boolean; // Default: true
    intervalMs?: number; // Default: 15000 (15s)
    failureThreshold?: number; // Default: 3 consecutive failures
    checkChildren?: boolean; // Default: true
    checkParent?: boolean; // Default: true
    checkLeader?: boolean; // Default: controlled by ENABLE_LEADER_HEARTBEAT env var
  };

  /**
   * Connection timeout configuration
   * Controls timeouts for stream read and drain operations in connections
   */
  connectionTimeouts?: {
    /**
     * Timeout in milliseconds for reading response data from a stream
     * Default: 120000 (2 minutes)
     */
    readTimeoutMs?: number;
    /**
     * Timeout in milliseconds for waiting for stream buffer to drain when backpressure occurs
     * Default: 30000 (30 seconds)
     */
    drainTimeoutMs?: number;
  };

  runOnLimitedConnection?: boolean;

  /**
   * Enable length-prefixed streaming (libp2p v3 best practice)
   * When enabled, all messages are prefixed with a varint indicating message length
   * This provides proper message boundaries and eliminates concatenation issues
   * @default false (for backward compatibility)
   */
  useLengthPrefixing?: boolean;
}
