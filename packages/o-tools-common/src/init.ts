import { StorageTool } from '@olane/o-storage';
import { SearchTool } from './search/search.tool.js';
import { EncryptionTool } from './encryption/encryption.tool.js';
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
  ];
  await Promise.all(
    tools.map(async (tool) => {
      await tool.start();
      oNode.addChildNode(tool as any);
    }),
  );
  return tools;
};
