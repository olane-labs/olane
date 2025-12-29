import type { Stream } from '@libp2p/interface';

/**
 * Configuration for StreamHandler behavior
 */
export interface StreamHandlerConfig {
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
   * Maximum number of streams to cache
   * Older streams will be evicted when limit is reached
   * @default unlimited
   */
  maxCachedStreams?: number;

  /**
   * Time in milliseconds after which idle cached streams are closed
   * @default unlimited (streams remain cached until closed by peer)
   */
  streamIdleTimeout?: number;
}

/**
 * Context for stream lifecycle operations
 */
export interface StreamContext {
  stream: Stream;
  protocol: string;
  config: StreamHandlerConfig;
}
