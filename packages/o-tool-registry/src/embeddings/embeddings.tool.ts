import { oAddress } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';
import { oToolConfig } from '@olane/o-tool';

export class EmbeddingsTool extends oLaneTool {
  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://embeddings'),
      description:
        config.description || 'Generic base class for embeddings tools',
    });
  }
}
