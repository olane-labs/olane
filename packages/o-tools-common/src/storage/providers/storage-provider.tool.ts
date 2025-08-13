import { oVirtualTool, ToolResult, ToolUtils } from '@olane/o-tool';
import { oAddress, oRequest, oResponse } from '@olane/o-core';
import { GetDataResponse } from '../interfaces/get-data.response.js';

export abstract class StorageProviderTool extends oVirtualTool {
  abstract _tool_put(request: oRequest): Promise<ToolResult>;

  abstract _tool_get(request: oRequest): Promise<GetDataResponse>;

  abstract _tool_delete(request: oRequest): Promise<ToolResult>;

  abstract _tool_has(request: oRequest): Promise<ToolResult>;

  async applyBridgeTransports(
    address: oAddress,
    request: oRequest,
  ): Promise<oResponse> {
    this.logger.debug('Applying bridge transports to address: ', address);
    // extract the key from the address
    const key = address.toString().split('/').pop();
    if (!key) {
      throw new Error('Invalid address');
    }

    // restructure the request to include the key
    request.params = {
      ...request.params,
      key,
    };

    // call the appropriate method
    const result = await this.execute(request).catch((error) => {
      this.logger.error('Error executing tool: ' + error);
      return {
        error: error.message,
      };
    });

    return ToolUtils.buildResponse(request, result, result?.error);
  }

  // async initialize(): Promise<void> {
  //   await super.initialize();
  //   this.addressResolution.addResolver(
  //     new StorageResolver(this.address, this.p2pNode),
  //   );
  // }
}
