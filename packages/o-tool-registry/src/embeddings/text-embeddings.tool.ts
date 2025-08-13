import { oVirtualTool } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { TEXT_EMBEDDINGS_PARAMS } from './methods/text-embeddings.method.js';

export abstract class TextEmbeddingsTool extends oVirtualTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://embeddings-text'),
      methods: TEXT_EMBEDDINGS_PARAMS,
      description: config.description || 'Tool to generate text embeddings',
    });
  }

  abstract _tool_embed_documents(request: oRequest): Promise<number[][]>;
  abstract _tool_embed_query(request: oRequest): Promise<number[]>;
}
