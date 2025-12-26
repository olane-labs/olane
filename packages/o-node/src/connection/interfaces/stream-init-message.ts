/**
 * Message sent by limited connection clients to identify their dedicated reader stream
 * This allows the receiver to identify which stream to use for sending requests back to the caller
 */
export interface StreamInitMessage {
  /**
   * Message type identifier
   */
  type: 'stream-init';

  /**
   * Role of this stream
   * - 'reader': Dedicated reader stream for receiving requests
   * - 'standard': Standard request-response stream
   */
  role: 'reader' | 'standard';

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
    (message.role === 'reader' || message.role === 'standard') &&
    typeof message.timestamp === 'number'
  );
}
