import { ToolResult } from '@olane/o-tool';
import { oRequest } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress, oNodeToolConfig } from '@olane/o-node';
import { EXAMPLE_METHODS } from './methods/example.methods.js';

/**
 * ExampleTool - A template demonstrating oLane tool best practices
 *
 * This tool provides example implementations of common patterns:
 * - Tool class structure and initialization
 * - Method definitions and implementations
 * - Error handling
 * - Logging
 * - Configuration management
 * - Type safety with TypeScript
 *
 * Use this as a starting point for creating your own oLane tools.
 */
export class ExampleTool extends oLaneTool {
  /**
   * Create a new ExampleTool instance
   *
   * @param config - Configuration options for the tool
   *
   * @example
   * ```typescript
   * const tool = new ExampleTool({
   *   customOption: 'value',
   *   debugMode: true,
   *   timeout: 60000
   * });
   * await tool.start();
   * ```
   */
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oNodeAddress('o://example'),
      description:
        'Example tool demonstrating oLane best practices for tool development',
      methods: EXAMPLE_METHODS,
    });
  }

  /**
   * Process a message and return a result
   *
   * This method demonstrates:
   * - Parameter extraction and validation
   * - Error handling with try/catch
   * - Logging
   * - Returning structured results
   *
   * @param request - The oRequest containing method parameters
   * @returns ExampleMethodResponse with success status and result/error
   *
   * @example
   * ```typescript
   * const result = await tool.callMyTool({
   *   method: 'example_method',
   *   params: { message: 'Hello, oLane!' }
   * });
   * console.log(result.result); // "Processed: Hello, oLane!"
   * ```
   */
  async _tool_example_method(request: oRequest): Promise<ToolResult> {
    try {
      const { message, metadata } = request.params;

      // Validate required parameters
      if (!message) {
        return {
          success: false,
          error: 'Parameter "message" is required',
        };
      }

      // Process the message (example implementation)
      const result = `Processed: ${message}`;

      this.logger.info('Successfully processed message');

      return {
        success: true,
        result,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      this.logger.error('Error in example_method:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }
}
