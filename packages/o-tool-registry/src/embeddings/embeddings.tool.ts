import { oAddress } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oToolConfig } from '@olane/o-tool';

export class EmbeddingsTool extends oLaneTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://embeddings'),
      description:
        config.description || 'Generic base class for embeddings tools',
    });
  }
}
