import { LocalSearch, oAddress, oRequest } from '@olane/o-core';
import { oToolConfig, ToolResult } from '@olane/o-tool';
import { DiskStorageProvider } from './providers/disk-storage-provider.tool';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool';
import { StorageProviderTool } from './providers/storage-provider.tool';
import { GetDataResponse } from './interfaces/get-data.response';

export class StorageTool extends StorageProviderTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://storage'),
      description: 'Tool to store and retrieve data from the network',
    });
    this.addChildNode(
      new DiskStorageProvider({
        name: 'disk',
        ...config,
      }),
    );
    this.addChildNode(
      new MemoryStorageProvider({
        name: 'memory',
        address: new oAddress('o://memory'),
        ...config,
      }),
    );
  }

  async _tool_put(request: oRequest): Promise<ToolResult> {
    const result = LocalSearch.search(this, 'hello');
    // return this.use()
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
