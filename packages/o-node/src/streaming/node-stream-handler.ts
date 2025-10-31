import {
  StreamHandlerBase,
  StreamHandlerOptions,
  ProtocolBuilder,
} from '../../../o-core/src/streaming/index.js';
import { oRequest } from '@olane/o-protocol';
import { Libp2pStreamTransport } from './libp2p-stream-transport.js';

/**
 * Options for NodeStreamHandler
 */
export interface NodeStreamHandlerOptions extends StreamHandlerOptions {
  /**
   * Enable success count tracking
   */
  trackSuccessCount?: boolean;

  /**
   * Enable error count tracking
   */
  trackErrorCount?: boolean;
}

/**
 * o-node specific implementation of StreamHandlerBase.
 * Integrates with libp2p streams and tracks metrics for o-node tools.
 */
export class NodeStreamHandler extends StreamHandlerBase {
  private successCount: number = 0;
  private errorCount: number = 0;
  private transport: Libp2pStreamTransport;
  private nodeOptions: NodeStreamHandlerOptions;

  constructor(
    transport: Libp2pStreamTransport,
    options: NodeStreamHandlerOptions = {}
  ) {
    super(options);
    this.transport = transport;
    this.nodeOptions = {
      trackSuccessCount: true,
      trackErrorCount: true,
      ...options,
    };
  }

  /**
   * Get the success count (number of chunks successfully sent)
   */
  public getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get the error count
   */
  public getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.successCount = 0;
    this.errorCount = 0;
  }

  /**
   * Implementation of sendChunk using libp2p transport and protocol builder
   */
  protected async sendChunk(
    chunk: unknown,
    sequence: number,
    isLast: boolean,
    request: oRequest
  ): Promise<void> {
    // Build the JSON-RPC streaming chunk message
    const message = ProtocolBuilder.buildStreamChunkFromRequest(
      chunk,
      sequence,
      isLast,
      request
    );

    // Encode the message to bytes
    const encoded = ProtocolBuilder.encodeMessage(message);

    // Send through the transport (handles backpressure)
    await this.transport.send(encoded);

    // Track metrics if enabled
    if (this.nodeOptions.trackSuccessCount) {
      this.successCount++;
    }

    // Close the stream if this is the last chunk
    if (isLast) {
      await this.transport.close();
    }
  }

  /**
   * Hook: Called when streaming starts
   */
  protected override onStreamStart(request: oRequest): void {
    // Reset metrics for this stream
    if (this.nodeOptions.enableMetrics) {
      this.resetMetrics();
    }
  }

  /**
   * Hook: Called when streaming completes successfully
   */
  protected override onStreamComplete(request: oRequest, totalChunks: number): void {
    // Log completion if metrics enabled
    if (this.nodeOptions.enableMetrics) {
      console.log(
        `Stream completed for ${request.method}: ${totalChunks} chunks sent`
      );
    }
  }

  /**
   * Hook: Called when streaming encounters an error
   */
  protected override onStreamError(request: oRequest, error: any): void {
    // Track error count
    if (this.nodeOptions.trackErrorCount) {
      this.errorCount++;
    }

    // Log error
    console.error(`Stream error for ${request.method}:`, error);
  }

  /**
   * Reset the handler for reuse with a new transport
   */
  public reset(): void {
    // Call parent reset
    this.state = 0 as any; // Reset state (IDLE)
    this.currentSequence = 0;
    this.resetMetrics();
  }

  /**
   * Create a new NodeStreamHandler with a different transport
   * (useful for handling multiple streams)
   */
  public static create(
    transport: Libp2pStreamTransport,
    options?: NodeStreamHandlerOptions
  ): NodeStreamHandler {
    return new NodeStreamHandler(transport, options);
  }
}
