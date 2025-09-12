import { expect } from 'chai';
import { OAuthTool } from '../src/auth/oAuth.tool.js';
import { EmbeddingsTool } from '../src/embeddings/embeddings.tool.js';
import { NERTool } from '../src/nlp/ner.tool.js';
import { LangchainMemoryVectorStoreTool } from '../src/vector-store/index.js';
import { IntelligenceTool } from '@olane/o-intelligence';

function checkMethods(tool: any, methods: any) {
  const tools = tool.myTools();
  for (const tool of tools) {
    expect(methods[tool]).to.not.be.undefined;
  }
}

describe('registry tool metadata tests', () => {
  it('should verify auth method metadata is present', async () => {
    const authTool = new OAuthTool({
      description: 'Auth tool',
      leader: null,
      parent: null,
    });
    checkMethods(authTool, authTool.methods);
  });

  it('should verify embeddings method metadata is present', async () => {
    const embeddingsTool = new EmbeddingsTool({
      description: 'Embeddings tool',
      leader: null,
      parent: null,
    });
    checkMethods(embeddingsTool, embeddingsTool.methods);
  });

  it('should verify intelligence method metadata is present', async () => {
    const intelligenceTool = new IntelligenceTool({
      description: 'Intelligence tool',
      leader: null,
      parent: null,
    });
    checkMethods(intelligenceTool, intelligenceTool.methods);
  });

  it('should verify nlp method metadata is present', async () => {
    const nlpTool = new NERTool({
      description: 'NLP tool',
      leader: null,
      parent: null,
    });
    checkMethods(nlpTool, nlpTool.methods);
  });

  it('should verify vector-store method metadata is present', async () => {
    const vectorStoreTool = new LangchainMemoryVectorStoreTool({
      description: 'Vector store tool',
      leader: null,
      parent: null,
    });
    checkMethods(vectorStoreTool, vectorStoreTool.methods);
  });
});
