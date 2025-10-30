export interface oConnectionManagerConfig {
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
