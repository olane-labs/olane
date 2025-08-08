import { oNode } from '@olane/o-core';
import { NERTool } from './nlp/ner.tool';
import { HuggingfaceTextEmbeddingsTool } from './embeddings';
import { LangchainMemoryVectorStoreTool } from './vector-store';
import { IntelligenceTool } from './intelligence';
import { McpBridgeTool } from './mcp';

export const initRegistryTools = (oNode: oNode) => {
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
      name: 'mcp-bridge',
      ...params,
    }),
  ];
  tools.forEach((tool) => {
    oNode.addChildNode(tool);
  });
};
