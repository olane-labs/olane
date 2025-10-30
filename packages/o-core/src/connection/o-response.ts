import {
  JSONRPC_VERSION,
  RequestId,
  oResponse as Response,
  Result,
  StreamingResult,
} from '@olane/o-protocol';

export class oResponse implements Response {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  result: Result;

  // Streaming-specific properties
  isStreaming?: boolean;
  streamChunks?: unknown[];

  constructor(config: Result & { id: RequestId }) {
    this.jsonrpc = JSONRPC_VERSION;
    this.id = config.id;
    this.result = config;

    // Check if this is a streaming result
    if (this.isStreamingResult(config)) {
      this.isStreaming = true;
      this.streamChunks = [config._data];
    }
  }

  /**
   * Check if a result is a streaming result
   */
  private isStreamingResult(result: Result): result is StreamingResult {
    return '_streaming' in result && result._streaming === true;
  }

  /**
   * Add a chunk to a streaming response
   */
  addChunk(chunk: unknown): void {
    if (!this.isStreaming) {
      this.isStreaming = true;
      this.streamChunks = [];
    }
    this.streamChunks!.push(chunk);
  }

  /**
   * Get all accumulated chunks for a streaming response
   */
  getChunks(): unknown[] {
    return this.streamChunks || [];
  }

  toJSON(): any {
    return {
      jsonrpc: this.jsonrpc,
      id: this.id,
      result: this.result,
    };
  }

  toString(): string {
    return JSON.stringify(this);
  }
}
