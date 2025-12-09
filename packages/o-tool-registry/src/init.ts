import { HuggingfaceTextEmbeddingsTool } from './embeddings/index.js';
import { LangchainMemoryVectorStoreTool } from './vector-store/index.js';
import { IntelligenceTool } from '@olane/o-intelligence';
import { McpBridgeTool } from '@olane/o-mcp';
import { oLaneTool } from '@olane/o-lane';
import { NodeType, oAddress } from '@olane/o-core';

export const initRegistryTools = async (oNode: oLaneTool): Promise<void> => {
  const params = {
    parent: oNode.address,
    leader:
      oNode.type === NodeType.LEADER
        ? oNode.address
        : oNode.hierarchyManager.leader,
  };
  const tools = [
    new IntelligenceTool({
      name: 'intelligence',
      ...params,
    }),
    new HuggingfaceTextEmbeddingsTool({
      name: 'embeddings-text',
      ...params,
    }),
    new LangchainMemoryVectorStoreTool({
      name: 'vector-store',
      ...params,
    }),
    new McpBridgeTool({
      name: 'mcp',
      address: new oAddress('o://mcp'),
      ...params,
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
};
