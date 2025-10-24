import { oObject, oAddress, oRequest, oResponse } from '@olane/o-core';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitState,
} from './circuit-breaker.js';

export interface LeaderRetryConfig {
  enabled: boolean; // Default: true
  maxAttempts: number; // Default: 20
  baseDelayMs: number; // Default: 2000 (2s)
  maxDelayMs: number; // Default: 30000 (30s)
  timeoutMs: number; // Default: 10000 (10s per request)
  circuitBreaker?: CircuitBreakerConfig; // Optional circuit breaker config
}

/**
 * Leader Request Wrapper
 *
 * Wraps requests to leader/registry with retry logic and circuit breaker.
 * Used when leader may be temporarily unavailable (healing, maintenance).
 *
 * Strategy:
 * 1. Detect if request is to leader or registry
 * 2. Check circuit breaker state (fast-fail if open)
 * 3. Apply retry logic with exponential backoff
 * 4. Timeout individual attempts
 * 5. Record success/failure in circuit breaker
 * 6. Log retries for observability
 */
export class LeaderRequestWrapper extends oObject {
  private leaderCircuitBreaker: CircuitBreaker;
  private registryCircuitBreaker: CircuitBreaker;

  constructor(private config: LeaderRetryConfig) {
    super();

    // Initialize circuit breakers with defaults if not provided
    const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 3,
      openTimeoutMs: 30000, // 30 seconds
      halfOpenMaxAttempts: 1,
      enabled: true,
    };

    const circuitConfig = {
      ...defaultCircuitBreakerConfig,
      ...(config.circuitBreaker || {}),
    };

    this.leaderCircuitBreaker = new CircuitBreaker('leader', circuitConfig);
    this.registryCircuitBreaker = new CircuitBreaker(
      'registry',
      circuitConfig,
    );
  }

  /**
   * Check if address is a leader-related address that needs retry
   */
  private isLeaderAddress(address: oAddress): boolean {
    const addressStr = address.toString();
    return addressStr === 'o://leader' || addressStr === 'o://registry';
  }

  /**
   * Get the appropriate circuit breaker for the address
   */
  private getCircuitBreaker(address: oAddress): CircuitBreaker | null {
    const addressStr = address.toString();
    if (addressStr === 'o://leader') {
      return this.leaderCircuitBreaker;
    }
    if (addressStr === 'o://registry') {
      return this.registryCircuitBreaker;
    }
    return null;
  }

  /**
   * Execute request with retry logic and circuit breaker
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

    const circuitBreaker = this.getCircuitBreaker(address);

    // Check circuit breaker state before attempting
    if (circuitBreaker && !circuitBreaker.shouldAllowRequest()) {
      const stats = circuitBreaker.getStats();
      const error = new Error(
        `Circuit breaker is ${stats.state} for ${address.toString()}. ` +
          `Consecutive failures: ${stats.consecutiveFailures}. ` +
          `Fast-failing to prevent cascading failures.`,
      );
      this.logger.warn(
        `Circuit breaker blocked request to ${address.toString()}` +
          (context ? ` (${context})` : ''),
      );
      throw error;
    }

    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        if (attempt > 5) {
          this.logger.debug(
            `Retrying... Leader request attempt ${attempt}/${this.config.maxAttempts}` +
              (context ? ` (${context})` : ''),
          );
        }

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

        // Success! Record in circuit breaker
        if (circuitBreaker) {
          circuitBreaker.recordSuccess();
        }

        if (attempt > 1) {
          this.logger.info(
            `Leader request succeeded after ${attempt} attempts` +
              (context ? ` (${context})` : ''),
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Record failure in circuit breaker
        if (circuitBreaker) {
          circuitBreaker.recordFailure();
        }

        this.logger.warn(
          `Leader request attempt ${attempt} failed: ${lastError.message}` +
            (context ? ` (${context})` : ''),
        );

        // Check if circuit breaker has opened during retries
        if (circuitBreaker && circuitBreaker.getState() === CircuitState.OPEN) {
          this.logger.error(
            `Circuit breaker opened during retries for ${address.toString()}, stopping retry attempts` +
              (context ? ` (${context})` : ''),
          );
          throw new Error(
            `Circuit breaker opened after ${attempt} attempts: ${lastError.message}`,
          );
        }

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

  /**
   * Get circuit breaker statistics for observability
   */
  getCircuitBreakerStats() {
    return {
      leader: this.leaderCircuitBreaker.getStats(),
      registry: this.registryCircuitBreaker.getStats(),
    };
  }

  /**
   * Reset circuit breakers (for testing or manual recovery)
   */
  resetCircuitBreakers(): void {
    this.leaderCircuitBreaker.reset();
    this.registryCircuitBreaker.reset();
  }
}
