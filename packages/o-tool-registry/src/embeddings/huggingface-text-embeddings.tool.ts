import { oRequest } from '@olane/o-core';
import { TextEmbeddingsTool } from './text-embeddings.tool.js';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';

export class HuggingfaceTextEmbeddingsTool extends TextEmbeddingsTool {
  private model!: HuggingFaceTransformersEmbeddings;

  async initialize(): Promise<void> {
    await super.initialize();
    this.model = new HuggingFaceTransformersEmbeddings({
      model: 'Xenova/all-MiniLM-L6-v2', // TODO: make this configurable
    });
  }

  async _tool_embed_documents(request: oRequest): Promise<number[][]> {
    const { documents }: any = request.params;
    const result = await this.model.embedDocuments(documents);
    return result;
  }

  async _tool_embed_query(request: oRequest): Promise<number[]> {
    const { query }: any = request.params;
    console.log('Embedding query: ', request.params);
    const result = await this.model.embedQuery(query);
    return result;
  }
}
