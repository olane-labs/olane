import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { TEXT_EMBEDDINGS_PARAMS } from './methods/text-embeddings.method.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';

export abstract class TextEmbeddingsTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
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
