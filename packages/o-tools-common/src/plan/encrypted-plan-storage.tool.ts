import { oPlanStorageTool } from './plan-storage.tool.js';
import { oAddress } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { SecureStorageProvider } from '../storage/index.js';

type DiskPlanStorageBase = ReturnType<
  typeof oPlanStorageTool<typeof SecureStorageProvider>
>;

export class EncryptedPlanStorageTool extends oPlanStorageTool(
  SecureStorageProvider,
) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super({
      ...config,
      description: 'Encrypted disk-based plan storage for the network',
    });
  }
}
