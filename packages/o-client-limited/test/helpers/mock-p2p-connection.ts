import { Connection } from '@olane/o-config';
import { MockStream, createMockStream } from './mock-stream.js';

/**
 * Mock P2P Connection for testing
 */
export class MockP2PConnection implements Partial<Connection> {
  public id: string;
  public status: 'open' | 'closing' | 'closed';
  public streams: any[] = [];
  private streamIdCounter = 0;

  constructor(
    id: string = 'test-connection',
    status: 'open' | 'closing' | 'closed' = 'open',
  ) {
    this.id = id;
    this.status = status;
  }

  /**
   * Mock newStream method that creates a new MockStream
   */
  async newStream(protocol: string | string[], options?: any): Promise<any> {
    if (this.status !== 'open') {
      throw new Error(`Connection is ${this.status}, cannot create new stream`);
    }

    const protocolStr = Array.isArray(protocol) ? protocol[0] : protocol;
    const streamId = `stream-${this.id}-${this.streamIdCounter++}`;
    const stream = createMockStream(streamId, protocolStr);

    this.streams.push(stream);
    return stream;
  }

  /**
   * Add a pre-existing stream to this connection
   */
  addStream(stream: MockStream): void {
    this.streams.push(stream);
  }

  /**
   * Get all streams matching criteria
   */
  getStreams(criteria?: {
    status?: string;
    protocol?: string;
    writeStatus?: string;
    remoteReadStatus?: string;
  }): MockStream[] {
    if (!criteria) {
      return this.streams;
    }

    return this.streams.filter((stream) => {
      if (criteria.status && stream.status !== criteria.status) return false;
      if (criteria.protocol && stream.protocol !== criteria.protocol)
        return false;
      if (criteria.writeStatus && stream.writeStatus !== criteria.writeStatus)
        return false;
      if (
        criteria.remoteReadStatus &&
        stream.remoteReadStatus !== criteria.remoteReadStatus
      )
        return false;
      return true;
    });
  }

  /**
   * Close the connection and all streams
   */
  async close(options?: any): Promise<void> {
    this.status = 'closed';
    await Promise.all(this.streams.map((stream) => stream.close()));
  }
}

/**
 * Create a mock P2P connection with optional pre-configured streams
 */
export function createMockP2PConnection(
  id: string = 'test-connection',
  status: 'open' | 'closing' | 'closed' = 'open',
  streams: MockStream[] = [],
): MockP2PConnection {
  const connection = new MockP2PConnection(id, status);
  streams.forEach((stream) => connection.addStream(stream));
  return connection;
}
