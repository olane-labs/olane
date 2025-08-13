import { oToolConfig, oVirtualTool } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { SETUP_METHODS } from './methods/setup.method.js';

export class SetupTool extends oVirtualTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://setup'),
      methods: SETUP_METHODS,
      description: 'Tool to help configure default tools on the network',
    });
  }

  async validateTool(address: oAddress, method: string): Promise<ToolResult> {
    // we want to validate a specific tool
    const tool = await this.use(address, {
      method: method,
      params: {},
    });
    return {
      result: tool.result.error as any,
    };
  }

  async validateAllTools(): Promise<ToolResult> {
    // we want to validate all common tools on the network
    return {
      result: null,
    };
  }

  async _tool_validate(request: oRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { address } = params;
    if (!address) {
      // we want to validate all common tools on the network
    } else {
      // let's validate a specific tool
      const tool = await this.validateTool(
        new oAddress('o://intelligence'),
        'completion',
      );
      console.log('Validation result: ', tool?.result?.details?.parameters);
      return tool?.result?.details?.parameters;
    }

    return {
      result: null,
    };
  }

  async _tool_store_parameters(request: oRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { parameters, address } = params;
    return {
      result: null,
    };
  }
}
