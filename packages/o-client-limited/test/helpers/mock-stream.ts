import { Stream } from '@olane/o-config';
import { EventEmitter } from 'events';

/**
 * Mock Stream implementation for testing
 */
export class MockStream extends EventEmitter implements Partial<Stream> {
  public id: string;
  public protocol: string;
  public status: 'open' | 'closing' | 'closed' | 'aborted' | 'reset';
  public writeStatus: 'writable' | 'closing' | 'closed';
  public readStatus: 'readable' | 'closing' | 'closed';
  public remoteReadStatus: 'readable' | 'closing' | 'closed';
  public timeline: {
    open: number;
    close?: number;
  };
  public direction: 'inbound' | 'outbound';
  public abortCallCount: number = 0;
  public closeCallCount: number = 0;

  constructor(
    id: string,
    protocol: string,
    options: {
      status?: 'open' | 'closing' | 'closed' | 'aborted' | 'reset';
      writeStatus?: 'writable' | 'closing' | 'closed';
      readStatus?: 'readable' | 'closing' | 'closed';
      remoteReadStatus?: 'readable' | 'closing' | 'closed';
      direction?: 'inbound' | 'outbound';
    } = {},
  ) {
    super();
    this.id = id;
    this.protocol = protocol;
    this.status = options.status || 'open';
    this.writeStatus = options.writeStatus || 'writable';
    this.readStatus = options.readStatus || 'readable';
    this.remoteReadStatus = options.remoteReadStatus || 'readable';
    this.direction = options.direction || 'outbound';
    this.timeline = {
      open: Date.now(),
    };
  }

  abort(err?: Error): void {
    this.abortCallCount++;
    this.status = 'aborted';
    this.writeStatus = 'closed';
    this.readStatus = 'closed';
    this.remoteReadStatus = 'closed';
    this.timeline.close = Date.now();
    this.emit('abort', err);
  }

  async close(options?: any): Promise<void> {
    this.closeCallCount++;
    this.status = 'closed';
    this.writeStatus = 'closed';
    this.readStatus = 'closed';
    this.remoteReadStatus = 'closed';
    this.timeline.close = Date.now();
    this.emit('close');
  }

  reset(): void {
    this.status = 'reset';
    this.writeStatus = 'closed';
    this.readStatus = 'closed';
    this.remoteReadStatus = 'closed';
    this.timeline.close = Date.now();
    this.emit('reset');
  }
}

/**
 * Create a mock stream with default open/writable/readable state
 */
export function createMockStream(
  id: string = 'test-stream',
  protocol: string = '/test/1.0.0',
  options?: {
    status?: 'open' | 'closing' | 'closed' | 'aborted' | 'reset';
    writeStatus?: 'writable' | 'closing' | 'closed';
    readStatus?: 'readable' | 'closing' | 'closed';
    remoteReadStatus?: 'readable' | 'closing' | 'closed';
    direction?: 'inbound' | 'outbound';
  },
): MockStream {
  return new MockStream(id, protocol, options);
}

/**
 * Create multiple mock streams
 */
export function createMockStreams(
  count: number,
  protocol: string = '/test/1.0.0',
): MockStream[] {
  return Array.from({ length: count }, (_, i) =>
    createMockStream(`stream-${i}`, protocol),
  );
}
