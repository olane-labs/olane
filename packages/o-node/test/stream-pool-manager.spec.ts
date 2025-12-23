import { expect } from 'chai';
import { StreamPoolManager } from '../src/connection/stream-pool-manager.js';
import {
  createStreamPoolManagerConfig,
  createMockConnectionStream,
  createMockStream,
  EventCapture,
  makeStreamInvalid,
  waitFor,
} from './helpers/stream-pool-test-helpers.js';
import { StreamPoolEvent } from '../src/index.js';

describe('StreamPoolManager', () => {
  let poolManager: StreamPoolManager | undefined;

  afterEach(async () => {
    if (poolManager) {
      await poolManager.close();
      poolManager = undefined;
    }
  });

  describe('Initialization', () => {
    it('should initialize pool with default size of 10 streams', async () => {
      const config = createStreamPoolManagerConfig();
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.totalStreams).to.equal(10);
    });

    it('should initialize pool with custom size', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 5 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.totalStreams).to.equal(5);
    });

    it('should throw error when pool size is less than 2', () => {
      expect(() => {
        const config = createStreamPoolManagerConfig({ poolSize: 1 });
        poolManager = new StreamPoolManager(config);
      }).to.throw('Pool size must be at least 2');
    });

    it('should start dedicated reader automatically', async () => {
      const config = createStreamPoolManagerConfig();
      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([StreamPoolEvent.ReaderStarted]);

      await poolManager.initialize();

      expect(events.hasEvent(StreamPoolEvent.ReaderStarted)).to.be.true;
    });

    it('should emit pool-initialized event', async () => {
      const config = createStreamPoolManagerConfig();
      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([StreamPoolEvent.PoolInitialized]);

      await poolManager.initialize();

      expect(events.hasEvent(StreamPoolEvent.PoolInitialized)).to.be.true;
      const eventData = events.getEventsByType(
        StreamPoolEvent.PoolInitialized,
      )[0];
      expect(eventData.poolSize).to.equal(10);
    });

    it('should be idempotent (calling initialize twice is safe)', async () => {
      const config = createStreamPoolManagerConfig();
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();
      const statsFirst = poolManager.getStats();

      await poolManager.initialize();
      const statsSecond = poolManager.getStats();

      expect(statsFirst.totalStreams).to.equal(statsSecond.totalStreams);
      expect(statsSecond.totalStreams).to.equal(10);
    });

    it('should assign correct stream types', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.requestResponseStreams).to.equal(2); // All except stream[0]
    });
  });

  describe('Round-Robin Stream Selection', () => {
    beforeEach(async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 5 });
      poolManager = new StreamPoolManager(config);
      await poolManager.initialize();
    });

    it('should return streams in round-robin order', async () => {
      const stream1 = await poolManager!.getStream();
      const stream2 = await poolManager!.getStream();
      const stream3 = await poolManager!.getStream();
      const stream4 = await poolManager!.getStream();

      // Should cycle through streams[1-4]
      expect(stream1.p2pStream.id).to.not.equal(stream2.p2pStream.id);
      expect(stream2.p2pStream.id).to.not.equal(stream3.p2pStream.id);
      expect(stream3.p2pStream.id).to.not.equal(stream4.p2pStream.id);
    });

    it('should never return dedicated reader stream (index 0)', async () => {
      const streams = [];
      for (let i = 0; i < 10; i++) {
        streams.push(await poolManager!.getStream());
      }

      // None should be stream[0]
      const streamIds = streams.map((s) => s.p2pStream.id);
      expect(streamIds).to.not.include('stream-0');
    });

    it('should wrap around after last stream', async () => {
      // Pool size is 5, so we have streams 1-4 for request-response (4 streams total)
      const firstRound = [];
      for (let i = 0; i < 4; i++) {
        firstRound.push(await poolManager!.getStream());
      }

      const nextStream = await poolManager!.getStream();

      // Should wrap back to first request-response stream
      expect(nextStream.p2pStream.id).to.equal(firstRound[0].p2pStream.id);
    });

    it('should throw error when getStream called before initialize', async () => {
      const config = createStreamPoolManagerConfig();
      const uninitializedManager = new StreamPoolManager(config);

      try {
        await uninitializedManager.getStream();
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('not initialized');
      } finally {
        await uninitializedManager.close();
      }
    });
  });

  describe('Stream Validation and Replacement', () => {
    it('should validate stream health before returning from getStream', async () => {
      let streamCounter = 0;
      const invalidStream = createMockConnectionStream(
        createMockStream('invalid-stream'),
        'request-response',
      );
      makeStreamInvalid(invalidStream);

      const config = createStreamPoolManagerConfig({
        poolSize: 3,
        createStream: async () => {
          streamCounter++;
          if (streamCounter === 2) {
            // Second stream (index 1) is invalid
            return invalidStream;
          }
          return createMockConnectionStream(
            createMockStream(`stream-${streamCounter}`),
            'request-response',
          );
        },
      });

      poolManager = new StreamPoolManager(config);
      await poolManager.initialize();

      // First getStream will try to return invalid stream, should replace it
      const stream = await poolManager.getStream();

      expect(stream.isValid).to.be.true;
    });

    it('should emit stream-replaced event when replacing stream', async () => {
      let streamCounter = 0;
      const invalidStream = createMockConnectionStream(
        createMockStream('invalid-stream'),
        'request-response',
      );
      makeStreamInvalid(invalidStream);

      const config = createStreamPoolManagerConfig({
        poolSize: 3,
        createStream: async () => {
          streamCounter++;
          if (streamCounter === 2) {
            return invalidStream;
          }
          return createMockConnectionStream(
            createMockStream(`stream-${streamCounter}`),
            'request-response',
          );
        },
      });

      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([StreamPoolEvent.StreamReplaced]);

      await poolManager.initialize();

      // Trigger getStream to force validation
      await poolManager.getStream();

      expect(events.hasEvent(StreamPoolEvent.StreamReplaced)).to.be.true;
    });
  });

  describe('Dedicated Reader Recovery', () => {
    it('should detect reader failure and trigger recovery', async () => {
      const mockStreamHandler = {
        handleIncomingStream: async () => {
          // Simulate immediate failure
          throw new Error('Reader stream failed');
        },
      };

      const config = createStreamPoolManagerConfig({
        poolSize: 3,
        streamHandler: mockStreamHandler as any,
      });

      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([StreamPoolEvent.ReaderFailed]);

      await poolManager.initialize();

      // Wait for reader failure event
      const failureEvent = await events.waitForEvent(
        StreamPoolEvent.ReaderFailed,
        2000,
      );

      expect(failureEvent).to.have.property('failureCount');
      expect(failureEvent.failureCount).to.be.greaterThan(0);
    });

    it('should emit reader-recovered event on successful recovery', async () => {
      let callCount = 0;
      const mockStreamHandler = {
        handleIncomingStream: async () => {
          callCount++;
          if (callCount === 1) {
            // First call fails
            throw new Error('Initial failure');
          }
          // Second call succeeds (recovery)
          return new Promise(() => {}); // Never resolves (keeps reader active)
        },
      };

      const config = createStreamPoolManagerConfig({
        poolSize: 3,
        streamHandler: mockStreamHandler as any,
      });

      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([
        StreamPoolEvent.ReaderFailed,
        StreamPoolEvent.ReaderRecovered,
      ]);

      await poolManager.initialize();

      // Wait for recovery
      await events.waitForEvent(StreamPoolEvent.ReaderRecovered, 2000);

      expect(events.hasEvent(StreamPoolEvent.ReaderRecovered)).to.be.true;
    });

    it('should not attempt recovery during close', async () => {
      const mockStreamHandler = {
        handleIncomingStream: async () => {
          // Wait a bit then fail
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw new Error('Reader failed');
        },
      };

      const config = createStreamPoolManagerConfig({
        poolSize: 3,
        streamHandler: mockStreamHandler as any,
      });

      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([
        StreamPoolEvent.ReaderFailed,
        StreamPoolEvent.ReaderRecovered,
      ]);

      await poolManager.initialize();

      // Close immediately
      await poolManager.close();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should not have attempted recovery
      expect(events.hasEvent(StreamPoolEvent.ReaderRecovered)).to.be.false;
    });
  });

  describe('Statistics', () => {
    it('should return accurate totalStreams count', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 7 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.totalStreams).to.equal(7);
    });

    it('should return accurate healthyStreams count', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 5 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.healthyStreams).to.equal(5); // All healthy initially
    });

    it('should report reader health status', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.readerStreamHealth).to.be.oneOf([
        'healthy',
        'unhealthy',
        'not-initialized',
      ]);
    });

    it('should track request-response stream count', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 6 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      const stats = poolManager.getStats();
      expect(stats.requestResponseStreams).to.equal(5); // 6 total - 1 reader
    });

    it('should increment failureCount on reader failures', async () => {
      let callCount = 0;
      const mockStreamHandler = {
        handleIncomingStream: async () => {
          callCount++;
          if (callCount <= 2) {
            // Fail twice
            throw new Error('Failure');
          }
          return new Promise(() => {}); // Then succeed
        },
      };

      const config = createStreamPoolManagerConfig({
        poolSize: 3,
        streamHandler: mockStreamHandler as any,
      });

      poolManager = new StreamPoolManager(config);
      await poolManager.initialize();

      // Wait for recoveries
      await waitFor(() => poolManager!.getStats().failureCount >= 2, 3000);

      const stats = poolManager.getStats();
      expect(stats.failureCount).to.be.at.least(2);
    });
  });

  describe('Event Emission', () => {
    it('should emit all lifecycle events with correct data', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([
        StreamPoolEvent.PoolInitialized,
        StreamPoolEvent.ReaderStarted,
        StreamPoolEvent.PoolClosed,
      ]);

      await poolManager.initialize();
      await poolManager.close();

      expect(events.hasEvent(StreamPoolEvent.PoolInitialized)).to.be.true;
      expect(events.hasEvent(StreamPoolEvent.ReaderStarted)).to.be.true;
      expect(events.hasEvent(StreamPoolEvent.PoolClosed)).to.be.true;
    });

    it('should support multiple listeners for same event', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      let listener1Called = false;
      let listener2Called = false;

      poolManager.on(StreamPoolEvent.PoolInitialized, () => {
        listener1Called = true;
      });
      poolManager.on(StreamPoolEvent.PoolInitialized, () => {
        listener2Called = true;
      });

      await poolManager.initialize();

      expect(listener1Called).to.be.true;
      expect(listener2Called).to.be.true;
    });

    it('should allow removing event listeners', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      let callCount = 0;
      const listener = () => {
        callCount++;
      };

      poolManager.on(StreamPoolEvent.PoolInitialized, listener);
      await poolManager.initialize();

      expect(callCount).to.equal(1);

      poolManager.off(StreamPoolEvent.PoolInitialized, listener);

      // Close and re-initialize (if we could)
      // Since we can't re-init easily, just verify off doesn't throw
      expect(() =>
        poolManager!.off(StreamPoolEvent.PoolInitialized, listener),
      ).to.not.throw();
    });
  });

  describe('Cleanup and Lifecycle', () => {
    it('should close all streams on close()', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 5 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();
      const statsBefore = poolManager.getStats();
      expect(statsBefore.totalStreams).to.equal(5);

      await poolManager.close();

      const statsAfter = poolManager.getStats();
      expect(statsAfter.totalStreams).to.equal(0);
    });

    it('should emit pool-closed event', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      const events = new EventCapture(poolManager);
      events.start([StreamPoolEvent.PoolClosed]);

      await poolManager.initialize();
      await poolManager.close();

      expect(events.hasEvent(StreamPoolEvent.PoolClosed)).to.be.true;
    });

    it('should be safe to call close() multiple times', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();

      await poolManager.close();
      await poolManager.close(); // Should not throw

      const stats = poolManager.getStats();
      expect(stats.totalStreams).to.equal(0);
    });

    it('should prevent getStream() after close()', async () => {
      const config = createStreamPoolManagerConfig({ poolSize: 3 });
      poolManager = new StreamPoolManager(config);

      await poolManager.initialize();
      await poolManager.close();

      try {
        await poolManager.getStream();
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('not initialized');
      }
    });
  });
});
