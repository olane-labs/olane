import { oObject, oAddress, oRequest, oResponse } from '@olane/o-core';

export interface LeaderRetryConfig {
  enabled: boolean; // Default: true
  maxAttempts: number; // Default: 20
  baseDelayMs: number; // Default: 2000 (2s)
  maxDelayMs: number; // Default: 30000 (30s)
  timeoutMs: number; // Default: 10000 (10s per request)
}

/**
 * Leader Request Wrapper
 *
 * Wraps requests to leader/registry with aggressive retry logic.
 * Used when leader may be temporarily unavailable (healing, maintenance).
 *
 * Strategy:
 * 1. Detect if request is to leader or registry
 * 2. Apply retry logic with exponential backoff
 * 3. Timeout individual attempts
 * 4. Log retries for observability
 */
export class LeaderRequestWrapper extends oObject {
  constructor(private config: LeaderRetryConfig) {
    super();
  }

  /**
   * Check if address is a leader-related address that needs retry
   */
  private isLeaderAddress(address: oAddress): boolean {
    const addressStr = address.toString();
    return addressStr === 'o://leader' || addressStr === 'o://registry';
  }

  /**
   * Execute request with retry logic
   */
  async execute<T>(
    requestFn: () => Promise<T>,
    address: oAddress,
    context?: string,
  ): Promise<T> {
    // If retry disabled or not a leader address, execute directly
    if (!this.config.enabled || !this.isLeaderAddress(address)) {
      return await requestFn();
    }

    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        this.logger.debug(
          `Leader request attempt ${attempt}/${this.config.maxAttempts}` +
            (context ? ` (${context})` : ''),
        );

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Leader request timeout after ${this.config.timeoutMs}ms`,
                ),
              ),
            this.config.timeoutMs,
          );
        });

        // Race between request and timeout
        const result = await Promise.race([requestFn(), timeoutPromise]);

        // Success!
        if (attempt > 1) {
          this.logger.info(
            `Leader request succeeded after ${attempt} attempts` +
              (context ? ` (${context})` : ''),
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `Leader request attempt ${attempt} failed: ${lastError.message}` +
            (context ? ` (${context})` : ''),
        );

        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger.debug(`Waiting ${delay}ms before next attempt...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    this.logger.error(
      `Leader request failed after ${this.config.maxAttempts} attempts` +
        (context ? ` (${context})` : ''),
    );

    throw lastError || new Error('Leader request failed');
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): LeaderRetryConfig {
    return { ...this.config };
  }
}
