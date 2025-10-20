import { StorageTool } from '@olane/o-storage';
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
    new EncryptionTool({
      name: 'encryption',
      ...params,
    }),
    new SearchTool({
      name: 'search',
      ...params,
    }),
    new oApprovalTool({
      name: 'approval',
      ...params,
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
      await tool.start();
      oNode.addChildNode(tool as any);
    }),
  );
  return tools;
};
