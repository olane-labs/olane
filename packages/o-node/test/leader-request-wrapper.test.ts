// import { expect } from 'chai';
// import { LeaderRequestWrapper } from './leader-request-wrapper.js';
// import { oAddress } from '@olane/o-core';
// import { CircuitState } from './circuit-breaker.js';

// describe('LeaderRequestWrapper with Circuit Breaker', () => {
//   let wrapper: LeaderRequestWrapper;
//   const leaderAddress = new oAddress('o://leader');
//   const registryAddress = new oAddress('o://registry');
//   const regularAddress = new oAddress('o://some-service');

//   beforeEach(() => {
//     wrapper = new LeaderRequestWrapper({
//       enabled: true,
//       maxAttempts: 5,
//       baseDelayMs: 10,
//       maxDelayMs: 100,
//       timeoutMs: 1000,
//       circuitBreaker: {
//         enabled: true,
//         failureThreshold: 3,
//         openTimeoutMs: 500,
//         halfOpenMaxAttempts: 1,
//       },
//     });
//   });

//   describe('Circuit Breaker Integration', () => {
//     it('should execute request successfully and record success', async () => {
//       const mockRequest = vi.fn().mockResolvedValue('success');

//       const result = await wrapper.execute(mockRequest, leaderAddress);

//       expect(result).toBe('success');
//       expect(mockRequest).toHaveBeenCalledTimes(1);

//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.leader.totalSuccesses).toBe(1);
//       expect(stats.leader.state).toBe(CircuitState.CLOSED);
//     });

//     it('should record failures in circuit breaker', async () => {
//       const mockRequest = vi.fn().mockRejectedValue(new Error('Service down'));

//       await expect(
//         wrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.leader.totalFailures).toBeGreaterThan(0);
//       expect(stats.leader.consecutiveFailures).toBeGreaterThan(0);
//     });

//     it('should open circuit after threshold failures', async () => {
//       const mockRequest = vi.fn().mockRejectedValue(new Error('Service down'));

//       // Attempt request multiple times to trigger circuit breaker
//       await expect(
//         wrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.leader.state).toBe(CircuitState.OPEN);
//     });

//     it('should fast-fail when circuit is open', async () => {
//       const mockRequest = vi.fn().mockRejectedValue(new Error('Service down'));

//       // First request to open circuit
//       await expect(
//         wrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       // Reset mock to verify it's not called
//       mockRequest.mockClear();

//       // Second request should fast-fail
//       await expect(wrapper.execute(mockRequest, leaderAddress)).rejects.toThrow(
//         /Circuit breaker is OPEN/,
//       );

//       // Request function should not have been called
//       expect(mockRequest).not.toHaveBeenCalled();
//     });

//     it('should stop retrying when circuit opens mid-retry', async () => {
//       let callCount = 0;
//       const mockRequest = vi.fn().mockImplementation(() => {
//         callCount++;
//         throw new Error('Service down');
//       });

//       await expect(
//         wrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       // Should have stopped retrying after circuit opened
//       expect(callCount).toBeLessThan(5); // Less than maxAttempts
//       expect(callCount).toBeGreaterThanOrEqual(3); // At least threshold attempts
//     });

//     it('should track separate circuits for leader and registry', async () => {
//       const failingRequest = vi
//         .fn()
//         .mockRejectedValue(new Error('Service down'));

//       // Fail leader requests
//       await expect(
//         wrapper.execute(failingRequest, leaderAddress),
//       ).rejects.toThrow();

//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.leader.state).toBe(CircuitState.OPEN);
//       expect(stats.registry.state).toBe(CircuitState.CLOSED);
//     });

//     it('should allow recovery after timeout in HALF_OPEN state', async () => {
//       const mockRequest = vi
//         .fn()
//         .mockRejectedValueOnce(new Error('Service down'))
//         .mockResolvedValue('recovered');

//       // Open circuit
//       await expect(
//         wrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       expect(wrapper.getCircuitBreakerStats().leader.state).toBe(
//         CircuitState.OPEN,
//       );

//       // Wait for circuit to attempt recovery
//       await new Promise((resolve) => setTimeout(resolve, 600));

//       // Should succeed and close circuit
//       const result = await wrapper.execute(mockRequest, leaderAddress);
//       expect(result).toBe('recovered');
//       expect(wrapper.getCircuitBreakerStats().leader.state).toBe(
//         CircuitState.CLOSED,
//       );
//     });
//   });

//   describe('Non-Leader Addresses', () => {
//     it('should not use circuit breaker for non-leader addresses', async () => {
//       const mockRequest = vi.fn().mockRejectedValue(new Error('Service down'));

