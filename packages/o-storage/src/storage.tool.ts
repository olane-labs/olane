import { oAddress } from '@olane/o-core';
import { DiskStorageProvider } from './providers/disk-storage-provider.tool.js';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { SecureStorageProvider } from './providers/secure-storage-provider.tool.js';
import { PlaceholderTool } from './placeholder.tool.js';
import { oNodeToolConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';

export class StorageTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://storage'),
      description: 'Tool to store and retrieve data from the network',
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    let node: any = new DiskStorageProvider({
      name: 'disk',
      parent: this.address,
      leader: this.leader,
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
  }
}
