import { oAddress } from '@olane/o-core';
import { DiskStorageProvider } from './providers/disk-storage-provider.tool.js';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { SecureStorageProvider } from './providers/secure-storage-provider.tool.js';
import { PlaceholderTool } from './placeholder.tool.js';
import { OSConfigStorageTool } from './os-config-storage.tool.js';
import { oNodeToolConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';

export class StorageTool extends oLaneTool {
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
    let node: any = new DiskStorageProvider({
      name: 'disk',
      parent: this.address,
      leader: this.leader,
      address: new oAddress('o://disk'),
    });
    await node.start();
    this.addChildNode(node);

    node = new MemoryStorageProvider({
      name: 'memory',
      parent: this.address,
      leader: this.leader,
      address: new oAddress('o://memory'),
    });
    await node.start();
    this.addChildNode(node);

    node = new SecureStorageProvider({
      name: 'secure',
      parent: this.address,
      leader: this.leader,
      address: new oAddress('o://secure'),
    });
    await node.start();
    this.addChildNode(node);

    node = new PlaceholderTool({
      name: 'placeholder storage',
      parent: this.address,
      leader: this.leader,
    });
    await node.start();
    this.addChildNode(node);

    // Add OS Config Storage Tool for managing OS instance configurations
    // Note: This tool provides a unified interface that delegates to storage providers.
    // For Lambda/cloud deployments, use 'supabase' backend (configured in o-network-lambda).
    // For local deployments, use 'disk' or 'memory' backend.
    node = new OSConfigStorageTool({
      name: 'os-config',
      parent: this.address,
      leader: this.leader,
      storageBackend:
        (process.env.OS_CONFIG_STORAGE as 'disk' | 'memory') ||
        'disk',
    });
    await node.start();
    this.addChildNode(node);
  }
}
