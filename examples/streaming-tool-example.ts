/**
 * Example streaming tool demonstrating AsyncGenerator-based streaming responses
 *
 * This example shows how to:
 * 1. Create a tool method that returns an AsyncGenerator
 * 2. Stream data progressively to clients
 * 3. Handle errors during streaming
 */

import { oRequest } from '@olane/o-core';
import { oNodeTool } from '@olane/o-node';

/**
 * Example tool that demonstrates streaming capabilities
 */
export class StreamingExampleTool extends oNodeTool {
  /**
   * Regular non-streaming method (for comparison)
   * Returns all data at once
   */
  async _tool_get_items(request: oRequest): Promise<any> {
    const { count = 10 } = request.params;

    const items = [];
    for (let i = 0; i < count; i++) {
      items.push({
        id: i + 1,
        name: `Item ${i + 1}`,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      items,
      total: count,
    };
  }

  /**
   * Streaming method that yields items one at a time
   * Returns an AsyncGenerator instead of a Promise
   *
   * Usage from client:
   * ```typescript
   * for await (const chunk of client.useStreaming(address, {
   *   method: 'stream_items',
   *   params: { count: 100, delayMs: 100 }
   * })) {
   *   console.log('Received item:', chunk);
   * }
   * ```
   */
  async *_tool_stream_items(request: oRequest): AsyncGenerator<any> {
    const { count = 10, delayMs = 100 } = request.params;

    this.logger.info(`Starting to stream ${count} items with ${delayMs}ms delay`);

    for (let i = 0; i < count; i++) {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Yield a chunk of data
      yield {
        id: i + 1,
        name: `Item ${i + 1}`,
        timestamp: new Date().toISOString(),
        progress: ((i + 1) / count) * 100,
      };

      this.logger.debug(`Streamed item ${i + 1}/${count}`);
    }

    this.logger.info('Finished streaming items');
  }

  /**
   * Stream large text data in chunks (e.g., for LLM responses)
   */
  async *_tool_stream_text(request: oRequest): AsyncGenerator<any> {
    const { text = 'Default streaming text...', chunkSize = 10 } = request.params;

    this.logger.info(`Streaming text of length ${text.length} in chunks of ${chunkSize}`);

    let position = 0;
    while (position < text.length) {
      const chunk = text.substring(position, position + chunkSize);
      position += chunkSize;

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));

      yield {
        text: chunk,
        position: position - chunk.length,
        isComplete: position >= text.length,
      };
    }
  }

  /**
   * Stream results from an async data source (e.g., database query)
   */
  async *_tool_stream_query(request: oRequest): AsyncGenerator<any> {
    const { query, batchSize = 10 } = request.params;

    this.logger.info(`Executing streaming query: ${query}`);

    // Simulate paginated database query
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Simulate database fetch
      await new Promise(resolve => setTimeout(resolve, 200));

      const records = [];
      for (let i = 0; i < batchSize; i++) {
        records.push({
          id: offset + i + 1,
          data: `Record ${offset + i + 1}`,
          query,
        });
      }

      offset += batchSize;
      hasMore = offset < 50; // Simulate 50 total records

      yield {
        records,
        offset: offset - batchSize,
        batchSize: records.length,
        hasMore,
      };

      if (!hasMore) {
        this.logger.info('Query streaming complete');
      }
    }
  }

  /**
   * Stream with error handling demonstration
   */
  async *_tool_stream_with_error(request: oRequest): AsyncGenerator<any> {
    const { failAt = -1 } = request.params;

    for (let i = 0; i < 10; i++) {
      if (i === failAt) {
        throw new Error(`Intentional error at item ${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      yield {
        id: i,
        message: `Item ${i} processed successfully`,
      };
    }
  }

  /**
   * Stream metrics/progress updates for long-running operations
   */
  async *_tool_stream_progress(request: oRequest): AsyncGenerator<any> {
    const { taskName = 'Processing', totalSteps = 100 } = request.params;

    this.logger.info(`Starting task: ${taskName} with ${totalSteps} steps`);

    for (let step = 1; step <= totalSteps; step++) {
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 50));

      const progress = (step / totalSteps) * 100;
      const estimatedTimeRemaining = ((totalSteps - step) * 50) / 1000;

      yield {
        taskName,
        currentStep: step,
        totalSteps,
        progress: Math.round(progress),
        estimatedTimeRemaining: `${estimatedTimeRemaining.toFixed(1)}s`,
        status: step === totalSteps ? 'complete' : 'running',
      };
    }

    this.logger.info(`Task ${taskName} completed`);
  }
}

/**
 * Example client usage:
 *
 * ```typescript
 * import { OlaneClientTool } from '@olane/o-client';
 * import { oNodeAddress, oNodeTransport } from '@olane/o-node';
 *
 * // Initialize client
 * const client = new OlaneClientTool({
 *   privateKey: 'your-private-key',
 * });
 * await client.initialize();
 *
 * // Create address for streaming tool
 * const toolAddress = new oNodeAddress(
 *   'o://streaming-example',
 *   [new oNodeTransport('tcp://localhost:9001')]
 * );
 *
 * // Example 1: Stream items
 * console.log('Streaming items...');
 * for await (const chunk of client.useStreaming(toolAddress, {
 *   method: 'stream_items',
 *   params: { count: 20, delayMs: 100 }
 * })) {
 *   console.log(`Received: ${chunk.name} (${chunk.progress}% complete)`);
 * }
 *
 * // Example 2: Stream text (like LLM responses)
 * console.log('Streaming text...');
 * let fullText = '';
 * for await (const chunk of client.useStreaming(toolAddress, {
 *   method: 'stream_text',
 *   params: {
 *     text: 'This is a long text that will be streamed in chunks...',
 *     chunkSize: 5
 *   }
 * })) {
 *   fullText += chunk.text;
 *   process.stdout.write(chunk.text); // Print without newline
 * }
 * console.log('\nComplete text:', fullText);
 *
 * // Example 3: Stream database query results
 * console.log('Streaming query results...');
 * for await (const chunk of client.useStreaming(toolAddress, {
 *   method: 'stream_query',
 *   params: { query: 'SELECT * FROM users', batchSize: 10 }
 * })) {
 *   console.log(`Batch: ${chunk.records.length} records, hasMore: ${chunk.hasMore}`);
 *   chunk.records.forEach(record => console.log(`  - ${record.data}`));
 * }
 *
 * // Example 4: Stream progress for long operations
 * console.log('Streaming progress...');
 * for await (const chunk of client.useStreaming(toolAddress, {
 *   method: 'stream_progress',
 *   params: { taskName: 'Data Processing', totalSteps: 50 }
 * })) {
 *   console.log(
 *     `${chunk.taskName}: ${chunk.progress}% ` +
 *     `(${chunk.currentStep}/${chunk.totalSteps}) - ` +
 *     `ETA: ${chunk.estimatedTimeRemaining}`
 *   );
 * }
 *
 * // Example 5: Error handling
 * console.log('Testing error handling...');
 * try {
 *   for await (const chunk of client.useStreaming(toolAddress, {
 *     method: 'stream_with_error',
 *     params: { failAt: 5 }
 *   })) {
 *     console.log(chunk.message);
 *   }
 * } catch (error) {
 *   console.error('Stream error:', error.message);
 * }
 * ```
 */
