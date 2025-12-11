import { oNodeTool } from '../../src/o-node.tool.js';
import { oNodeToolConfig } from '../../src/interfaces/o-node.tool-config.js';
import { oNodeAddress } from '../../src/index.js';
import { Libp2pConfig } from '@olane/o-config';

/**
 * Test-only extension of oNodeTool that adds streaming test methods.
 * This class should only be used in test files and is not part of the production code.
 *
 * Compatible with TestEnvironment for automatic cleanup and lifecycle management.
 *
 * @example
 * ```typescript
 * import { TestEnvironment } from './helpers/index.js';
 * import { TestNodeTool } from './helpers/test-node.tool.js';
 *
 * const env = new TestEnvironment();
 * const tool = new TestNodeTool({ address: new oNodeAddress('o://test') });
 * await tool.start();
 * // TestEnvironment will handle cleanup automatically
 * ```
 */
export class TestNodeTool extends oNodeTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://test')
    });
  }

  async configure(): Promise<Libp2pConfig> {
    const config = await super.configure();
    config.connectionGater = {
      denyDialPeer: (peerId) => {
        return false;
      },
      // who can call us?
      denyInboundEncryptedConnection: (peerId, maConn) => {
        return false;
      },
    };
    return config;
  }

  /**
   * Test method that emits chunks for 10 seconds at 100ms intervals.
   * Used for testing streaming functionality across hierarchical networks.
   *
   * This method demonstrates streaming responses with AsyncGenerator,
   * which is a common pattern for real-time data processing and long-running operations.
   *
   * @returns AsyncGenerator that yields 100 chunks over 10 seconds
   * @example
   * ```typescript
   * const response = await tool.use(tool.address, {
   *   method: 'test_stream',
   *   params: {}
   * });
   *
   * for await (const chunk of response) {
   *   console.log(`Received chunk ${chunk.chunk}`);
   * }
   * ```
   */
  async *_tool_test_stream(): AsyncGenerator<any> {
    const totalDuration = 10000; // 10 seconds
    const intervalMs = 100; // 100ms between chunks
    const totalChunks = totalDuration / intervalMs; // 100 chunks

    for (let i = 0; i < totalChunks; i++) {
      yield {
        chunk: i + 1,
        total: totalChunks,
        timestamp: new Date().toISOString(),
        nodeAddress: this.address.toString(),
        message: `Chunk ${i + 1} of ${totalChunks}`,
        progress: ((i + 1) / totalChunks) * 100,
      };
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
