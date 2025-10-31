import { oResponse } from '../connection/o-response.js';

/**
 * Type guard to check if a value is an AsyncGenerator
 * @param value - The value to check
 * @returns true if the value is an AsyncGenerator
 */
export function isAsyncGenerator(value: any): value is AsyncGenerator {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof value[Symbol.asyncIterator] === 'function'
  );
}

/**
 * Safely iterate through an AsyncGenerator with error handling
 * @param generator - The AsyncGenerator to iterate
 * @param onChunk - Callback for each chunk
 * @param onError - Optional error handler
 * @returns Promise that resolves when iteration is complete
 */
export async function iterateAsyncGenerator<T>(
  generator: AsyncGenerator<T>,
  onChunk: (chunk: T) => Promise<void> | void,
  onError?: (error: unknown) => void
): Promise<void> {
  try {
    for await (const chunk of generator) {
      await onChunk(chunk);
    }
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}

/**
 * Create an oResponse object configured for streaming
 * @param connectionId - The connection ID
 * @param requestMethod - The request method
 * @param requestId - The request ID
 * @returns An oResponse configured for streaming
 */
export function createStreamingResponse(
  connectionId: string,
  requestMethod: string,
  requestId: string | number
): oResponse {
  const response = new oResponse({
    id: requestId,
    _connectionId: connectionId,
    _requestMethod: requestMethod,
  });
  response.isStreaming = true;
  return response;
}

/**
 * Collect all chunks from an AsyncGenerator into an array
 * Useful for testing or converting streaming responses to non-streaming
 * @param generator - The AsyncGenerator to collect from
 * @returns Promise resolving to array of all chunks
 */
export async function collectStreamChunks<T>(
  generator: AsyncGenerator<T>
): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of generator) {
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Process incoming stream data (deserialize from bytes)
 * @param data - The data to process
 * @returns Parsed message object
 */
export function processStream(data: Uint8Array): any {
  const text = new TextDecoder().decode(data);
  return JSON.parse(text);
}
