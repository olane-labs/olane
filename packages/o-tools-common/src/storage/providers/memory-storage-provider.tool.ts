import { ToolResult } from '@olane/o-tool';
import { StorageProviderTool } from './storage-provider.tool.js';
import { CoreConfig, oAddress, oRequest } from '@olane/o-core';
import { STORAGE_PARAMS } from '../methods/storage.methods.js';
import { GetDataResponse } from '../interfaces/get-data.response.js';

export class MemoryStorageProvider extends StorageProviderTool {
  private storage: Map<string, string>;
  constructor(config: CoreConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://memory'),
      methods: STORAGE_PARAMS,
      description: 'In-memory storage provider',
    });
    this.storage = new Map();
  }

  /**
   * Store data in memory
   * @param key The key to store the data under
   * @param value The data to store
   */
  async _tool_put(request: oRequest): Promise<ToolResult> {
    const { key, value } = request.params;
    this.storage.set(key as string, value as string);
    return {
      success: true,
    };
  }

  /**
   * Retrieve data from memory
   * @param key The key to retrieve
   * @returns The stored data or null if not found
   */
  async _tool_get(request: oRequest): Promise<GetDataResponse> {
    const { key } = request.params;
    const value = this.storage.get(key as string);
    if (!value) {
      return {
        value: null,
      };
    }
    return {
      value: value,
    };
  }

  /**
   * Delete data from memory
   * @param key The key to delete``
   */
  async _tool_delete(request: oRequest): Promise<ToolResult> {
    const { key } = request.params;
    this.storage.delete(key as string);
    return {
      success: true,
    };
  }

  /**
   * Check if a key exists in memory
   * @param key The key to check
   * @returns Whether the key exists
   */
  async _tool_has(request: oRequest): Promise<ToolResult> {
    const { key } = request.params;
    return {
      success: this.storage.has(key as string),
    };
  }
}
