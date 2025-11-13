import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamHandler } from './stream-handler.js';
import { EventEmitter } from 'events';
import type { Stream, Connection } from '@libp2p/interface';
import { oRequest, oResponse, oError, oErrorCodes } from '@olane/o-core';

// Mock Stream interface
const createMockStream = (status: string = 'open'): Stream => {
  const listeners: Map<string, Array<(event: any) => void>> = new Map();

  return {
    status,
    send: vi.fn().mockReturnValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
    onDrain: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn((event: string, handler: any) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: any) => {
      const handlers = listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }),
    // Helper to trigger events in tests
    _triggerEvent: (event: string, data: any) => {
      listeners.get(event)?.forEach((handler) => handler(data));
    },
  } as any;
};

// Mock Connection interface
const createMockConnection = (status: string = 'open'): Connection => {
  return {
    status,
    streams: [],
    newStream: vi.fn().mockImplementation(() => createMockStream()),
  } as any;
};

describe('StreamHandler', () => {
  let streamHandler: StreamHandler;

  beforeEach(() => {
    streamHandler = new StreamHandler();
  });

  describe('Message Type Detection', () => {
    it('should identify a request message', () => {
      const message = {
        jsonrpc: '2.0',
        id: '1',
        method: 'test_method',
        params: {},
      };

      expect(streamHandler.isRequest(message)).toBe(true);
      expect(streamHandler.isResponse(message)).toBe(false);
    });

    it('should identify a response message', () => {
      const message = {
        jsonrpc: '2.0',
        id: '1',
        result: { success: true },
      };

      expect(streamHandler.isResponse(message)).toBe(true);
      expect(streamHandler.isRequest(message)).toBe(false);
    });

    it('should not identify malformed message as request or response', () => {
      const message = {
        jsonrpc: '2.0',
        id: '1',
      };

      expect(streamHandler.isRequest(message)).toBe(false);
      expect(streamHandler.isResponse(message)).toBe(false);
    });

    it('should handle message with both method and result', () => {
      const message = {
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
        result: {},
      };

      // Should identify as request since method is present
      expect(streamHandler.isRequest(message)).toBe(true);
      expect(streamHandler.isResponse(message)).toBe(false);
    });
  });

  describe('Stream Lifecycle - getOrCreateStream', () => {
    it('should create a new stream with none reuse policy', async () => {
      const connection = createMockConnection();
      const protocol = '/test/1.0.0';

      const stream = await streamHandler.getOrCreateStream(connection, protocol, {
        reusePolicy: 'none',
      });

      expect(stream).toBeDefined();
      expect(connection.newStream).toHaveBeenCalledWith(protocol, expect.any(Object));
    });

    it('should reuse existing stream with reuse policy', async () => {
      const existingStream = createMockStream();
      const connection = createMockConnection();
      connection.streams = [existingStream];

      const stream = await streamHandler.getOrCreateStream(
        connection,
        '/test/1.0.0',
        { reusePolicy: 'reuse' }
      );

      expect(stream).toBe(existingStream);
      expect(connection.newStream).not.toHaveBeenCalled();
    });

    it('should create new stream when no open stream exists with reuse policy', async () => {
      const closedStream = createMockStream('closed');
      const connection = createMockConnection();
      connection.streams = [closedStream];

      const stream = await streamHandler.getOrCreateStream(
        connection,
        '/test/1.0.0',
        { reusePolicy: 'reuse' }
      );

      expect(stream).not.toBe(closedStream);
      expect(connection.newStream).toHaveBeenCalled();
    });

    it('should throw error when connection is not open', async () => {
      const connection = createMockConnection('closed');

      await expect(
        streamHandler.getOrCreateStream(connection, '/test/1.0.0')
      ).rejects.toThrow();
    });

    it('should pass configuration options to newStream', async () => {
      const connection = createMockConnection();
      const signal = new AbortController().signal;

      await streamHandler.getOrCreateStream(connection, '/test/1.0.0', {
        signal,
        maxOutboundStreams: 500,
        runOnLimitedConnection: true,
      });

      expect(connection.newStream).toHaveBeenCalledWith('/test/1.0.0', {
        signal,
        maxOutboundStreams: 500,
        runOnLimitedConnection: true,
      });
    });
  });

  describe('Stream Lifecycle - send', () => {
    it('should send data without backpressure', async () => {
      const stream = createMockStream();
      stream.send = vi.fn().mockReturnValue(true);
      const data = new TextEncoder().encode('test data');

      await streamHandler.send(stream, data);

      expect(stream.send).toHaveBeenCalledWith(data);
      expect(stream.onDrain).not.toHaveBeenCalled();
    });

    it('should wait for drain when backpressure occurs', async () => {
      const stream = createMockStream();
      stream.send = vi.fn().mockReturnValue(false);
      const data = new TextEncoder().encode('test data');

      await streamHandler.send(stream, data, { drainTimeoutMs: 5000 });

      expect(stream.send).toHaveBeenCalledWith(data);
      expect(stream.onDrain).toHaveBeenCalledWith({
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('Stream Lifecycle - close', () => {
    it('should close stream when reuse policy is none', async () => {
      const stream = createMockStream();

      await streamHandler.close(stream, { reusePolicy: 'none' });

      expect(stream.close).toHaveBeenCalled();
    });

    it('should not close stream when reuse policy is reuse', async () => {
      const stream = createMockStream();

      await streamHandler.close(stream, { reusePolicy: 'reuse' });

      expect(stream.close).not.toHaveBeenCalled();
    });

    it('should not close stream when status is not open', async () => {
      const stream = createMockStream('closed');

      await streamHandler.close(stream, { reusePolicy: 'none' });

      expect(stream.close).not.toHaveBeenCalled();
    });

    it('should handle errors during close gracefully', async () => {
      const stream = createMockStream();
      stream.close = vi.fn().mockRejectedValue(new Error('Close failed'));

      // Should not throw
      await expect(streamHandler.close(stream)).resolves.toBeUndefined();
    });
  });

  describe('Server-side - handleIncomingStream', () => {
    it('should attach message listener immediately', async () => {
      const stream = createMockStream();
      const connection = createMockConnection();
      const toolExecutor = vi.fn().mockResolvedValue({ success: true });

      await streamHandler.handleIncomingStream(stream, connection, toolExecutor);

      expect(stream.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(stream.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should execute tool when request message is received', async () => {
      const stream = createMockStream();
      const connection = createMockConnection();
      const toolExecutor = vi.fn().mockResolvedValue({ success: true });

      await streamHandler.handleIncomingStream(stream, connection, toolExecutor);

      // Simulate receiving a request
      const requestData = {
        data: new TextEncoder().encode(JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'test_method',
          params: {},
        })),
      };

      (stream as any)._triggerEvent('message', requestData);

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(toolExecutor).toHaveBeenCalled();
    });

    it('should send error response when tool execution fails', async () => {
      const stream = createMockStream();
      const connection = createMockConnection();
      const toolExecutor = vi.fn().mockRejectedValue(
        new oError(oErrorCodes.INTERNAL_ERROR, 'Tool execution failed')
      );

      await streamHandler.handleIncomingStream(stream, connection, toolExecutor);

      const requestData = {
        data: new TextEncoder().encode(JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'test_method',
          params: {},
        })),
      };

      (stream as any)._triggerEvent('message', requestData);

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(stream.send).toHaveBeenCalled();
    });

    it('should clean up listeners on stream close', async () => {
      const stream = createMockStream();
      const connection = createMockConnection();
      const toolExecutor = vi.fn();

      await streamHandler.handleIncomingStream(stream, connection, toolExecutor);

      (stream as any)._triggerEvent('close', {});

      expect(stream.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(stream.removeEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Client-side - handleOutgoingStream', () => {
    it('should resolve with response when final chunk received', async () => {
      const stream = createMockStream();
      const emitter = new EventEmitter();

      const responsePromise = streamHandler.handleOutgoingStream(stream, emitter);

      // Simulate receiving a final response
      const responseData = {
        data: new TextEncoder().encode(JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          result: { _last: true, success: true },
        })),
      };

      (stream as any)._triggerEvent('message', responseData);

      const response = await responsePromise;

      expect(response).toBeDefined();
      expect(response.result._last).toBe(true);
    });

    it('should emit chunks for streaming responses', async () => {
      const stream = createMockStream();
      const emitter = new EventEmitter();
      const chunkListener = vi.fn();

      emitter.on('chunk', chunkListener);

      const responsePromise = streamHandler.handleOutgoingStream(stream, emitter);

      // Send a chunk
      const chunkData = {
        data: new TextEncoder().encode(JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          result: { _isStreaming: true, _last: false, data: 'chunk 1' },
        })),
      };

      (stream as any)._triggerEvent('message', chunkData);

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(chunkListener).toHaveBeenCalled();

      // Send final chunk
      const finalData = {
        data: new TextEncoder().encode(JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          result: { _isStreaming: true, _last: true, data: 'final chunk' },
        })),
      };

      (stream as any)._triggerEvent('message', finalData);

      await responsePromise;
    });

    it('should reject when stream closes before response', async () => {
      const stream = createMockStream();
      const emitter = new EventEmitter();

      const responsePromise = streamHandler.handleOutgoingStream(stream, emitter);

      (stream as any)._triggerEvent('close', {});

      await expect(responsePromise).rejects.toThrow();
    });

    it('should handle abort signal', async () => {
      const stream = createMockStream();
      const emitter = new EventEmitter();
      const abortController = new AbortController();

      const responsePromise = streamHandler.handleOutgoingStream(stream, emitter, {
        signal: abortController.signal,
      });

      abortController.abort();

      // Wait for abort to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(responsePromise).rejects.toThrow();
      expect(stream.abort).toHaveBeenCalled();
    });
  });

  describe('Message Decoding', () => {
    it('should decode Uint8Array message', async () => {
      const testData = { test: 'data' };
      const encoded = new TextEncoder().encode(JSON.stringify(testData));
      const event = { data: encoded };

      const decoded = await streamHandler.decodeMessage(event);

      expect(decoded).toEqual(testData);
    });
  });
});
