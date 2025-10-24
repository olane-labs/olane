import { oObject } from '@olane/o-core';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, requests pass through
  OPEN = 'OPEN', // Circuit broken, requests fast-fail
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of consecutive failures before opening circuit
  openTimeoutMs: number; // How long to wait before attempting recovery (HALF_OPEN)
  halfOpenMaxAttempts: number; // Max attempts in HALF_OPEN before closing or re-opening
  enabled: boolean; // Master switch to disable circuit breaker
}

export interface CircuitStats {
  state: CircuitState;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  openedAt?: number;
}

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by "breaking the circuit" when a service
 * experiences persistent failures. This allows the system to fail fast
 * rather than wasting resources on retries that are likely to fail.
 *
 * States:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Circuit broken due to failures, requests fail immediately
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * Flow:
 * 1. CLOSED -> OPEN: After N consecutive failures
 * 2. OPEN -> HALF_OPEN: After timeout period
 * 3. HALF_OPEN -> CLOSED: After successful request
 * 4. HALF_OPEN -> OPEN: After failure in recovery
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker('registry', {
 *   failureThreshold: 3,
 *   openTimeoutMs: 30000,
 *   halfOpenMaxAttempts: 1,
 *   enabled: true,
 * });
 *
 * // Before making request
 * if (!breaker.shouldAllowRequest()) {
 *   throw new Error('Circuit breaker is open');
 * }
 *
 * try {
 *   const result = await makeRequest();
 *   breaker.recordSuccess();
 *   return result;
 * } catch (error) {
 *   breaker.recordFailure();
 *   throw error;
 * }
 * ```
 */
export class CircuitBreaker extends oObject {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private openedAt?: number;
  private halfOpenAttempts: number = 0;

  constructor(
    private readonly serviceName: string,
    private readonly config: CircuitBreakerConfig,
  ) {
    super();
    this.logger.debug(
      `Circuit breaker initialized for ${serviceName}:`,
      `threshold=${config.failureThreshold},`,
      `timeout=${config.openTimeoutMs}ms,`,
      `enabled=${config.enabled}`,
    );
  }

  /**
   * Check if a request should be allowed through the circuit breaker
   * @returns true if request should proceed, false if should fast-fail
   */
  shouldAllowRequest(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if timeout period has elapsed
        if (
          this.openedAt &&
          now - this.openedAt >= this.config.openTimeoutMs
        ) {
          this.logger.info(
            `Circuit breaker for ${this.serviceName} entering HALF_OPEN state`,
          );
          this.transitionTo(CircuitState.HALF_OPEN);
          this.halfOpenAttempts = 0;
          return true;
        }
        // Circuit still open, fast-fail
        this.logger.debug(
          `Circuit breaker for ${this.serviceName} is OPEN, rejecting request`,
        );
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited attempts in HALF_OPEN state
        if (this.halfOpenAttempts < this.config.halfOpenMaxAttempts) {
          this.halfOpenAttempts++;
          return true;
        }
        this.logger.debug(
          `Circuit breaker for ${this.serviceName} HALF_OPEN max attempts reached`,
        );
        return false;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (!this.config.enabled) {
      return;
    }

    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.info(
        `Circuit breaker for ${this.serviceName} recovered, closing circuit`,
      );
      this.transitionTo(CircuitState.CLOSED);
      this.halfOpenAttempts = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    if (!this.config.enabled) {
      return;
    }

    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn(
        `Circuit breaker for ${this.serviceName} failed in HALF_OPEN, reopening circuit`,
      );
      this.transitionTo(CircuitState.OPEN);
      this.openedAt = Date.now();
      this.halfOpenAttempts = 0;
      return;
    }

    if (
      this.state === CircuitState.CLOSED &&
      this.consecutiveFailures >= this.config.failureThreshold
    ) {
      this.logger.error(
        `Circuit breaker for ${this.serviceName} opening after ${this.consecutiveFailures} consecutive failures`,
      );
      this.transitionTo(CircuitState.OPEN);
      this.openedAt = Date.now();
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force reset the circuit breaker to CLOSED state
   * Use with caution - mainly for testing or manual recovery
   */
  reset(): void {
    this.logger.info(`Circuit breaker for ${this.serviceName} manually reset`);
    this.transitionTo(CircuitState.CLOSED);
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = undefined;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.logger.debug(
      `Circuit breaker for ${this.serviceName}: ${oldState} -> ${newState}`,
    );
  }
}
