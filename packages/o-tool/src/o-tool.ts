import { oAddress } from '@olane/o-core';
import { oToolConfig } from './interfaces/tool.interface.js';
import { oToolBase } from './o-tool.base.js';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export function oTool<T extends new (...args: any[]) => oToolBase>(Base: T): T {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args);
      const config = args[0] as oToolConfig & { address: oAddress };
    }
  };
}
