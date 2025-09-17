import { oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import fs from 'fs/promises';
import { STORAGE_PARAMS } from '../methods/storage.methods.js';
import { GetDataResponse } from '../interfaces/get-data.response.js';
import { DiskStorageProvider } from './disk-storage-provider.tool.js';

// Extend the config interface to include storage directory
interface DiskStorageConfig extends oToolConfig {
  storageDir?: string;
  address?: oAddress;
}

// Type for Node.js file system errors
interface NodeError extends Error {
  code?: string;
}

export class SecureStorageProvider extends DiskStorageProvider {
  constructor(config: DiskStorageConfig) {
    super({
      ...config,
      address: config.address || new oAddress('o://secure-storage'),
      methods: STORAGE_PARAMS,
      description: 'Secure storage provider',
    });
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

      // encrypt the value
      const response = await this.use(new oAddress('o://encryption'), {
        method: 'encrypt',
        params: {
          value: value as string,
        },
      });

      const { value: encryptedValue } = response.result.data as ToolResult;

      // Store the data as JSON with metadata
      const data = {
        value: encryptedValue,
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
    const { value } = JSON.parse(fileContent);

    // decrypt the value
    const response = await this.use(new oAddress('o://encryption'), {
      method: 'decrypt',
      params: {
        value: value as string,
      },
    });

    const { value: decryptedValue } = response.result.data as ToolResult;

    return {
      value: decryptedValue,
    };
  }
}
