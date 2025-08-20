import { RegistryMemoryTool } from './registry/registry-memory.tool.js';
import { oAddress, oNode } from '@olane/o-core';
import { StorageTool } from './storage/index.js';
import { SearchTool } from './search/search.tool.js';
import { SetupTool } from './setup/setup.tool.js';
import { EncryptionTool } from './encryption/encryption.tool.js';
import { EncryptedPlanStorageTool } from './plan/encrypted-plan-storage.tool.js';
import { oVirtualTool } from '@olane/o-tool';

export const initCommonTools = (oNode: oVirtualTool) => {
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
    new EncryptionTool({
      name: 'encryption',
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
    new EncryptedPlanStorageTool({
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
