/**
 * Prompt Storage Schema
 *
 * Defines the structure for storing prompt templates in PromptStorageProvider
 */

/**
 * Prompt storage keys for the 'agent' promptId namespace
 */
export const PROMPT_KEYS = {
  // Base template structure (from custom.prompt.ts)
  BASE_TEMPLATE: 'base_template',

  // Cycle instructions for agent workflow (from agent.prompt.ts lines 13-68)
  CYCLE_INSTRUCTIONS: 'cycle_instructions',

  // Output/return format instructions (from agent.prompt.ts lines 70-145)
  OUTPUT_INSTRUCTIONS: 'output_instructions',

  // Configure-specific instructions (from configure.prompt.ts)
  CONFIGURE_INSTRUCTIONS: 'configure_instructions',
} as const;

/**
 * Prompt namespace IDs
 */
export const PROMPT_IDS = {
  AGENT: 'agent',
  CUSTOM: 'custom',
} as const;

/**
 * Version tracking for prompt templates
 */
export const PROMPT_VERSION = '1.0.0';

/**
 * Interface for prompt template metadata
 */
export interface PromptTemplateMetadata {
  version: string;
  description: string;
  lastModified: number;
  source: string;
}

/**
 * Type for stored prompt data
 */
export interface StoredPromptTemplate {
  content: string;
  metadata: PromptTemplateMetadata;
}
