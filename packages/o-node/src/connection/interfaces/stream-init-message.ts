/**
 * Message sent by limited connection clients to identify their dedicated persistent streams
 * This allows the receiver to identify which streams to use for bidirectional communication
 */
export interface StreamInitMessage {
  /**
   * Message type identifier
   */
  type: 'stream-init';

  /**
   * Role of this stream
   * - 'reader': Dedicated reader stream for receiving requests from receiver
   * - 'writer': Dedicated writer stream for sending responses back to receiver
   * - 'standard': Standard request-response stream
   */
  role: 'reader' | 'writer' | 'standard';

  /**
   * Timestamp when the stream was created
   */
  timestamp: number;

  /**
   * Optional connection identifier for correlation
   */
  connectionId?: string;
}

/**
 * Type guard to check if a message is a StreamInitMessage
 */
export function isStreamInitMessage(message: any): message is StreamInitMessage {
  return (
    message?.type === 'stream-init' &&
    (message.role === 'reader' || message.role === 'writer' || message.role === 'standard') &&
    typeof message.timestamp === 'number'
  );
}

/**
 * Acknowledgment message sent by receiver in response to stream-init
 * This confirms that the receiver has processed and registered the stream
 */
export interface StreamInitAckMessage {
  /**
   * Message type identifier
   */
  type: 'stream-init-ack';

  /**
   * Status of the initialization
   */
  status: 'success' | 'error';

  /**
   * The stream ID that was registered
   */
  streamId: string;

  /**
   * The role that was registered
   */
  role: 'reader' | 'writer' | 'standard';

  /**
   * Optional error message if status is 'error'
   */
  error?: string;

  /**
   * Timestamp when the ack was sent
   */
  timestamp: number;
}

/**
 * Type guard to check if a message is a StreamInitAckMessage
 */
export function isStreamInitAckMessage(
  message: any,
): message is StreamInitAckMessage {
  return (
    message?.type === 'stream-init-ack' &&
    (message.status === 'success' || message.status === 'error') &&
    typeof message.streamId === 'string' &&
    (message.role === 'reader' || message.role === 'writer' || message.role === 'standard') &&
    typeof message.timestamp === 'number'
  );
}