//       await expect(
//         wrapper.execute(mockRequest, regularAddress),
//       ).rejects.toThrow('Service down');

//       // Should execute directly without retry
//       expect(mockRequest).toHaveBeenCalledTimes(1);

//       // Should not affect circuit breaker stats
//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.leader.totalFailures).toBe(0);
//       expect(stats.registry.totalFailures).toBe(0);
//     });

//     it('should execute successful requests directly', async () => {
//       const mockRequest = vi.fn().mockResolvedValue('success');

//       const result = await wrapper.execute(mockRequest, regularAddress);

//       expect(result).toBe('success');
//       expect(mockRequest).toHaveBeenCalledTimes(1);
//     });
//   });

//   describe('Timeout Handling', () => {
//     it('should timeout long-running requests', async () => {
//       const longRequest = vi.fn().mockImplementation(
//         () =>
//           new Promise((resolve) => {
//             setTimeout(() => resolve('too-late'), 2000);
//           }),
//       );

//       await expect(wrapper.execute(longRequest, leaderAddress)).rejects.toThrow(
//         /timeout/,
//       );
//     });

//     it('should record timeout as failure in circuit breaker', async () => {
//       const longRequest = vi.fn().mockImplementation(
//         () =>
//           new Promise((resolve) => {
//             setTimeout(() => resolve('too-late'), 2000);
//           }),
//       );

//       await expect(
//         wrapper.execute(longRequest, leaderAddress),
//       ).rejects.toThrow();

//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.leader.totalFailures).toBeGreaterThan(0);
//     });
//   });

//   describe('Configuration', () => {
//     it('should bypass retry when disabled', async () => {
//       const disabledWrapper = new LeaderRequestWrapper({
//         enabled: false,
//         maxAttempts: 5,
//         baseDelayMs: 10,
//         maxDelayMs: 100,
//         timeoutMs: 1000,
//       });

//       const mockRequest = vi.fn().mockRejectedValue(new Error('Fail'));

//       await expect(
//         disabledWrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow('Fail');

//       // Should only call once (no retry)
//       expect(mockRequest).toHaveBeenCalledTimes(1);
//     });

//     it('should allow circuit breaker to be disabled', async () => {
//       const noBreakerWrapper = new LeaderRequestWrapper({
//         enabled: true,
//         maxAttempts: 3,
//         baseDelayMs: 10,
//         maxDelayMs: 100,
//         timeoutMs: 1000,
//         circuitBreaker: {
//           enabled: false,
//           failureThreshold: 3,
//           openTimeoutMs: 500,
//           halfOpenMaxAttempts: 1,
//         },
//       });

//       let callCount = 0;
//       const mockRequest = vi.fn().mockImplementation(() => {
//         callCount++;
//         throw new Error('Fail');
//       });

//       await expect(
//         noBreakerWrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       // Should retry all attempts even with failures
//       expect(callCount).toBe(3);
//     });
//   });

//   describe('Manual Reset', () => {
//     it('should reset circuit breakers manually', async () => {
//       const mockRequest = vi.fn().mockRejectedValue(new Error('Service down'));

//       // Open circuit
//       await expect(
//         wrapper.execute(mockRequest, leaderAddress),
//       ).rejects.toThrow();

//       expect(wrapper.getCircuitBreakerStats().leader.state).toBe(
//         CircuitState.OPEN,
//       );

//       // Reset
//       wrapper.resetCircuitBreakers();

//       expect(wrapper.getCircuitBreakerStats().leader.state).toBe(
//         CircuitState.CLOSED,
//       );
//       expect(wrapper.getCircuitBreakerStats().registry.state).toBe(
//         CircuitState.CLOSED,
//       );
//     });
//   });

//   describe('Registry Address', () => {
//     it('should use separate circuit breaker for registry', async () => {
//       const mockRequest = vi.fn().mockRejectedValue(new Error('Registry down'));

//       await expect(
//         wrapper.execute(mockRequest, registryAddress),
//       ).rejects.toThrow();

//       const stats = wrapper.getCircuitBreakerStats();
//       expect(stats.registry.totalFailures).toBeGreaterThan(0);
//       expect(stats.registry.state).toBe(CircuitState.OPEN);
//       expect(stats.leader.state).toBe(CircuitState.CLOSED);
//     });
//   });

//   describe('Statistics', () => {
//     it('should provide circuit breaker statistics', () => {
//       const stats = wrapper.getCircuitBreakerStats();

//       expect(stats).toHaveProperty('leader');
//       expect(stats).toHaveProperty('registry');
//       expect(stats.leader).toHaveProperty('state');
//       expect(stats.leader).toHaveProperty('consecutiveFailures');
//       expect(stats.registry).toHaveProperty('state');
//     });
//   });
// });
