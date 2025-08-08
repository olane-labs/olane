import { oTool, oToolConfig } from '@olane/o-tool';
import { oAddress, oVirtualNode } from '@olane/o-core';

export class AppleTool extends oTool(oVirtualNode) {
  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://apple'),
      description: config.description || 'Base class tool for Apple tools',
    });
  }
}
