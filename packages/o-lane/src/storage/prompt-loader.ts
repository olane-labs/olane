/**
 * Prompt Loader
 *
 * Loads and compiles prompts from PromptStorageProvider with fallback to hardcoded versions
 */

import { oCapabilityType } from '../capabilities/index.js';

/**
 * Loads prompts from storage and compiles them into final prompt strings
 */
export class PromptLoader {
  protected cache: Map<oCapabilityType, string> = new Map<oCapabilityType, string>();

  async loadTemplateForType(type: oCapabilityType): Promise<string> {
    throw new Error('Not implemented');
  }

}
