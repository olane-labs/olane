import { oAddress } from '@olane/o-core';
import {
  DiskStorageConfig,
  DiskStorageProvider,
} from './disk-storage-provider.tool.js';

export class oLaneStorage extends DiskStorageProvider {
  constructor(config: DiskStorageConfig) {
    super({
      ...config,
      address: oAddress.lane(),
      description: 'Disk storage provider',
    });
  }
}
