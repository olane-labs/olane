import { NERTool } from './nlp/ner.tool.js';
import { HuggingfaceTextEmbeddingsTool } from './embeddings/index.js';
import { LangchainMemoryVectorStoreTool } from './vector-store/index.js';
import { IntelligenceTool } from '@olane/o-intelligence';
import { McpBridgeTool } from '@olane/o-mcp';
import { oLaneTool } from '@olane/o-lane';
import { NodeType } from '@olane/o-core';

export const initRegistryTools = async (oNode: oLaneTool): Promise<void> => {
  const params = {
    parent: oNode.address,
    leader:
      oNode.type === NodeType.LEADER
        ? oNode.address
        : oNode.hierarchyManager.leader,
  };
  const tools = [
    new NERTool({
      name: 'ner',
      ...params,
    }),
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
      ...params,
    }),
  ];
  await Promise.all(
    tools.map(async (tool) => {
      await tool.start();
      oNode.addChildNode(tool as any);
    }),
  );
};
