import type { Stream } from '@libp2p/interface';

/**
 * Stream reuse policy determines how streams are managed across multiple requests
 */
export type StreamReusePolicy = 'none' | 'reuse' | 'pool';

/**
 * Configuration for StreamHandler behavior
 */
export interface StreamHandlerConfig {
  /**
   * Stream reuse policy:
   * - 'none': Create new stream for each request (default)
   * - 'reuse': Reuse existing open streams
   * - 'pool': (Future) Maintain a pool of streams
   */
  reusePolicy?: StreamReusePolicy;

  /**
   * Timeout in milliseconds to wait for stream drain when buffer is full
   * @default 30000 (30 seconds)
   */
  drainTimeoutMs?: number;

  /**
   * Whether this connection can run on limited connections
   * @default false
   */
  runOnLimitedConnection?: boolean;

  /**
   * Maximum number of outbound streams
   * @default 1000
   */
  maxOutboundStreams?: number;

  /**
   * AbortSignal for cancellation
   */
  signal?: AbortSignal;

  /**
   * Enable length-prefixed streaming (libp2p v3 best practice)
   * When enabled, all messages are prefixed with a varint indicating message length
   * This provides proper message boundaries and eliminates concatenation issues
   * @default false (for backward compatibility)
   */
  useLengthPrefixing?: boolean;

  /**
   * Auto-detect protocol (length-prefixed vs raw JSON)
   * When enabled, automatically detects the protocol by examining first byte
   * @default false
   */
  autoDetectProtocol?: boolean;
}

/**
 * Context for stream lifecycle operations
 */
export interface StreamContext {
  stream: Stream;
  protocol: string;
  config: StreamHandlerConfig;
}
