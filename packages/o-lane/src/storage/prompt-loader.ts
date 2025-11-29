/**
 * Prompt Loader
 *
 * Loads and compiles prompts from PromptStorageProvider with fallback to hardcoded versions
 */

import { PromptStorageProvider } from './prompt-storage-provider.tool.js';
import {
  PROMPT_KEYS,
  PROMPT_IDS,
  StoredPromptTemplate,
} from './prompt-schema.js';
import { AGENT_PROMPT } from '../prompts/agent.prompt.js';
import { CUSTOM_AGENT_PROMPT } from '../prompts/custom.prompt.js';
import { CONFIGURE_INSTRUCTIONS } from '../prompts/configure.prompt.js';

/**
 * Loads prompts from storage and compiles them into final prompt strings
 */
export class PromptLoader {
  private cache: Map<string, StoredPromptTemplate> = new Map();
  private useStorage: boolean = true;

  constructor(private storage?: PromptStorageProvider) {
    if (!storage) {
      this.useStorage = false;
    }
  }

  /**
   * Generate agent prompt (equivalent to AGENT_PROMPT function)
   */
  async generateAgentPrompt(
    intent: string,
    context: string,
    agentHistory: string,
    extraInstructions: string,
  ): Promise<string> {
    if (!this.useStorage || !this.storage) {
      // Fallback to hardcoded version
      return AGENT_PROMPT(intent, context, agentHistory, extraInstructions);
    }

    try {
      // Load templates from storage
      const cycleInstructions = await this.loadTemplate(
        PROMPT_IDS.AGENT,
        PROMPT_KEYS.CYCLE_INSTRUCTIONS,
      );
      const outputInstructions = await this.loadTemplate(
        PROMPT_IDS.AGENT,
        PROMPT_KEYS.OUTPUT_INSTRUCTIONS,
      );

      // Compile using custom agent prompt
      return await this.generateCustomAgentPrompt(
        intent,
        context,
        agentHistory,
        cycleInstructions,
        outputInstructions,
        extraInstructions,
      );
    } catch (error) {
      // Fallback to hardcoded version on error
      console.warn('Failed to load prompts from storage, using fallback', error);
      return AGENT_PROMPT(intent, context, agentHistory, extraInstructions);
    }
  }

  /**
   * Generate custom agent prompt (equivalent to CUSTOM_AGENT_PROMPT function)
   */
  async generateCustomAgentPrompt(
    intent: string,
    context: string,
    agentHistory: string,
    cycleInstructions: string,
    outputInstructions: string,
    extraInstructions: string,
  ): Promise<string> {
    if (!this.useStorage || !this.storage) {
      // Fallback to hardcoded version
      return CUSTOM_AGENT_PROMPT(
        intent,
        context,
        agentHistory,
        cycleInstructions,
        outputInstructions,
        extraInstructions,
      );
    }

    try {
      // Load base template from storage
      const baseTemplate = await this.loadTemplate(
        PROMPT_IDS.AGENT,
        PROMPT_KEYS.BASE_TEMPLATE,
      );

      // Replace placeholders with actual values
      return baseTemplate
        .replace('{{intent}}', intent)
        .replace('{{context}}', context)
        .replace('{{agentHistory}}', agentHistory)
        .replace('{{cycleInstructions}}', cycleInstructions)
        .replace('{{outputInstructions}}', outputInstructions)
        .replace('{{extraInstructions}}', extraInstructions);
    } catch (error) {
      // Fallback to hardcoded version on error
      console.warn('Failed to load base template from storage, using fallback', error);
      return CUSTOM_AGENT_PROMPT(
        intent,
        context,
        agentHistory,
        cycleInstructions,
        outputInstructions,
        extraInstructions,
      );
    }
  }

  /**
   * Load configure instructions
   */
  async loadConfigureInstructions(): Promise<string> {
    if (!this.useStorage || !this.storage) {
      // Fallback to hardcoded version
      return CONFIGURE_INSTRUCTIONS;
    }

    try {
      return await this.loadTemplate(
        PROMPT_IDS.AGENT,
        PROMPT_KEYS.CONFIGURE_INSTRUCTIONS,
      );
    } catch (error) {
      // Fallback to hardcoded version on error
      console.warn(
        'Failed to load configure instructions from storage, using fallback',
        error,
      );
      return CONFIGURE_INSTRUCTIONS;
    }
  }

  /**
   * Load a template from storage
   */
  private async loadTemplate(promptId: string, key: string): Promise<string> {
    // Check cache first
    const cacheKey = `${promptId}:${key}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.content;
    }

    if (!this.storage) {
      throw new Error('Storage not available');
    }

    // Load from storage
    const response = await this.storage.use(this.storage.address, {
      method: 'get',
      params: { promptId, key },
    });

    if (!response.result.success) {
      throw new Error(`Failed to load template: ${response.result.error}`);
    }

    const template = response.result?.data?.value as StoredPromptTemplate;
    if (!template || !template.content) {
      throw new Error(`Template not found: ${promptId}/${key}`);
    }

    // Cache for future use
    this.cache.set(cacheKey, template);

    return template.content;
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Enable or disable storage usage
   */
  setUseStorage(use: boolean): void {
    this.useStorage = use && !!this.storage;
  }
}
