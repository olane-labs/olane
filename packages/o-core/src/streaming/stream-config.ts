/**
 * Configuration options for streaming operations
 */
export interface StreamConfig {
  /**
   * Timeout in milliseconds for waiting to read the first chunk
   * @default 120000 (2 minutes)
   */
  readTimeoutMs: number;

  /**
   * Timeout in milliseconds for drain operations when handling backpressure
   * @default 30000 (30 seconds)
   */
  drainTimeoutMs: number;

  /**
   * Maximum size of a single chunk in bytes (optional)
   * If not set, chunks can be any size
   */
  maxChunkSize?: number;

  /**
   * Enable metrics tracking for streaming operations
   * @default true
   */
  enableMetrics?: boolean;
}

/**
 * Default configuration for streaming operations
 */
export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  readTimeoutMs: 120_000, // 2 minutes
  drainTimeoutMs: 30_000, // 30 seconds
  enableMetrics: true,
};

/**
 * Merge user config with defaults
 * @param userConfig - Partial user configuration
 * @returns Complete configuration with defaults applied
 */
export function mergeStreamConfig(
  userConfig?: Partial<StreamConfig>
): StreamConfig {
  return {
    ...DEFAULT_STREAM_CONFIG,
    ...userConfig,
  };
}
