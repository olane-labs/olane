import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { DiskStorageProvider } from './providers/disk-storage-provider.tool.js';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { StorageProviderTool } from './providers/storage-provider.tool.js';
import { GetDataResponse } from './interfaces/get-data.response.js';
import { SecureStorageProvider } from './providers/secure-storage-provider.tool.js';
import { PlaceholderTool } from './placeholder.tool.js';
import { oNodeToolConfig } from '@olane/o-node';

export class StorageTool extends StorageProviderTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://storage'),
      description: 'Tool to store and retrieve data from the network',
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    const config = this.config;
    let node: any = new DiskStorageProvider({
      name: 'disk',
      ...config,
    });
    await node.start();
    this.addChildNode(node);

    node = new MemoryStorageProvider({
      name: 'memory',
      ...config,
    });
    await node.start();
    this.addChildNode(node);

    node = new SecureStorageProvider({
      name: 'secure',
      ...config,
    });
    await node.start();
    this.addChildNode(node);

    node = new PlaceholderTool({
      name: 'placeholder storage',
      ...config,
    });
    await node.start();
    this.addChildNode(node);
  }

  async _tool_put(request: oRequest): Promise<ToolResult> {
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
