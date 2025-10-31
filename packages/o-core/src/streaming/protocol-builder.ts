import {
  JSONRPCStreamChunk,
  StreamingResult,
  RequestId,
  ConnectionId,
  JSONRPC_VERSION,
  oRequest,
} from '@olane/o-protocol';

/**
 * Parsed streaming chunk data
 */
export interface ParsedStreamChunk {
  data: unknown;
  sequence: number;
  isLast: boolean;
  connectionId: ConnectionId;
  requestMethod: string;
}

/**
 * Builder class for constructing and parsing JSON-RPC streaming protocol messages.
 * Provides type-safe message construction and parsing for streaming responses.
 */
export class ProtocolBuilder {
  /**
   * Build a JSON-RPC streaming chunk message
   * @param data - The data payload for this chunk
   * @param sequence - The sequence number of this chunk (starts at 1)
   * @param isLast - Whether this is the final chunk in the stream
   * @param requestId - The JSON-RPC request ID this chunk is responding to
   * @param connectionId - The connection ID from the original request
   * @param requestMethod - The method name from the original request
   * @returns A complete JSON-RPC streaming chunk message
   */
  public static buildStreamChunk(
    data: unknown,
    sequence: number,
    isLast: boolean,
    requestId: RequestId,
    connectionId: ConnectionId,
    requestMethod: string
  ): JSONRPCStreamChunk {
    const result: StreamingResult = {
      _connectionId: connectionId,
      _requestMethod: requestMethod,
      _streaming: true,
      _sequence: sequence,
      _isLast: isLast,
      _data: data,
    };

    return {
      jsonrpc: JSONRPC_VERSION,
      id: requestId,
      result,
    };
  }

  /**
   * Build a streaming chunk from an oRequest object
   * @param data - The data payload for this chunk
   * @param sequence - The sequence number of this chunk
   * @param isLast - Whether this is the final chunk
   * @param request - The original oRequest
   * @returns A complete JSON-RPC streaming chunk message
   */
  public static buildStreamChunkFromRequest(
    data: unknown,
    sequence: number,
    isLast: boolean,
    request: oRequest
  ): JSONRPCStreamChunk {
    return this.buildStreamChunk(
      data,
      sequence,
      isLast,
      request.id,
      request.params._connectionId,
      request.method
    );
  }

  /**
   * Parse a JSON-RPC response to extract streaming chunk data
   * @param message - The parsed JSON-RPC message
   * @returns Parsed chunk data if this is a streaming response, null otherwise
   */
  public static parseStreamChunk(message: any): ParsedStreamChunk | null {
    if (!this.isStreamingResponse(message)) {
      return null;
    }

    const result = message.result as StreamingResult;

    return {
      data: result._data,
      sequence: result._sequence,
      isLast: result._isLast,
      connectionId: result._connectionId,
      requestMethod: result._requestMethod,
    };
  }

  /**
   * Check if a message is a streaming response
   * @param message - The message to check
   * @returns true if the message is a streaming response
   */
  public static isStreamingResponse(message: any): boolean {
    return (
      message &&
      typeof message === 'object' &&
      message.result &&
      typeof message.result === 'object' &&
      message.result._streaming === true &&
      typeof message.result._sequence === 'number' &&
      typeof message.result._isLast === 'boolean' &&
      '_data' in message.result
    );
  }

  /**
   * Encode a message to UTF-8 bytes for transmission
   * @param message - The message to encode
   * @returns UTF-8 encoded bytes
   */
  public static encodeMessage(message: JSONRPCStreamChunk): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(message));
  }

  /**
   * Decode UTF-8 bytes to a JSON message
   * @param data - The UTF-8 encoded data
   * @returns Parsed JSON message
   */
  public static decodeMessage(data: Uint8Array): any {
    const text = new TextDecoder().decode(data);
    return JSON.parse(text);
  }
}
