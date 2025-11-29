import { oNodeConfig, oNodeToolConfig } from '@olane/o-node';

/**
 * Configuration for PromptStorageProvider
 * Extends standard node tool configuration
 */
export interface PromptStorageConfig extends oNodeConfig {
  /**
   * Maximum number of prompts to keep in storage
   * Oldest prompts will be evicted when limit is reached
   * @default undefined (no limit)
   */
  maxPrompts?: number;

  /**
   * Time-to-live for inactive prompts in milliseconds
   * Prompts not accessed within this time will be automatically cleared
   * @default undefined (no automatic cleanup)
   */
  promptTTL?: number;

  /**
   * Interval for running cleanup checks in milliseconds
   * @default 60000 (1 minute)
   */
  cleanupInterval?: number;
}

/**
 * Statistics for a prompt namespace
 */
export interface PromptStats {
  /**
   * The prompt identifier
   */
  promptId: string;

  /**
   * Number of keys stored in this prompt
   */
  keyCount: number;

  /**
   * Timestamp of last access (read or write) in milliseconds
   */
  lastAccessed: number;

  /**
   * Whether this prompt currently exists in storage
   */
  exists: boolean;

  /**
   * Timestamp when the prompt was created in milliseconds
   */
  createdAt?: number;
}

/**
 * Response for list_prompts method
 */
export interface ListPromptsResponse {
  /**
   * Array of prompt IDs with active storage
   */
  promptIds: string[];

  /**
   * Total count of prompts
   */
  count: number;
}

/**
 * Response for get_prompt_keys method
 */
export interface PromptKeysResponse {
  /**
   * Array of keys in the prompt namespace
   */
  keys: string[];

  /**
   * Total count of keys
   */
  count: number;
}

/**
 * Response for clear_prompt method
 */
export interface ClearPromptResponse {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * Number of keys that were deleted
   */
  keysDeleted: number;
}

/**
 * Internal metadata tracked per prompt
 */
export interface PromptMetadata {
  /**
   * Timestamp when prompt was created
   */
  createdAt: number;

  /**
   * Timestamp of last access
   */
  lastAccessed: number;
}
