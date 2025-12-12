import { Stream, Connection } from '@olane/o-config';
import type { StreamHandlerConfig } from '@olane/o-node/src/connection/stream-handler.config.js';
import { MockP2PConnection } from './mock-p2p-connection.js';
import { MockStream } from './mock-stream.js';

/**
 * Mock StreamHandler for testing stream reuse behavior
 */
export class MockStreamHandler {
  public getOrCreateStreamCalls: Array<{
    connection: Connection;
    protocol: string;
    config: StreamHandlerConfig;
  }> = [];

  public closeCalls: Array<{
    stream: Stream;
    config: StreamHandlerConfig | undefined;
  }> = [];

  /**
   * Mock getOrCreateStream implementation
   * Mimics the real behavior of checking for reusable streams
   */
  async getOrCreateStream(
    connection: Connection,
    protocol: string,
    config: StreamHandlerConfig,
  ): Promise<Stream> {
    // Track the call
    this.getOrCreateStreamCalls.push({ connection, protocol, config });

    const mockConnection = connection as unknown as MockP2PConnection;

    // If reuse policy is 'reuse', try to find an existing stream
    if (config.reusePolicy === 'reuse') {
      const reusableStream = mockConnection.streams.find(
        (stream) =>
          stream.protocol === protocol &&
          stream.status === 'open' &&
          stream.writeStatus === 'writable' &&
          stream.remoteReadStatus === 'readable',
      );

      if (reusableStream) {
        return reusableStream as any;
      }
    }

    // Otherwise create a new stream
    return mockConnection.newStream(protocol) as any;
  }

  /**
   * Mock close implementation
   * If reusePolicy is 'reuse', doesn't actually close the stream
   */
  async close(
    stream: Stream,
    config?: StreamHandlerConfig,
  ): Promise<void> {
    // Track the call
    this.closeCalls.push({ stream, config });

    // If reuse policy is 'reuse', don't close the stream
    if (config?.reusePolicy === 'reuse') {
      return; // Stream stays open for reuse
    }

    // Otherwise, close the stream
    const mockStream = stream as unknown as MockStream;
    await mockStream.close();
  }

  /**
   * Reset call tracking
   */
  reset(): void {
    this.getOrCreateStreamCalls = [];
    this.closeCalls = [];
  }

  /**
   * Get the last getOrCreateStream call config
   */
  getLastGetOrCreateConfig(): StreamHandlerConfig | undefined {
    return this.getOrCreateStreamCalls[this.getOrCreateStreamCalls.length - 1]
      ?.config;
  }

  /**
   * Get the last close call config
   */
  getLastCloseConfig(): StreamHandlerConfig | undefined {
    return this.closeCalls[this.closeCalls.length - 1]?.config;
  }
}

/**
 * Create a mock stream handler
 */
export function createMockStreamHandler(): MockStreamHandler {
  return new MockStreamHandler();
}
