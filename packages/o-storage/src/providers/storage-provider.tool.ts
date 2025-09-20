import { oVirtualTool, ToolResult, ToolUtils } from '@olane/o-tool';
import {
  CoreConfig,
  oAddress,
  oRequest,
  oResponse,
  StorageResolver,
} from '@olane/o-core';
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
    let key = null;
    let method: string = 'get';
    const parts = address.toString().split('/');
    const tools = await this.myTools();
    this.logger.debug('Tools: ', tools);
    if (tools.includes(parts[parts.length - 1])) {
      method = parts.pop() || 'get'; // first pop the method
      key = parts.pop(); // then pop the key
    } else {
      key = parts.pop();
    }
    this.logger.debug(
      'Determined key + method: ',
      key,
      method,
      request?.params?.method,
    );
    if (!key) {
      throw new Error('Invalid address');
    }

    // restructure the request to include the key
    const req = new oRequest({
      method: method,
      params: {
        ...request.params,
        key,
        method: method,
      },
      id: request.id,
    });

    // call the appropriate method
    const result = await this.execute(req);

    return result;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.addressResolution.addResolver(
      new StorageResolver(this.address, this.p2pNode),
    );
  }
}
