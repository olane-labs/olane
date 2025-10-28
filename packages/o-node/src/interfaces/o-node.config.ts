import { oCoreConfig } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';

export interface oNodeConfig extends oCoreConfig {
  leader: oNodeAddress | null;
  parent: oNodeAddress | null;

  /**
   * Connection heartbeat configuration (libp2p-native pings)
   * Detects dead connections via periodic pings using libp2p's ping service
   */
  connectionHeartbeat?: {
    enabled?: boolean; // Default: true
    intervalMs?: number; // Default: 15000 (15s)
    timeoutMs?: number; // Default: 5000 (5s)
    failureThreshold?: number; // Default: 3 consecutive failures
    checkChildren?: boolean; // Default: true
    checkParent?: boolean; // Default: true
    checkLeader?: boolean; // Default: controlled by ENABLE_LEADER_HEARTBEAT env var
  };

  /**
   * Automatic reconnection configuration
   * Handles parent connection failures and attempts to reconnect
   */
  reconnection?: {
    enabled?: boolean; // Default: true
    maxAttempts?: number; // Default: 10 (direct reconnection attempts)
    baseDelayMs?: number; // Default: 5000 (5s)
    maxDelayMs?: number; // Default: 60000 (60s)
    useLeaderFallback?: boolean; // Default: true
    parentDiscoveryIntervalMs?: number; // Default: 10000 (10s) - initial discovery interval
    parentDiscoveryMaxDelayMs?: number; // Default: 60000 (60s) - max backoff for discovery
  };

  /**
   * Leader request retry configuration
   * Handles temporary leader unavailability (healing, maintenance)
   */
  leaderRetry?: {
    enabled?: boolean; // Default: true
    maxAttempts?: number; // Default: 20
    baseDelayMs?: number; // Default: 2000 (2s)
    maxDelayMs?: number; // Default: 30000 (30s)
    timeoutMs?: number; // Default: 10000 (10s per request)
    circuitBreaker?: {
      enabled?: boolean; // Default: true
      failureThreshold?: number; // Default: 3
      openTimeoutMs?: number; // Default: 30000 (30s)
      halfOpenMaxAttempts?: number; // Default: 1
    };
  };
}
