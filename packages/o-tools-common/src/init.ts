import { RegistryMemoryTool } from './registry/registry-memory.tool.js';
import { oAddress, oNode } from '@olane/o-core';
import { StorageTool } from './storage/index.js';
import { VaultTool } from './vault/vault.tool.js';
import { SearchTool } from './search/search.tool.js';
import { SetupTool } from './setup/setup.tool.js';
import { DiskPlanStorageTool } from './plan/disk-plan-storage.tool.js';

export const initCommonTools = (oNode: oNode) => {
  const params = {
    parent: oNode.address,
    leader: oNode.address,
  };
  const tools = [
    new RegistryMemoryTool({
      name: 'registry',
      ...params,
    }),
    new StorageTool({
      name: 'storage',
      ...params,
    }),
    new VaultTool({
      name: 'vault',
      ...params,
    }),
    new SearchTool({
      name: 'search',
      ...params,
    }),
    new SetupTool({
      name: 'setup',
      ...params,
    }),
    new DiskPlanStorageTool({
      name: 'plan',
      address: new oAddress('o://plan'),
      ...params,
    }),
  ];
  tools.forEach((tool) => {
    oNode.addChildNode(tool as any);
  });
  return tools;
};
