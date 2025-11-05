import { oNodeTool } from '../../src/o-node.tool.js';

/**
 * Test-only extension of oNodeTool that adds streaming test methods.
 * This class should only be used in test files and is not part of the production code.
 */
export class TestNodeTool extends oNodeTool {
  /**
   * Test method that emits chunks for 10 seconds at 100ms intervals.
   * Used for testing streaming functionality across hierarchical networks.
   *
   * @returns AsyncGenerator that yields 100 chunks over 10 seconds
   */
  async *_tool_test_stream(): AsyncGenerator<any> {
    const totalDuration = 10000; // 10 seconds
    const intervalMs = 100; // 100ms between chunks
    const totalChunks = totalDuration / intervalMs; // 100 chunks

    for (let i = 0; i < totalChunks; i++) {
      yield {
        chunk: i + 1,
        timestamp: new Date().toISOString(),
        nodeAddress: this.address.toString(),
        message: `Chunk ${i + 1} of ${totalChunks}`,
      };
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
