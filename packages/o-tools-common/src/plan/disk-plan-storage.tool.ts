import { oPlanStorageTool } from './plan-storage.tool';
import { oAddress } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { DiskStorageProvider } from '../storage';

export class DiskPlanStorageTool extends oPlanStorageTool(DiskStorageProvider) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super({
      ...config,
      description: 'Disk-based plan storage for the network',
    });
  }
}
