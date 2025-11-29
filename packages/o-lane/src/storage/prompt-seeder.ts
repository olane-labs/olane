/**
 * Prompt Seeder
 *
 * Seeds the PromptStorageProvider with prompt templates from prompts/ folder
 */

import { PromptStorageProvider } from './prompt-storage-provider.tool.js';
import {
  PROMPT_KEYS,
  PROMPT_IDS,
  PROMPT_VERSION,
  StoredPromptTemplate,
} from './prompt-schema.js';
import { BASE_TEMPLATE_SEED } from '../prompts/custom.prompt.js';
import {
  CYCLE_INSTRUCTIONS_SEED,
  OUTPUT_INSTRUCTIONS_SEED,
} from '../prompts/agent.prompt.js';
import { CONFIGURE_INSTRUCTIONS_SEED } from '../prompts/configure.prompt.js';

/**
 * Seeds the prompt storage with default prompt templates
 */
export class PromptSeeder {
  constructor(private storage: PromptStorageProvider) {}

  /**
   * Seed all default prompts into storage
   */
  async seedAll(): Promise<void> {
    await this.seedBaseTemplate();
    await this.seedCycleInstructions();
    await this.seedOutputInstructions();
    await this.seedConfigureInstructions();
  }

  /**
   * Seed the base template from custom.prompt.ts
   */
  private async seedBaseTemplate(): Promise<void> {
    const template: StoredPromptTemplate = {
      content: BASE_TEMPLATE_SEED,
      metadata: {
        version: PROMPT_VERSION,
        description: 'Base agent prompt template structure',
        lastModified: Date.now(),
        source: 'prompts/custom.prompt.ts (BASE_TEMPLATE_SEED)',
      },
    };

    await this.storage.use(this.storage.address, {
      method: 'put',
      params: {
        promptId: PROMPT_IDS.AGENT,
        key: PROMPT_KEYS.BASE_TEMPLATE,
        value: template,
      },
    });
  }

  /**
   * Seed cycle instructions from agent.prompt.ts
   */
  private async seedCycleInstructions(): Promise<void> {
    const template: StoredPromptTemplate = {
      content: CYCLE_INSTRUCTIONS_SEED,
      metadata: {
        version: PROMPT_VERSION,
        description: 'Agent cycle workflow instructions (6 steps)',
        lastModified: Date.now(),
        source: 'prompts/agent.prompt.ts (CYCLE_INSTRUCTIONS_SEED)',
      },
    };

    await this.storage.use(this.storage.address, {
      method: 'put',
      params: {
        promptId: PROMPT_IDS.AGENT,
        key: PROMPT_KEYS.CYCLE_INSTRUCTIONS,
        value: template,
      },
    });
  }

  /**
   * Seed output instructions from agent.prompt.ts
   */
  private async seedOutputInstructions(): Promise<void> {
    const template: StoredPromptTemplate = {
      content: OUTPUT_INSTRUCTIONS_SEED,
      metadata: {
        version: PROMPT_VERSION,
        description: 'Agent return format instructions',
        lastModified: Date.now(),
        source: 'prompts/agent.prompt.ts (OUTPUT_INSTRUCTIONS_SEED)',
      },
    };

    await this.storage.use(this.storage.address, {
      method: 'put',
      params: {
        promptId: PROMPT_IDS.AGENT,
        key: PROMPT_KEYS.OUTPUT_INSTRUCTIONS,
        value: template,
      },
    });
  }

  /**
   * Seed configure instructions from configure.prompt.ts
   */
  private async seedConfigureInstructions(): Promise<void> {
    const template: StoredPromptTemplate = {
      content: CONFIGURE_INSTRUCTIONS_SEED,
      metadata: {
        version: PROMPT_VERSION,
        description: 'Configure capability specific instructions',
        lastModified: Date.now(),
        source: 'prompts/configure.prompt.ts (CONFIGURE_INSTRUCTIONS_SEED)',
      },
    };

    await this.storage.use(this.storage.address, {
      method: 'put',
      params: {
        promptId: PROMPT_IDS.AGENT,
        key: PROMPT_KEYS.CONFIGURE_INSTRUCTIONS,
        value: template,
      },
    });
  }

  /**
   * Check if prompts are already seeded
   */
  async isSeeded(): Promise<boolean> {
    const response = await this.storage.use(this.storage.address, {
      method: 'has',
      params: {
        promptId: PROMPT_IDS.AGENT,
        key: PROMPT_KEYS.BASE_TEMPLATE,
      },
    });

    if (!response.result.success) {
      return false;
    }

    return response.result?.data?.exists === true;
  }

  /**
   * Clear all seeded prompts
   */
  async clearAll(): Promise<void> {
    await this.storage.use(this.storage.address, {
      method: 'clear_prompt',
      params: {
        promptId: PROMPT_IDS.AGENT,
      },
    });
  }
}
