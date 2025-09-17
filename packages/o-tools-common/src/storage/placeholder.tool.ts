import { oToolConfig } from '@olane/o-tool';
import { MemoryStorageProvider } from './providers/memory-storage-provider.tool.js';
import { oAddress } from '../../../../dist/src/core/o-address.js';

export class PlaceholderTool extends MemoryStorageProvider {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://placeholder'),
    });
  }
}
