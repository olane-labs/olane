import { Stream } from '@olane/o-config';
import {
  IStreamTransport,
  StreamStatus,
  StreamTransportConfig,
} from '../../../o-core/src/streaming/index.js';

/**
 * Default configuration for libp2p stream transport
 */
const DEFAULT_CONFIG: Required<StreamTransportConfig> = {
  drainTimeoutMs: 30_000, // 30 seconds
  readTimeoutMs: 120_000, // 2 minutes
};

/**
 * libp2p-specific implementation of IStreamTransport.
 * Wraps a libp2p Stream and handles backpressure, message listening,
 * and stream lifecycle management.
 */
export class Libp2pStreamTransport implements IStreamTransport {
  private messageHandler?: (data: Uint8Array) => void;
  private config: Required<StreamTransportConfig>;

  constructor(
    private readonly stream: Stream,
    config?: StreamTransportConfig
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Get the underlying libp2p Stream (useful for advanced use cases)
   */
  public getStream(): Stream {
    return this.stream;
  }

  /**
   * Send data through the stream with backpressure handling
   */
  async send(data: Uint8Array): Promise<void> {
    // Check stream status before sending
    if (this.stream.status !== 'open') {
      throw new Error(
        `Cannot send on stream with status: ${this.stream.status}`
      );
    }

    try {
      // Attempt to send the data
      const sent = this.stream.send(data);

      // Handle backpressure if the buffer is full
      if (!sent) {
        // Wait for the stream to drain with timeout
        await this.stream.onDrain({
          signal: AbortSignal.timeout(this.config.drainTimeoutMs),
        });
      }
    } catch (error) {
      throw new Error(`Failed to send data: ${error}`);
    }
  }

  /**
   * Set up a message handler for incoming data.
   * IMPORTANT: For libp2p v3, this must be called synchronously after
   * receiving the stream to prevent buffer overflow.
   */
  onMessage(handler: (data: Uint8Array) => void): void {
    this.messageHandler = handler;

    // Attach the message listener to the stream
    // This is synchronous and must be done immediately for libp2p v3
    this.stream.addEventListener('message', (event: any) => {
      if (this.messageHandler) {
        // Extract the data from the event
        const data = event.detail;
        this.messageHandler(data);
      }
    });
  }

  /**
   * Remove the message handler
   */
  removeMessageHandler(): void {
    this.messageHandler = undefined;
    // Note: We don't remove the event listener because libp2p doesn't
    // provide a clean way to do this. The handler being undefined
    // effectively disables it.
  }

  /**
   * Close the stream and clean up resources
   */
  async close(): Promise<void> {
    try {
      if (this.stream.status === 'open' || this.stream.status === 'closing') {
        await this.stream.close();
      }
    } catch (error) {
      console.error('Error closing stream:', error);
      // Don't throw - closing errors are not critical
    } finally {
      this.removeMessageHandler();
    }
  }

  /**
   * Get the current status of the stream
   */
  getStatus(): StreamStatus {
    // Map libp2p status to our StreamStatus enum
    const status = this.stream.status;

    switch (status) {
      case 'open':
        return StreamStatus.OPEN;
      case 'closing':
        return StreamStatus.CLOSING;
      case 'closed':
        return StreamStatus.CLOSED;
      case 'reset':
        return StreamStatus.RESET;
      default:
        return StreamStatus.CLOSED;
    }
  }

  /**
   * Check if the stream is in a usable state
   */
  isOpen(): boolean {
    return this.stream.status === 'open';
  }

  /**
   * Wait for the first message with timeout
   * @param timeoutMs - Optional timeout in milliseconds (defaults to config.readTimeoutMs)
   * @returns Promise that resolves with the first message
   */
  async waitForMessage(timeoutMs?: number): Promise<Uint8Array> {
    const timeout = timeoutMs ?? this.config.readTimeoutMs;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeMessageHandler();
        reject(new Error(`Timeout waiting for message after ${timeout}ms`));
      }, timeout);

      this.onMessage((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
}
