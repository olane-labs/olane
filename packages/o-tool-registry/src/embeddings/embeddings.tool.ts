import { oTool } from '@olane/o-tool';
import { oAddress, oVirtualNode } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';

export class EmbeddingsTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://embeddings'),
      description:
        config.description || 'Generic base class for embeddings tools',
    });
  }
}
