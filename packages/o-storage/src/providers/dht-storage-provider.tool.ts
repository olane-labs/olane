import { ToolResult } from '@olane/o-tool';
import { StorageProviderTool } from './storage-provider.tool.js';
import { oAddress, oRequest } from '@olane/o-core';
import { STORAGE_PARAMS } from '../methods/storage.methods.js';
import { GetDataResponse } from '../interfaces/get-data.response.js';
import { oNodeToolConfig } from '@olane/o-node';

export class DhtStorageProvider extends StorageProviderTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://dht'),
      methods: STORAGE_PARAMS,
      description: 'Distributed hash table storage provider',
    });
  }

  async _tool_put(request: oRequest): Promise<ToolResult> {
    throw new Error('Not implemented');
  }

  async _tool_get(request: oRequest): Promise<GetDataResponse> {
    throw new Error('Not implemented');
  }

  async _tool_delete(request: oRequest): Promise<ToolResult> {
    throw new Error('Not implemented');
  }

  async _tool_has(request: oRequest): Promise<ToolResult> {
    throw new Error('Not implemented');
  }
}
