import { oAddress } from '@olane/o-core';
import { DiskStorageProvider } from './providers/disk-storage-provider.tool.js';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { SecureStorageProvider } from './providers/secure-storage-provider.tool.js';
import { PlaceholderTool } from './placeholder.tool.js';
import { OSConfigStorageTool } from './os-config-storage.tool.js';
import { oNodeTool, oNodeToolConfig } from '@olane/o-node';

export class StorageTool extends oNodeTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://storage'),
      description:
        'Storage application tool for routing storage requests to the appropriate storage provider',
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    const tools = [
      new DiskStorageProvider({
        name: 'disk',
        parent: this.address,
        leader: this.leader,
        address: new oAddress('o://disk'),
      }),
      new MemoryStorageProvider({
        name: 'memory',
        parent: this.address,
        leader: this.leader,
        address: new oAddress('o://memory'),
      }),
      new SecureStorageProvider({
        name: 'secure',
        parent: this.address,
        leader: this.leader,
        address: new oAddress('o://secure'),
      }),
      new PlaceholderTool({
        name: 'placeholder storage',
        parent: this.address,
        leader: this.leader,
      }),
      new OSConfigStorageTool({
        name: 'os-config',
        parent: this.address,
        leader: this.leader,
        storageBackend:
          (process.env.OS_CONFIG_STORAGE as 'disk' | 'memory') || 'disk',
      }),
    ];

    for (const tool of tools) {
      (tool as any).onInitFinished(() => {
        this.addChildNode(tool);
      });
      await tool.start();
    }
  }
}
