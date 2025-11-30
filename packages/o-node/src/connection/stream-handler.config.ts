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
}

/**
 * Context for stream lifecycle operations
 */
export interface StreamContext {
  stream: Stream;
  protocol: string;
  config: StreamHandlerConfig;
}
