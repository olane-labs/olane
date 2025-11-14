import { ToolResult } from '@olane/o-tool';
import { StorageProviderTool } from './storage-provider.tool.js';
import { DEFAULT_CONFIG_PATH, oAddress, oRequest } from '@olane/o-core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { STORAGE_PARAMS } from '../methods/storage.methods.js';
import { GetDataResponse } from '../interfaces/get-data.response.js';
import { oNodeToolConfig } from '@olane/o-node';

// Extend the config interface to include storage directory
export interface DiskStorageConfig extends oNodeToolConfig {
  storageDir?: string;
  address?: oAddress;
}

// Type for Node.js file system errors
interface NodeError extends Error {
  code?: string;
}

export class DiskStorageProvider extends StorageProviderTool {
  private storageDir: string;

  constructor(config: DiskStorageConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://disk'),
      methods: STORAGE_PARAMS,
      description: 'Disk storage provider',
    });
    // Use a default storage directory, can be overridden via config
    this.storageDir =
      config.storageDir || path.join(DEFAULT_CONFIG_PATH, 'storage');
    this.ensureStorageDir();
  }

  /**
   * Ensure the storage directory exists
   */
  protected async ensureStorageDir(): Promise<void> {
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a given key
   */
  protected getFilePath(key: string): string {
    // Sanitize the key to be filesystem safe
    const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.storageDir, `${sanitizedKey}.json`);
  }

  /**
   * Store data on disk
   * @param key The key to store the data under
   * @param value The data to store
   */
  async _tool_put(request: oRequest): Promise<ToolResult> {
    try {
      await this.ensureStorageDir();
      const { key, value } = request.params;
      const filePath = this.getFilePath(key as string);

      // Store the data as JSON with metadata
      const data = {
        value: value as string,
        timestamp: new Date().toISOString(),
        key: key as string,
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to store data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Retrieve data from disk
   * @param key The key to retrieve
   * @returns The stored data or null if not found
   */
  async _tool_get(request: oRequest): Promise<GetDataResponse> {
    const { key } = request.params;

    const filePath = this.getFilePath(key as string);

    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    return data.value;
  }

  /**
   * Delete data from disk
   * @param key The key to delete
   */
  async _tool_delete(request: oRequest): Promise<ToolResult> {
    const { key } = request.params;
    try {
      const filePath = this.getFilePath(key as string);
      await fs.unlink(filePath);

      return {
        success: true,
      };
    } catch (error) {
      const nodeError = error as NodeError;
      if (nodeError.code === 'ENOENT') {
        // File doesn't exist, consider it already deleted
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: `Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if a key exists on disk
   * @param key The key to check
   * @returns Whether the key exists
   */
  async _tool_has(request: oRequest): Promise<ToolResult> {
    const { key } = request.params;
    try {
      const filePath = this.getFilePath(key as string);
      await fs.access(filePath);

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      const nodeError = error as NodeError;
      if (nodeError.code === 'ENOENT') {
        return {
          success: true,
          data: false,
        };
      }

      return {
        success: false,
        error: `Failed to check if key exists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
