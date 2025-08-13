import { oPlanStorageTool } from './plan-storage.tool.js';
import { oAddress } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { DiskStorageProvider } from '../storage/index.js';

type DiskPlanStorageBase = ReturnType<
  typeof oPlanStorageTool<typeof DiskStorageProvider>
>;

export class DiskPlanStorageTool extends oPlanStorageTool(DiskStorageProvider) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super({
      ...config,
      description: 'Disk-based plan storage for the network',
    });
  }
}
