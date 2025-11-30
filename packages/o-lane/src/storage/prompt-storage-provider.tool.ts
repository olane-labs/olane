import { ToolResult } from '@olane/o-tool';
import { StorageProviderTool } from '@olane/o-storage';
import { oAddress, oRequest } from '@olane/o-core';
import { GetDataResponse } from '@olane/o-storage';
import { PROMPT_STORAGE_METHODS } from './methods/prompt-storage.methods.js';
import {
  PromptStorageConfig,
  PromptStats,
  ListPromptsResponse,
  PromptKeysResponse,
  ClearPromptResponse,
  PromptMetadata,
} from './interfaces/prompt-storage.interface.js';
import { oNodeAddress } from '@olane/o-node';

/**
 * Prompt-specific storage provider that isolates data per prompt/conversation
 * Extends StorageProviderTool to provide namespace isolation by promptId
 *
 * Features:
 * - Isolated storage namespaces per promptId
 * - Standard CRUD operations (put, get, delete, has)
 * - Prompt management (list, clear, stats)
 * - Optional TTL-based cleanup for inactive prompts
 * - Memory-efficient nested Map structure
 */
export class PromptStorageProvider extends StorageProviderTool {
  /**
   * Node address (inherited from base class)
   */
  public readonly address!: oNodeAddress;

  /**
   * Nested storage: Map<promptId, Map<key, value>>
   * Provides O(1) access with automatic namespace isolation
   */
  private storage: Map<string, Map<string, string>>;

  /**
   * Metadata tracking per prompt for stats and cleanup
   */
  private metadata: Map<string, PromptMetadata>;


  /**
   * Cleanup interval timer
   */
  private cleanupTimer?: NodeJS.Timeout;

  constructor(readonly config: PromptStorageConfig) {
    const finalConfig = {
      ...config,
      address: config.address || new oAddress('o://prompt-storage'),
      methods: PROMPT_STORAGE_METHODS,
      description:
        'Prompt-specific storage provider with isolated namespaces per conversation',
    };

    super(finalConfig);

    this.config = finalConfig;
    this.storage = new Map();
    this.metadata = new Map();
  }

  /**
   * Initialize background cleanup task if TTL is configured
   */
  async hookStartFinished(): Promise<void> {
    if (this.config.promptTTL) {
      const interval = this.config.cleanupInterval || 60000; // Default 1 minute
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredPrompts();
      }, interval);

