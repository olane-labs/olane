import { oVirtualTool } from '@olane/o-tool';
import { oAddress } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';

export class EmbeddingsTool extends oVirtualTool {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://embeddings'),
      description:
        config.description || 'Generic base class for embeddings tools',
    });
  }
}
