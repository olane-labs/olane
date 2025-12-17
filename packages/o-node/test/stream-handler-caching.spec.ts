import { expect } from 'chai';
import { StreamHandler } from '../src/connection/stream-handler.js';
import { oAddress } from '@olane/o-core';
import type { Connection, Stream } from '@libp2p/interface';
import type { StreamHandlerConfig } from '../src/connection/stream-handler.config.js';

describe('StreamHandler Address-Based Caching', () => {
  let streamHandler: StreamHandler;
  let mockConnection: Partial<Connection>;
  let mockStream: Partial<Stream>;
  let callerAddress: oAddress;
  let receiverAddress: oAddress;

  beforeEach(() => {
    streamHandler = new StreamHandler();

    // Create mock connection
    mockConnection = {
      status: 'open',
      remotePeer: {
        toString: () => 'test-peer-id',
      } as any,
      remoteAddr: {
        toString: () => '/memory/test',
      } as any,
      streams: [],
      newStream: async () => mockStream as Stream,
    } as any;

    // Create mock stream
    mockStream = {
      id: 'test-stream-id',
      status: 'open',
      writeStatus: 'writable',
      remoteReadStatus: 'readable',
      direction: 'outbound',
      protocol: '/o/test',
      addEventListener: () => {},
    } as any;

    callerAddress = new oAddress('o://caller');
    receiverAddress = new oAddress('o://receiver');
  });

  describe('getOrCreateStream with Address-Based Caching', () => {
    it('should create new stream when cache is empty', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      const stream = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      expect(stream).to.equal(mockStream);
    });

    it('should reuse cached stream with same caller-receiver pair', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      // First call creates and caches
      const stream1 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      // Second call should reuse
      const stream2 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      expect(stream1).to.equal(stream2);
    });

    it('should reuse stream bidirectionally (A→B same as B→A)', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      // First: caller → receiver
      const streamAtoB = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      const stream1 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAtoB,
      );

      // Second: receiver → caller (reversed)
      const streamBtoA = {
        callerAddress: receiverAddress,
        receiverAddress: callerAddress,
        direction: 'inbound' as const,
      };

      const stream2 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamBtoA,
      );

      // Should be the same stream due to bidirectional caching
      expect(stream1).to.equal(stream2);
    });

    it('should create new stream for different address pairs', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      const otherReceiver = new oAddress('o://other-receiver');

      // Create new mock stream for second call
      const mockStream2 = {
        ...mockStream,
        id: 'test-stream-id-2',
      };

      let streamCount = 0;
      mockConnection.newStream = async () => {
        streamCount++;
        return (streamCount === 1 ? mockStream : mockStream2) as Stream;
      };

      // First pair
      const stream1 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        {
          callerAddress,
          receiverAddress,
          direction: 'outbound',
        },
      );

      // Different pair
      const stream2 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        {
          callerAddress,
          receiverAddress: otherReceiver,
          direction: 'outbound',
        },
      );

      // Should be different streams
      expect(stream1.id).to.not.equal(stream2.id);
    });

    it('should not cache when reusePolicy is none', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'none',
      };

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      let callCount = 0;
      mockConnection.newStream = async () => {
        callCount++;
        return {
          ...mockStream,
          id: `stream-${callCount}`,
        } as Stream;
      };

      const stream1 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      const stream2 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      // Should be different streams (not cached)
      expect(stream1.id).to.not.equal(stream2.id);
    });

    it('should remove non-reusable streams from cache', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      // First call creates and caches
      const stream1 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      // Make stream non-reusable
      mockStream.status = 'closed';

      // Create new mock stream for second call
      const mockStream2 = {
        ...mockStream,
        id: 'test-stream-id-2',
        status: 'open',
      };

      mockConnection.newStream = async () => mockStream2 as Stream;

      // Second call should create new stream (old one not reusable)
      const stream2 = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      expect(stream1.id).to.not.equal(stream2.id);
    });

    it('should fall back to protocol-based check when addresses not provided', async () => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      // Add mock stream to connection streams
      mockConnection.streams = [mockStream as Stream];

      // Call without streamAddresses
      const stream = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
      );

      // Should find and return the existing stream by protocol
      expect(stream).to.equal(mockStream);
    });
  });

  describe('extractRemotePeerAddress', () => {
    it('should extract address from connection peer ID', () => {
      const address = streamHandler.extractRemotePeerAddress(
        mockConnection as Connection,
      );

      expect(address.value).to.include('o://peer/');
      expect(address.value).to.include('test-peer-id');
    });
  });

  describe('cacheInboundStream', () => {
    it('should cache inbound stream when reuse is enabled', async () => {
      streamHandler.cacheInboundStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'reuse',
      );

      // Try to get the cached stream
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      const stream = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      // Should reuse the cached inbound stream
      expect(stream).to.equal(mockStream);
    });

    it('should not cache when reusePolicy is none', async () => {
      streamHandler.cacheInboundStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'none',
      );

      // Try to get stream - should create new one
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      const newMockStream = { ...mockStream, id: 'new-stream-id' };
      mockConnection.newStream = async () => newMockStream as Stream;

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      const stream = await streamHandler.getOrCreateStream(
        mockConnection as Connection,
        '/o/test',
        config,
        streamAddresses,
      );

      // Should not reuse (was not cached)
      expect(stream.id).to.equal('new-stream-id');
    });

    it('should not cache duplicate streams', () => {
      // Cache first time
      streamHandler.cacheInboundStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'reuse',
      );

      // Try to cache again - should be no-op
      streamHandler.cacheInboundStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'reuse',
      );

      // No error should occur, and stream should still be cached
      // (This test mainly ensures no exception is thrown)
    });
  });

  describe('Stream Cleanup', () => {
    it('should remove stream from cache on close event', (done) => {
      const config: StreamHandlerConfig = {
        reusePolicy: 'reuse',
      };

      let closeListener: (() => void) | undefined;

      // Override addEventListener to capture the close listener
      mockStream.addEventListener = (event: string, listener: any) => {
        if (event === 'close') {
          closeListener = listener;
        }
      };

      const streamAddresses = {
        callerAddress,
        receiverAddress,
        direction: 'outbound' as const,
      };

      streamHandler
        .getOrCreateStream(
          mockConnection as Connection,
          '/o/test',
          config,
          streamAddresses,
        )
        .then(() => {
          expect(closeListener).to.not.be.undefined;

          // Simulate close event
          if (closeListener) {
            closeListener();
          }

          // Create new stream for next call
          const newMockStream = { ...mockStream, id: 'new-stream-after-close' };
          mockConnection.newStream = async () => newMockStream as Stream;

          // Try to get stream again - should create new one since old one was removed
          return streamHandler.getOrCreateStream(
            mockConnection as Connection,
            '/o/test',
            config,
            streamAddresses,
          );
        })
        .then((stream) => {
          expect(stream.id).to.equal('new-stream-after-close');
          done();
        })
        .catch(done);
    });
  });
});
