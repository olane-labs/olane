import type { Connection } from '@libp2p/interface';
import type { Stream } from '@olane/o-config';
import { oRequest } from '@olane/o-core';
import { StreamHandler } from '../../src/connection/stream-handler.js';
import { oNodeConnectionStream } from '../../src/connection/o-node-connection-stream.js';
import { StreamPoolManagerConfig } from '../../src/index.js';

/**
 * Create a mock stream for testing
 */
export function createMockStream(
  id: string = 'test-stream',
  options: {
    status?: 'open' | 'closed' | 'reset';
    writeStatus?: 'writable' | 'writing' | 'closed';
    readStatus?: 'readable' | 'reading' | 'closed';
    remoteReadStatus?: 'readable' | 'reading' | 'closed';
  } = {},
): any {
  const stream = {
    id,
    status: options.status || 'open',
    writeStatus: options.writeStatus || 'writable',
    readStatus: options.readStatus || 'readable',
    remoteReadStatus: options.remoteReadStatus || 'readable',
    protocol: '/test/1.0.0',
    direction: 'outbound',
    timeline: { open: Date.now() },
    source: [],
    sink: async () => {},
    close: async () => {},
    closeRead: async () => {},
    closeWrite: async () => {},
    abort: async () => {},
    reset: () => {
      stream.status = 'reset';
    },
  };
  return stream;
}

/**
 * Create a mock P2P connection for testing
 */
export function createMockP2PConnection(
  id: string = 'test-connection',
  status: 'open' | 'closed' = 'open',
): any {
  const streams: any[] = [];

  return {
    id,
    status,
    remotePeer: { toString: () => 'test-peer' },
    streams: () => streams,
    newStream: async (protocols: string[]) => {
      const stream = createMockStream(`stream-${streams.length}`, {
        status: 'open',
      });
      stream.protocol = protocols[0];
      streams.push(stream);
      return stream;
    },
    close: async () => {
      status = 'closed';
    },
  };
}

/**
 * Create a mock StreamHandler for testing
 */
export function createMockStreamHandler(): any {
  const handler = {
    handleIncomingStreamCalls: [] as any[],
    handleOutgoingStreamCalls: [] as any[],
    shouldFailIncoming: false,
    shouldFailOutgoing: false,
    incomingStreamPromise: null as Promise<void> | null,
    incomingStreamResolve: null as (() => void) | null,

    handleIncomingStream: async (
      stream: Stream,
      connection: Connection,
      requestHandler: (request: oRequest, stream: Stream) => Promise<any>,
    ): Promise<void> => {
      handler.handleIncomingStreamCalls.push({
        stream,
        connection,
        requestHandler,
      });

      if (handler.shouldFailIncoming) {
        throw new Error('Mock incoming stream handler failure');
      }

      // Create a promise that can be externally resolved to simulate stream closure
      return new Promise((resolve) => {
        handler.incomingStreamResolve = resolve;
      });
    },

    handleOutgoingStream: async (
      stream: Stream,
      emitter: any,
      config: any,
      requestHandler?: any,
      requestId?: string | number,
    ): Promise<any> => {
      handler.handleOutgoingStreamCalls.push({
        stream,
        emitter,
        config,
        requestHandler,
        requestId,
      });

      if (handler.shouldFailOutgoing) {
        throw new Error('Mock outgoing stream handler failure');
      }

      return { result: { success: true, data: {} } };
    },

    // Helper to simulate stream closure/failure
    simulateStreamClosure: () => {
      if (handler.incomingStreamResolve) {
        handler.incomingStreamResolve();
        handler.incomingStreamResolve = null;
      }
    },

    // Helper to simulate stream error
    simulateStreamError: () => {
      if (handler.incomingStreamResolve) {
        // Reject the promise by throwing after a small delay
        setTimeout(() => {
          throw new Error('Stream closed');
        }, 10);
      }
    },
  };

  return handler;
}

/**
 * Create a mock oNodeConnectionStream
 */
export function createMockConnectionStream(
  p2pStream?: any,
  streamType: 'dedicated-reader' | 'request-response' | 'general' = 'general',
): oNodeConnectionStream {
  const mockP2PStream = p2pStream || createMockStream();

  return new oNodeConnectionStream(mockP2PStream, {
    direction: 'outbound',
    reusePolicy: 'reuse',
    remoteAddress: { toString: () => 'o://test' } as any,
    streamType,
  });
}

/**
 * Factory for creating StreamPoolManager test config
 */
export function createStreamPoolManagerConfig(
  overrides: Partial<StreamPoolManagerConfig> = {},
): StreamPoolManagerConfig {
  const mockP2PConnection = createMockP2PConnection();
  const mockStreamHandler = createMockStreamHandler();

  let streamCounter = 0;
  const defaultConfig: StreamPoolManagerConfig = {
    poolSize: 10,
    readerStreamIndex: 0,
    streamHandler: mockStreamHandler,
    p2pConnection: mockP2PConnection,
    requestHandler: async (request: oRequest, stream: Stream) => {
      return { success: true, data: {} };
    },
    createStream: async () => {
      const p2pStream = createMockStream(`stream-${streamCounter++}`);
      return createMockConnectionStream(p2pStream, 'general');
    },
  };

  return {
    ...defaultConfig,
    ...overrides,
  };
}

/**
 * Event capture helper for testing event emissions
 */
export class EventCapture {
  private events: Array<{ type: string; data: any; timestamp: number }> = [];

  constructor(private emitter: any) {}

  /**
   * Start capturing events
   */
  start(eventNames: string[]): void {
    for (const eventName of eventNames) {
      this.emitter.on(eventName, (data: any) => {
        this.events.push({
          type: eventName,
          data,
          timestamp: Date.now(),
        });
      });
    }
  }

  /**
   * Get all captured events
   */
  getEvents(): Array<{ type: string; data: any; timestamp: number }> {
    return this.events;
  }

  /**
   * Get events of specific type
   */
  getEventsByType(type: string): any[] {
    return this.events.filter((e) => e.type === type).map((e) => e.data);
  }

  /**
   * Check if event was emitted
   */
  hasEvent(type: string): boolean {
    return this.events.some((e) => e.type === type);
  }

  /**
   * Get count of specific event type
   */
  getEventCount(type: string): number {
    return this.events.filter((e) => e.type === type).length;
  }

  /**
   * Wait for specific event
   */
  async waitForEvent(type: string, timeoutMs: number = 5000): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const event = this.events.find((e) => e.type === type);
      if (event) {
        return event.data;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error(`Timeout waiting for event: ${type}`);
  }

  /**
   * Clear captured events
   */
  clear(): void {
    this.events = [];
  }
}

/**
 * Helper to make a stream invalid
 */
export function makeStreamInvalid(stream: any): void {
  stream.p2pStream.status = 'closed';
  stream.p2pStream.writeStatus = 'closed';
}

/**
 * Helper to wait for condition with timeout
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 10,
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
