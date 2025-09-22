import { expect } from 'chai';
import { OAuthTool } from '../src/auth/oAuth.tool.js';
import { EmbeddingsTool } from '../src/embeddings/embeddings.tool.js';
import { LangchainMemoryVectorStoreTool } from '../src/vector-store/index.js';

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

  it('should verify vector-store method metadata is present', async () => {
    const vectorStoreTool = new LangchainMemoryVectorStoreTool({
      description: 'Vector store tool',
      leader: null,
      parent: null,
    });
    checkMethods(vectorStoreTool, vectorStoreTool.methods);
  });
});
