import { StorageTool, OSConfigStorageTool } from '@olane/o-storage';
import { SearchTool } from './search/search.tool.js';
import { EncryptionTool } from './encryption/encryption.tool.js';
import { oApprovalTool } from '@olane/o-approval';
import { oLaneTool } from '@olane/o-lane';

export const initCommonTools = async (oNode: oLaneTool) => {
  const params = {
    parent: oNode.address,
    leader: oNode.leader,
  };
  const tools = [
    new StorageTool({
      name: 'storage',
      ...params,
    }),
    new OSConfigStorageTool({
      name: 'os-config',
      ...params,
      storageBackend: 'disk', // Use disk storage for local deployments
    }),
    new EncryptionTool({
      name: 'encryption',
      ...params,
    }),
    new SearchTool({
      name: 'search',
      ...params,
    }),
    new oApprovalTool({
      ...params,
      name: 'approval',
      mode: 'allow', // Default mode
      preferences: {
        whitelist: [],
        blacklist: [],
        timeout: 180000, // 3 minutes
      },
    }),
  ];
  await Promise.all(
    tools.map(async (tool) => {
      (tool as any).onInitFinished(() => {
        oNode.addChildNode(tool as any);
      });
      await tool.start();
    }),
  );
  return tools;
};
