/**
 * ChunkCapture - Utility for capturing and validating streaming chunks
 *
 * @example
 * ```typescript
 * const capture = new ChunkCapture();
 *
 * await tool.useSelf({
 *   method: 'stream_data',
 *   params: {},
 *   onChunk: capture.onChunk.bind(capture)
 * });
 *
 * expect(capture.chunkCount).to.equal(5);
 * expect(capture.lastChunk).to.deep.equal({ done: true });
 * ```
 */

import { waitFor } from './wait-for.js';

export class ChunkCapture<T = any> {
  /**
   * All captured chunks in order
   */
  public allChunks: T[] = [];

  /**
   * Total number of chunks captured
   */
  public get chunkCount(): number {
    return this.allChunks.length;
  }

  /**
   * Last chunk received (undefined if no chunks)
   */
  public get lastChunk(): T | undefined {
    return this.allChunks[this.allChunks.length - 1];
  }

  /**
   * First chunk received (undefined if no chunks)
   */
  public get firstChunk(): T | undefined {
    return this.allChunks[0];
  }

  /**
   * Callback to capture chunks
   *
   * @param chunk - Chunk data
   */
  public onChunk(chunk: T): void {
    this.allChunks.push(chunk);
  }

  /**
   * Clear all captured chunks
   */
  public clear(): void {
    this.allChunks = [];
  }

  /**
   * Wait for a specific number of chunks
   *
   * @param count - Expected chunk count
   * @param timeoutMs - Maximum wait time (default: 5000ms)
   * @returns Promise that resolves when count is reached
   *
   * @example
   * ```typescript
   * await capture.waitForChunks(10);
   * ```
   */
  public async waitForChunks(
    count: number,
    timeoutMs: number = 5000
  ): Promise<void> {
    await waitFor(
      () => this.chunkCount >= count,
      timeoutMs,
      50
    );
  }

  /**
   * Wait for chunks to stop arriving
   *
   * @param quietMs - Milliseconds of no new chunks (default: 500ms)
   * @param timeoutMs - Maximum wait time (default: 10000ms)
   * @returns Promise that resolves when streaming appears complete
   *
   * @example
   * ```typescript
   * await capture.waitForComplete();
   * ```
   */
  public async waitForComplete(
    quietMs: number = 500,
    timeoutMs: number = 10000
  ): Promise<void> {
    const startTime = Date.now();
    let lastCount = this.chunkCount;
    let quietStart = Date.now();

    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Timeout: Stream did not complete after ${timeoutMs}ms`
        );
      }

      // Check if count changed
      if (this.chunkCount !== lastCount) {
        lastCount = this.chunkCount;
        quietStart = Date.now();
      }

      // Check if quiet period reached
      if (Date.now() - quietStart >= quietMs) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Find chunks matching a predicate
   *
   * @param predicate - Filter function
   * @returns Array of matching chunks
   *
   * @example
   * ```typescript
   * const errors = capture.findChunks(chunk => chunk.type === 'error');
   * ```
   */
  public findChunks(predicate: (chunk: T) => boolean): T[] {
    return this.allChunks.filter(predicate);
  }

  /**
   * Check if any chunk matches a predicate
   *
   * @param predicate - Test function
   * @returns True if any chunk matches
   *
   * @example
   * ```typescript
   * const hasError = capture.hasChunk(chunk => chunk.error);
   * ```
   */
  public hasChunk(predicate: (chunk: T) => boolean): boolean {
    return this.allChunks.some(predicate);
  }

  /**
   * Get chunks as a string (useful for text streams)
   *
   * @param separator - String to join chunks (default: '')
   * @returns Concatenated string
   *
   * @example
   * ```typescript
   * const fullText = capture.asString();
   * ```
   */
  public asString(separator: string = ''): string {
    return this.allChunks
      .map(chunk => {
        if (typeof chunk === 'string') return chunk;
        if (typeof chunk === 'object' && chunk !== null) {
          return (chunk as any).text || (chunk as any).content || JSON.stringify(chunk);
        }
        return String(chunk);
      })
      .join(separator);
  }
}
