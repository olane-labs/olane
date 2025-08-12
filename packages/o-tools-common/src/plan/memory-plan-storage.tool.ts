import { oPlanStorageTool } from './plan-storage.tool';
import { oAddress } from '@olane/o-core';
import { MemoryStorageProvider } from '../storage';
import { oToolConfig } from '@olane/o-tool';

type MemoryPlanStorageBase = ReturnType<
  typeof oPlanStorageTool<typeof MemoryStorageProvider>
>;

export class MemoryPlanStorageTool extends oPlanStorageTool(
  MemoryStorageProvider,
) {
  constructor(config: oToolConfig & { address: oAddress }) {
    super({
      ...config,
      description: 'Memory-based plan storage for the network',
    });
  }
}
