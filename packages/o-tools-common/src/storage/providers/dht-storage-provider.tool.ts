import { oToolConfig, RunTool, ToolResult } from '@olane/o-tool';
import { StorageProviderTool } from './storage-provider.tool';
import { oAddress, oRequest } from '@olane/o-core';
import { STORAGE_PARAMS } from '../methods/storage.methods';

export class DhtStorageProvider extends StorageProviderTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://dht'),
      methods: STORAGE_PARAMS,
    });
  }

  async _tool_put(request: oRequest): Promise<ToolResult> {
    // this.p2pNode.services?.dht.put(request.params.key, request.params.value);
    return {
      success: true,
      data: 'DHT storage provider',
    };
  }

  async _tool_get(request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      data: 'DHT storage provider',
    };
  }

  async _tool_delete(request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      data: 'DHT storage provider',
    };
  }

  async _tool_has(request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      data: 'DHT storage provider',
    };
  }
}
