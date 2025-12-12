import { describe, it, expect, beforeEach } from '@jest/globals';
import { oLimitedConnection } from '../src/connection/o-limited-connection.js';
import { oNodeAddress } from '@olane/o-node';
import {
  createMockP2PConnection,
  createMockStream,
  createMockStreamHandler,
  MockP2PConnection,
  MockStreamHandler,
  MockStream,
} from './helpers/index.js';

describe('Error Handling & Resource Management', () => {
  const testProtocol = '/test/1.0.0';
  const testAddress = new oNodeAddress('o://test');
  const nextHopAddress = new oNodeAddress('o://next-hop');

  describe('Connection State Validation', () => {
    it('should throw error when p2pConnection is not open', async () => {
      const closedConnection = createMockP2PConnection('test-conn', 'closed');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: closedConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Should throw when trying to create stream on closed connection
      await expect(connection.getOrCreateStream()).rejects.toThrow();
    });

    it('should throw error when p2pConnection is closing', async () => {
      const closingConnection = createMockP2PConnection('test-conn', 'closing');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: closingConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      await expect(connection.getOrCreateStream()).rejects.toThrow();
    });

    it('should succeed when p2pConnection is open', async () => {
      const openConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: openConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Should not throw
      const stream = await connection.getOrCreateStream();
      expect(stream).toBeDefined();
      expect(stream.status).toBe('open');
    });
  });

  describe('Stream Creation Failures', () => {
    it('should propagate error when newStream() fails', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      // Override newStream to throw an error
      mockConnection.newStream = async () => {
        throw new Error('Stream creation failed');
      };

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      await expect(connection.getOrCreateStream()).rejects.toThrow(
        'Stream creation failed',
      );
    });

    it('should handle protocol negotiation failure', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      mockConnection.newStream = async () => {
        throw new Error('Protocol not supported');
      };

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      await expect(connection.getOrCreateStream()).rejects.toThrow(
        'Protocol not supported',
      );
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent getOrCreateStream calls', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        connection.getOrCreateStream(),
      );

      const streams = await Promise.all(promises);

      // All should succeed
      expect(streams.length).toBe(10);
      streams.forEach((stream) => {
        expect(stream).toBeDefined();
        expect(stream.protocol).toBe(testProtocol);
      });

      // With stream reuse, they should all get the same stream
      // (since the first one creates it, rest reuse it)
      const firstStream = streams[0];
      streams.forEach((stream) => {
        expect(stream).toBe(firstStream);
      });
    });

    it('should handle concurrent postTransmit calls without errors', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      const stream = await connection.getOrCreateStream();

      // Call postTransmit multiple times concurrently
      const promises = Array.from({ length: 5 }, () =>
        connection.postTransmit(stream),
      );

      // All should complete without error
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Stream should still be open (reuse policy)
      expect((stream as any).status).toBe('open');
    });

    it('should maintain stream state consistency under concurrent access', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Interleave getOrCreateStream and postTransmit calls
      const stream1 = await connection.getOrCreateStream();
      const postTransmit1 = connection.postTransmit(stream1);
      const stream2Promise = connection.getOrCreateStream();

      await postTransmit1;
      const stream2 = await stream2Promise;

      // Should reuse the same stream
      expect(stream2).toBe(stream1);
      expect(stream2.status).toBe('open');
    });
  });

  describe('Stream State Edge Cases', () => {
    it('should not reuse streams that become invalid after selection', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      // Add a stream that starts open
      const stream1 = createMockStream('stream-1', testProtocol, {
        status: 'open',
        writeStatus: 'writable',
        remoteReadStatus: 'readable',
      });
      mockConnection.addStream(stream1);

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // First call gets the stream
      const firstStream = await connection.getOrCreateStream();
      expect(firstStream).toBe(stream1);

      // Simulate stream being reset externally
      stream1.reset();

      // Next call should create a new stream (not reuse the reset one)
      const secondStream = await connection.getOrCreateStream();
      expect(secondStream).not.toBe(stream1);
      expect(secondStream.status).toBe('open');
    });

    it('should handle stream that becomes non-writable', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const stream = createMockStream('stream-1', testProtocol, {
        status: 'open',
        writeStatus: 'writable',
        remoteReadStatus: 'readable',
      });
      mockConnection.addStream(stream);

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Simulate stream becoming non-writable
      stream.writeStatus = 'closed';

      // Should create new stream instead of using non-writable one
      const newStream = await connection.getOrCreateStream();
      expect(newStream).not.toBe(stream);
      expect(newStream.writeStatus).toBe('writable');
    });

    it('should handle stream where remote side closes read', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const stream = createMockStream('stream-1', testProtocol, {
        status: 'open',
        writeStatus: 'writable',
        remoteReadStatus: 'readable',
      });
      mockConnection.addStream(stream);

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Simulate remote closing read side
      stream.remoteReadStatus = 'closed';

      // Should create new stream
      const newStream = await connection.getOrCreateStream();
      expect(newStream).not.toBe(stream);
      expect(newStream.remoteReadStatus).toBe('readable');
    });
  });

  describe('Resource Cleanup', () => {
    it('should not leak streams when reusing', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Create and reuse stream multiple times
      const stream1 = await connection.getOrCreateStream();
      await connection.postTransmit(stream1);

      const stream2 = await connection.getOrCreateStream();
      await connection.postTransmit(stream2);

      const stream3 = await connection.getOrCreateStream();
      await connection.postTransmit(stream3);

      // Should have only created ONE stream (reused for all)
      expect(mockConnection.streams.length).toBe(1);
      expect(stream1).toBe(stream2);
      expect(stream2).toBe(stream3);

      // Stream should still be open (not leaked, not closed)
      expect((stream1 as any).status).toBe('open');
      expect((stream1 as any).abortCallCount).toBe(0);
    });

    it('should track streams created but not closed prematurely', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Make 100 requests (should all reuse the same stream)
      for (let i = 0; i < 100; i++) {
        const stream = await connection.getOrCreateStream();
        await connection.postTransmit(stream as any);
      }

      // Should still only have 1 stream
      expect(mockConnection.streams.length).toBe(1);

      const stream = mockConnection.streams[0];
      expect((stream as any).status).toBe('open');
      // Stream should NEVER have been aborted/closed
      expect((stream as any).abortCallCount).toBe(0);
      expect((stream as any).closeCallCount).toBe(0);
    });

    it('should handle postTransmit being called without prior getOrCreateStream', async () => {
      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      // Create a standalone stream
      const externalStream = createMockStream('external', testProtocol);

      // Call postTransmit with it (shouldn't error)
      await expect(
        connection.postTransmit(externalStream as any),
      ).resolves.not.toThrow();

      // Verify close was called with reuse policy
      expect(mockStreamHandler.closeCalls.length).toBe(1);
      expect(mockStreamHandler.getLastCloseConfig()?.reusePolicy).toBe(
        'reuse',
      );
    });
  });

  describe('Environment Variable Edge Cases', () => {
    it('should handle very large MAX_OUTBOUND_STREAMS values', async () => {
      process.env.MAX_OUTBOUND_STREAMS = '999999';

      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      await connection.getOrCreateStream();

      const config = mockStreamHandler.getLastGetOrCreateConfig();
      expect(config?.maxOutboundStreams).toBe(999999);

      delete process.env.MAX_OUTBOUND_STREAMS;
    });

    it('should handle MAX_OUTBOUND_STREAMS = 0', async () => {
      process.env.MAX_OUTBOUND_STREAMS = '0';

      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      await connection.getOrCreateStream();

      const config = mockStreamHandler.getLastGetOrCreateConfig();
      expect(config?.maxOutboundStreams).toBe(0);

      delete process.env.MAX_OUTBOUND_STREAMS;
    });

    it('should handle negative MAX_OUTBOUND_STREAMS values', async () => {
      process.env.MAX_OUTBOUND_STREAMS = '-100';

      const mockConnection = createMockP2PConnection('test-conn', 'open');
      const mockStreamHandler = createMockStreamHandler();

      const connection = new oLimitedConnection({
        nextHopAddress,
        address: testAddress,
        p2pConnection: mockConnection as any,
        callerAddress: testAddress,
        runOnLimitedConnection: true,
      });

      (connection as any).streamHandler = mockStreamHandler;
      (connection as any).nextHopAddress = { protocol: testProtocol };

      await connection.getOrCreateStream();

      const config = mockStreamHandler.getLastGetOrCreateConfig();
      // parseInt('-100') returns -100
      expect(config?.maxOutboundStreams).toBe(-100);

      delete process.env.MAX_OUTBOUND_STREAMS;
    });
  });
});
