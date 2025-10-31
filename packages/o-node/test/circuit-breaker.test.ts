import { expect } from 'chai';
import { CircuitBreaker, CircuitState } from '../src/utils/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', {
      enabled: true,
      failureThreshold: 3,
      openTimeoutMs: 1000,
      halfOpenMaxAttempts: 1,
    });
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);
      expect(breaker.shouldAllowRequest()).to.equal(true);
    });

    it('should transition to OPEN after threshold failures', () => {
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);

      // Record failures up to threshold
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);

      // Third failure should open circuit
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);
      expect(breaker.shouldAllowRequest()).to.equal(false);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Next request should transition to HALF_OPEN
      expect(breaker.shouldAllowRequest()).to.equal(true);
      expect(breaker.getState()).to.equal(CircuitState.HALF_OPEN);
    });

    it('should transition from HALF_OPEN to CLOSED on success', async () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Wait and transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 1100));
      breaker.shouldAllowRequest();

      // Success should close circuit
      breaker.recordSuccess();
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN to OPEN on failure', async () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Wait and transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 1100));
      breaker.shouldAllowRequest();
      expect(breaker.getState()).to.equal(CircuitState.HALF_OPEN);

      // Failure should reopen circuit
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);
    });
  });

  describe('Request Gating', () => {
    it('should allow all requests in CLOSED state', () => {
      expect(breaker.shouldAllowRequest()).to.equal(true);
      expect(breaker.shouldAllowRequest()).to.equal(true);
    });

    it('should block all requests in OPEN state', () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      expect(breaker.shouldAllowRequest()).to.equal(false);
    });

    it('should limit requests in HALF_OPEN state', async () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Wait and transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // First request allowed
      expect(breaker.shouldAllowRequest()).to.equal(true);
      expect(breaker.getState()).to.equal(CircuitState.HALF_OPEN);

      // Subsequent requests blocked until result recorded
      expect(breaker.shouldAllowRequest()).to.equal(false);
    });
  });

  describe('Failure Tracking', () => {
    it('should track consecutive failures', () => {
      breaker.recordFailure();
      expect(breaker.getStats().consecutiveFailures).to.equal(1);

      breaker.recordFailure();
      expect(breaker.getStats().consecutiveFailures).to.equal(2);

      breaker.recordFailure();
      expect(breaker.getStats().consecutiveFailures).to.equal(3);
    });

    it('should reset consecutive failures on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getStats().consecutiveFailures).to.equal(2);

      breaker.recordSuccess();
      expect(breaker.getStats().consecutiveFailures).to.equal(0);
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);
    });

    it('should track total failures and successes', () => {
      breaker.recordFailure();
      breaker.recordSuccess();
      breaker.recordFailure();
      breaker.recordSuccess();

      const stats = breaker.getStats();
      expect(stats.totalFailures).to.equal(2);
      expect(stats.totalSuccesses).to.equal(2);
    });

    it('should track timestamps', () => {
      const beforeFailure = Date.now();
      breaker.recordFailure();
      const afterFailure = Date.now();

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).greaterThanOrEqual(beforeFailure);
      expect(stats.lastFailureTime).lessThanOrEqual(afterFailure);

      const beforeSuccess = Date.now();
      breaker.recordSuccess();
      const afterSuccess = Date.now();

      const stats2 = breaker.getStats();
      expect(stats2.lastSuccessTime).greaterThanOrEqual(beforeSuccess);
      expect(stats2.lastSuccessTime).lessThanOrEqual(afterSuccess);
    });
  });

  describe('Configuration', () => {
    it('should respect custom failure threshold', () => {
      const customBreaker = new CircuitBreaker('test', {
        enabled: true,
        failureThreshold: 5,
        openTimeoutMs: 1000,
        halfOpenMaxAttempts: 1,
      });

      // Should not open before threshold
      customBreaker.recordFailure();
      customBreaker.recordFailure();
      customBreaker.recordFailure();
      customBreaker.recordFailure();
      expect(customBreaker.getState()).to.equal(CircuitState.CLOSED);

      // Should open at threshold
      customBreaker.recordFailure();
      expect(customBreaker.getState()).to.equal(CircuitState.OPEN);
    });

    it('should respect custom half-open attempts', async () => {
      const customBreaker = new CircuitBreaker('test', {
        enabled: true,
        failureThreshold: 2,
        openTimeoutMs: 100,
        halfOpenMaxAttempts: 3,
      });

      // Open circuit
      customBreaker.recordFailure();
      customBreaker.recordFailure();

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow 3 attempts in HALF_OPEN
      expect(customBreaker.shouldAllowRequest()).to.equal(true);
      expect(customBreaker.shouldAllowRequest()).to.equal(true);
      expect(customBreaker.shouldAllowRequest()).to.equal(true);
      expect(customBreaker.shouldAllowRequest()).to.equal(false);
    });

    it('should bypass all logic when disabled', () => {
      const disabledBreaker = new CircuitBreaker('test', {
        enabled: false,
        failureThreshold: 1,
        openTimeoutMs: 1000,
        halfOpenMaxAttempts: 1,
      });

      // Record many failures
      disabledBreaker.recordFailure();
      disabledBreaker.recordFailure();
      disabledBreaker.recordFailure();

      // Should still allow requests
      expect(disabledBreaker.shouldAllowRequest()).to.equal(true);
      expect(disabledBreaker.getState()).to.equal(CircuitState.CLOSED);
    });
  });

  describe('Manual Control', () => {
    it('should reset to CLOSED state', () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);

      // Reset
      breaker.reset();
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);
      expect(breaker.getStats().consecutiveFailures).to.equal(0);
      expect(breaker.shouldAllowRequest()).to.equal(true);
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive stats', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();

      const stats = breaker.getStats();

      expect(stats).to.have.property('state');
      expect(stats).to.have.property('consecutiveFailures');
      expect(stats).to.have.property('totalFailures');
      expect(stats).to.have.property('totalSuccesses');
      expect(stats).to.have.property('lastFailureTime');
      expect(stats).to.have.property('lastSuccessTime');
      expect(stats).to.have.property('openedAt');

      expect(stats.state).to.equal(CircuitState.CLOSED);
      expect(stats.consecutiveFailures).to.equal(0);
      expect(stats.totalFailures).to.equal(2);
      expect(stats.totalSuccesses).to.equal(1);
    });

    it('should track openedAt timestamp', () => {
      const before = Date.now();

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      const after = Date.now();
      const stats = breaker.getStats();

      expect(stats.openedAt).greaterThanOrEqual(before);
      expect(stats.openedAt).lessThanOrEqual(after);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state transitions', async () => {
      // Open
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);

      // Wait for HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 1100));
      breaker.shouldAllowRequest();
      expect(breaker.getState()).to.equal(CircuitState.HALF_OPEN);

      // Close
      breaker.recordSuccess();
      expect(breaker.getState()).to.equal(CircuitState.CLOSED);

      // Open again
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);
    });

    it('should not open before timeout expires in OPEN state', async () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).to.equal(CircuitState.OPEN);

      // Wait less than timeout
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should still be closed
      expect(breaker.shouldAllowRequest()).to.equal(false);
      expect(breaker.getState()).to.equal(CircuitState.OPEN);
    });
  });
});
