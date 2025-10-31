/**
 * Streaming-related type definitions for o-intelligence package
 */

/**
 * Represents a single chunk of streaming data
 */
export interface StreamChunk {
  /**
   * The text content of this chunk (token/text fragment)
   */
  text: string;

  /**
   * Whether this is a delta (incremental) chunk
   */
  delta?: boolean;

  /**
   * Current position in the stream (optional)
   */
  position?: number;

  /**
   * Whether this is the final chunk
   */
  isComplete?: boolean;

  /**
   * Model information
   */
  model?: string;

  /**
   * Additional metadata from the provider
   */
  metadata?: {
    /**
     * Finish reason (if available)
     */
    finish_reason?: string;

    /**
     * Token usage information (usually in final chunk)
     */
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };

    /**
     * Provider-specific data
     */
    [key: string]: any;
  };
}

/**
 * Configuration options for streaming
 */
export interface StreamingOptions {
  /**
   * Whether to enable streaming
   */
  enabled?: boolean;

  /**
   * Buffer size for streaming chunks (in bytes)
   */
  bufferSize?: number;

  /**
   * Timeout for reading from stream (in milliseconds)
   */
  readTimeoutMs?: number;

  /**
   * Whether to include metadata in each chunk
   */
  includeMetadata?: boolean;

  /**
   * Callback for handling errors during streaming
   */
  onError?: (error: Error) => void;

  /**
   * Callback for when streaming starts
   */
  onStart?: () => void;

  /**
   * Callback for when streaming completes
   */
  onComplete?: (totalChunks: number) => void;
}

/**
 * Streaming request parameters (extends standard completion params)
 */
export interface StreamingRequestParams {
  /**
   * The model to use
   */
  model?: string;

  /**
   * Messages for chat completion
   */
  messages?: Array<{
    role: string;
    content: string;
  }>;

  /**
   * System message
   */
  system?: string;

  /**
   * Maximum tokens to generate
   */
  max_tokens?: number;

  /**
   * Temperature (0-1 or 0-2 depending on provider)
   */
  temperature?: number;

  /**
   * Top-p sampling
   */
  top_p?: number;

  /**
   * API key for the provider
   */
  apiKey?: string;

  /**
   * Whether to stream the response
   */
  stream?: boolean;

  /**
   * Streaming-specific options
   */
  streamingOptions?: StreamingOptions;

  /**
   * Additional provider-specific parameters
   */
  [key: string]: any;
}

/**
 * Accumulator for building complete response from chunks
 */
export interface StreamAccumulator {
  /**
   * Full text accumulated so far
   */
  fullText: string;

  /**
   * Number of chunks received
   */
  chunkCount: number;

  /**
   * Timestamp when streaming started
   */
  startTime: number;

  /**
   * Whether streaming is complete
   */
  isComplete: boolean;

  /**
   * Final metadata (if available)
   */
  metadata?: StreamChunk['metadata'];
}

/**
 * Result from a completed stream
 */
export interface StreamResult {
  /**
   * Complete generated text
   */
  text: string;

  /**
   * Model used
   */
  model?: string;

  /**
   * Total chunks received
   */
  totalChunks: number;

  /**
   * Time taken (in milliseconds)
   */
  duration: number;

  /**
   * Usage information
   */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };

  /**
   * Finish reason
   */
  finish_reason?: string;

  /**
   * Whether the stream completed successfully
   */
  success: boolean;

  /**
   * Error message if stream failed
   */
  error?: string;
}
