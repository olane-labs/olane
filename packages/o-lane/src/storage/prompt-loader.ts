/**
 * Prompt Loader
 *
 * Loads and compiles prompts from PromptStorageProvider with fallback to hardcoded versions
 */

import { oCapabilityType } from '../capabilities/index.js';
import { oPrompt } from '../prompts/o-prompt.js';

/**
 * Loads prompts from storage and returns oPrompt instances
 */
export class PromptLoader {
  protected cache: Map<oCapabilityType, oPrompt> = new Map<oCapabilityType, oPrompt>();

  /**
   * Load a prompt template for a given capability type
   * @param type The capability type
   * @param params Optional parameters to populate the template
   * @param provider Optional provider identifier
   * @returns oPrompt instance ready for compilation
   */
  async loadPromptForType(
    type: oCapabilityType,
    params?: any,
    provider?: string
  ): Promise<oPrompt> {
    throw new Error('Not implemented');
  }

}
