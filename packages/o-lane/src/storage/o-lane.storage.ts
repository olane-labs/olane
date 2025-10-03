import { oAddress } from '@olane/o-core';
import { DiskStorageConfig, DiskStorageProvider } from '@olane/o-storage';

export class oLaneStorage extends DiskStorageProvider {
  constructor(config: DiskStorageConfig) {
    super({
      ...config,
      address: oAddress.lane(),
      description: 'Disk storage provider',
    });
  }
}
