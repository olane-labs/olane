import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { VectorMemoryStorageTool } from './vector-memory.tool.js';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import { Document, DocumentInput } from '@langchain/core/documents';
import { VECTOR_STORE_PARAMS } from './methods/vector-store.methods.js';

export class LangchainMemoryVectorStoreTool extends VectorMemoryStorageTool {
  private vectorStore!: MemoryVectorStore;

  constructor(config: oToolConfig) {
    super({
      ...config,
      methods: VECTOR_STORE_PARAMS,
    });
  }

  private embeddingsTool(): EmbeddingsInterface {
    return {
      embedDocuments: async (documents: string[]) => {
        const response = await this.use(new oAddress('o://embeddings-text'), {
          method: 'embed_documents',
          params: {
            documents,
          },
        });
        return response.result.data as any;
      },
      embedQuery: async (document: string) => {
        const response = await this.use(new oAddress('o://embeddings-text'), {
          method: 'embed_query',
          params: {
            query: document,
          },
        });
        return response.result.data as any;
      },
    };
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.vectorStore = new MemoryVectorStore(this.embeddingsTool());
  }

  async _tool_add_documents(request: oRequest): Promise<any> {
    const { documents }: any = request.params;
    const docs = documents.map((doc: DocumentInput) => new Document(doc));
    const result = await this.vectorStore.addDocuments(docs);
    return result;
  }

  async _tool_delete_documents(request: oRequest): Promise<any> {
    throw new Error('Not implemented');
  }

  async _tool_update_documents(request: oRequest): Promise<any> {
    throw new Error('Not implemented');
  }

  async _tool_search_similar(request: oRequest): Promise<any> {
    const params = request.params;
    const query = params.query as string;
    const limit = params.limit as number;
    const results = await this.vectorStore.similaritySearch(query, limit);
    return results;
  }
}
