/**
 * Stream status states
 */
export enum StreamStatus {
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  RESET = 'reset',
}

/**
 * Transport-agnostic interface for stream operations.
 * Implementations can use libp2p, WebSockets, HTTP/2, or any other streaming transport.
 */
export interface IStreamTransport {
  /**
   * Send data through the stream with backpressure handling
   * @param data - The data to send (UTF-8 encoded bytes)
   * @returns Promise that resolves when data is sent (handles backpressure internally)
   */
  send(data: Uint8Array): Promise<void>;

  /**
   * Set up a message handler for incoming data
   * @param handler - Callback function to handle incoming messages
   */
  onMessage(handler: (data: Uint8Array) => void): void;

  /**
   * Remove the message handler
   */
  removeMessageHandler(): void;

  /**
   * Close the stream and clean up resources
   * @returns Promise that resolves when stream is closed
   */
  close(): Promise<void>;

  /**
   * Get the current status of the stream
   * @returns The current stream status
   */
  getStatus(): StreamStatus;

  /**
   * Check if the stream is in a usable state
   * @returns true if stream can send/receive data
   */
  isOpen(): boolean;
}

/**
 * Configuration options for stream transport operations
 */
export interface StreamTransportConfig {
  /**
   * Timeout in milliseconds for drain operations when handling backpressure
   * @default 30000 (30 seconds)
   */
  drainTimeoutMs?: number;

  /**
   * Maximum time in milliseconds to wait for the first message
   * @default 120000 (2 minutes)
   */
  readTimeoutMs?: number;
}