      this.logger.info('Prompt storage cleanup enabled', {
        ttl: this.config.promptTTL,
        interval,
      });
    }

    await super.hookStartFinished();
  }

  /**
   * Store data in a prompt-specific namespace
   * ✅ Throws errors for validation failures
   * ✅ Returns raw data (base class wraps it)
   */
  async _tool_put(request: oRequest): Promise<ToolResult> {
    const { promptId, key, value } = request.params;

    // Validate required parameters
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    if (!key || typeof key !== 'string') {
      throw new Error('key is required and must be a string');
    }

    if (value === undefined || value === null) {
      throw new Error('value is required');
    }

    // Ensure prompt namespace exists
    if (!this.storage.has(promptId)) {
      this.storage.set(promptId, new Map());
      this.metadata.set(promptId, {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      });
    }

    // Store value and update metadata
    const promptStorage = this.storage.get(promptId)!;
    promptStorage.set(key, String(value));
    this.updateLastAccessed(promptId);

    // Check max prompts limit
    if (this.config.maxPrompts && this.storage.size > this.config.maxPrompts) {
      this.evictOldestPrompt();
    }

    return {
      success: true,
    };
  }

  /**
   * Retrieve data from a prompt-specific namespace
   * ✅ Throws errors for validation failures
   * ✅ Returns raw data with null for missing keys
   */
  async _tool_get(request: oRequest): Promise<GetDataResponse> {
    const { promptId, key } = request.params;

    // Validate required parameters
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    if (!key || typeof key !== 'string') {
      throw new Error('key is required and must be a string');
    }

    // Check if prompt exists
    const promptStorage = this.storage.get(promptId);
    if (!promptStorage) {
      return {
        value: null,
      };
    }

    // Get value and update metadata
    const value = promptStorage.get(key);
    if (value !== undefined) {
      this.updateLastAccessed(promptId);
    }

    return {
      value: value ?? null,
    };
  }

  /**
   * Delete a specific key from a prompt namespace
   * ✅ Throws errors for validation failures
   * ✅ Returns raw data
   */
  async _tool_delete(request: oRequest): Promise<ToolResult> {
    const { promptId, key } = request.params;

    // Validate required parameters
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    if (!key || typeof key !== 'string') {
      throw new Error('key is required and must be a string');
    }

    // Get prompt storage
    const promptStorage = this.storage.get(promptId);
    if (!promptStorage) {
      // Not an error - deleting non-existent key is idempotent
      return {
        success: true,
      };
    }

    // Delete key and update metadata
    promptStorage.delete(key);
    this.updateLastAccessed(promptId);

    // Clean up empty prompt namespace
    if (promptStorage.size === 0) {
      this.storage.delete(promptId);
      this.metadata.delete(promptId);
    }

    return {
      success: true,
    };
  }

  /**
   * Check if a key exists in a prompt namespace
   * ✅ Throws errors for validation failures
   * ✅ Returns raw data
   */
  async _tool_has(request: oRequest): Promise<ToolResult> {
    const { promptId, key } = request.params;

    // Validate required parameters
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    if (!key || typeof key !== 'string') {
      throw new Error('key is required and must be a string');
    }

    // Check existence
    const promptStorage = this.storage.get(promptId);
    const exists = promptStorage ? promptStorage.has(key) : false;

    if (exists) {
      this.updateLastAccessed(promptId);
    }

    return {
      success: exists,
    };
  }

  /**
   * List all prompt IDs with active storage
   */
  async _tool_list_prompts(_request: oRequest): Promise<ListPromptsResponse> {
    const promptIds = Array.from(this.storage.keys());

    return {
      promptIds,
      count: promptIds.length,
    };
  }

  /**
   * Clear all data for a specific prompt namespace
   */
  async _tool_clear_prompt(request: oRequest): Promise<ClearPromptResponse> {
    const { promptId } = request.params;

    // Validate required parameter
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    const promptStorage = this.storage.get(promptId);
    if (!promptStorage) {
      return {
        success: true,
        keysDeleted: 0,
      };
    }

    const keysDeleted = promptStorage.size;

    // Clear storage and metadata
    this.storage.delete(promptId);
    this.metadata.delete(promptId);

    return {
      success: true,
      keysDeleted,
    };
  }

  /**
   * Get all keys stored in a specific prompt namespace
   */
  async _tool_get_prompt_keys(request: oRequest): Promise<PromptKeysResponse> {
    const { promptId } = request.params;

    // Validate required parameter
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    const promptStorage = this.storage.get(promptId);
    if (!promptStorage) {
      return {
        keys: [],
        count: 0,
      };
    }

    const keys = Array.from(promptStorage.keys());
    this.updateLastAccessed(promptId);

    return {
      keys,
      count: keys.length,
    };
  }

  /**
   * Get statistics for a specific prompt namespace
   */
  async _tool_get_prompt_stats(request: oRequest): Promise<PromptStats> {
    const { promptId } = request.params;

    // Validate required parameter
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('promptId is required and must be a string');
    }

    const promptStorage = this.storage.get(promptId);
    const meta = this.metadata.get(promptId);

    if (!promptStorage || !meta) {
      return {
        promptId,
        keyCount: 0,
        lastAccessed: 0,
        exists: false,
      };
    }

    this.updateLastAccessed(promptId);

    return {
      promptId,
      keyCount: promptStorage.size,
      lastAccessed: meta.lastAccessed,
      exists: true,
      createdAt: meta.createdAt,
    };
  }

  /**
   * Cleanup resources on stop
   */
  async stop(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    await super.stop();
  }

  /**
   * Update last accessed timestamp for a prompt
   */
  private updateLastAccessed(promptId: string): void {
    const meta = this.metadata.get(promptId);
    if (meta) {
      meta.lastAccessed = Date.now();
    }
  }

  /**
   * Clean up prompts that haven't been accessed within TTL
   */
  private cleanupExpiredPrompts(): void {
    if (!this.config.promptTTL) return;

    const now = Date.now();
    const expiredPrompts: string[] = [];

    for (const [promptId, meta] of this.metadata.entries()) {
      if (now - meta.lastAccessed > this.config.promptTTL) {
        expiredPrompts.push(promptId);
      }
    }

    if (expiredPrompts.length > 0) {
      for (const promptId of expiredPrompts) {
        this.storage.delete(promptId);
        this.metadata.delete(promptId);
      }

      this.logger.info('Cleaned up expired prompts', {
        count: expiredPrompts.length,
        promptIds: expiredPrompts,
      });
    }
  }

  /**
   * Evict the oldest prompt when max limit is reached
   */
  private evictOldestPrompt(): void {
    let oldestPromptId: string | undefined;
    let oldestTime = Infinity;

    for (const [promptId, meta] of this.metadata.entries()) {
      if (meta.lastAccessed < oldestTime) {
        oldestTime = meta.lastAccessed;
        oldestPromptId = promptId;
      }
    }

    if (oldestPromptId) {
      this.storage.delete(oldestPromptId);
      this.metadata.delete(oldestPromptId);

      this.logger.info('Evicted oldest prompt', {
        promptId: oldestPromptId,
        lastAccessed: oldestTime,
      });
    }
  }
}
