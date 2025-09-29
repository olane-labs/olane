import { NERTool } from './nlp/ner.tool.js';
import { HuggingfaceTextEmbeddingsTool } from './embeddings/index.js';
import { LangchainMemoryVectorStoreTool } from './vector-store/index.js';
import { IntelligenceTool } from '@olane/o-intelligence';
import { McpBridgeTool } from '@olane/o-mcp';
import { oLaneTool } from '@olane/o-lane';

export const initRegistryTools = (oNode: oLaneTool): void => {
  const params = {
    parent: oNode.address,
    leader: oNode.address,
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
  tools.forEach((tool) => {
    oNode.addChildNode(tool as any);
  });
};
