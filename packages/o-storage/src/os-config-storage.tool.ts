import { ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';
import { OS_CONFIG_METHODS } from './methods/os-config.methods.js';

export interface OSConfigStorageConfig extends oNodeToolConfig {
  /**
   * Storage backend to use for OS configuration.
   * - 'disk': Local filesystem (default for local OS)
   * - 'memory': In-memory storage (volatile)
   * - 'supabase': Cloud database storage (Lambda/cloud deployments only)
   */
  storageBackend?: 'disk' | 'memory' | 'supabase';
}

/**
 * OS Configuration Storage Tool
 *
 * Provides a unified interface for OS instance configuration management.
 * Delegates to appropriate storage providers based on environment configuration.
 *
 * Storage Backends:
 * - 'disk': Local filesystem storage (default for local OS deployments)
 * - 'memory': In-memory storage (volatile, for testing)
 * - 'supabase': Cloud database storage (Lambda/cloud deployments only)
 *
 * Note: The 'supabase' backend requires the SupabaseDBStorageProvider to be
 * initialized (o://supabase address). This is handled automatically in the
 * o-network-lambda repo but not in local deployments.
 *
 * Address: o://os-config
 */
export class OSConfigStorageTool extends oLaneTool {
  private storageBackend: 'disk' | 'memory' | 'supabase';
  private configKeyPrefix = 'os-config:';

  constructor(config: OSConfigStorageConfig) {
    super({
      ...config,
      address: new oAddress('o://os-config'),
      description: 'OS instance configuration storage management',
      methods: OS_CONFIG_METHODS,
    });

    // Determine storage backend from config or environment
    this.storageBackend =
      config.storageBackend ||
      (process.env.OS_CONFIG_STORAGE as 'disk' | 'memory' | 'supabase') ||
      'disk';

    this.logger.info(`OS Config Storage using backend: ${this.storageBackend}`);
  }

  /**
   * Get the storage address for the configured backend
   */
  private getStorageAddress(): oAddress {
    return new oAddress(`o://${this.storageBackend}`);
  }

  /**
   * Generate storage key for OS config
   */
  private getConfigKey(osName: string): string {
    return `${this.configKeyPrefix}${osName}`;
  }

  /**
   * Save OS instance configuration
   */
  async _tool_save_config(request: oRequest): Promise<ToolResult> {
    const { osName, config } = request.params;

    try {
      this.logger.debug(`Saving config for OS instance: ${osName}`);

      await this.use(this.getStorageAddress(), {
        method: 'put',
        params: {
          key: this.getConfigKey(osName as string),
          value: JSON.stringify(config),
        },
      });

      return {
        success: true,
        message: `OS configuration saved for: ${osName}`,
      };
    } catch (error) {
      this.logger.error('Failed to save OS config:', error);
      return {
        success: false,
        error: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Load OS instance configuration
   */
  async _tool_load_config(request: oRequest): Promise<ToolResult> {
    const { osName } = request.params;

    try {
      this.logger.debug(`Loading config for OS instance: ${osName}`);

      const result = await this.use(
        new oAddress(
          `${this.getStorageAddress().toString()}/${this.getConfigKey(osName as string)}`,
        ),
        {
          method: 'get',
          params: {},
        },
      );

      const configData = result.result.data as { value?: string } | undefined;

      if (!configData || !configData.value) {
        return {
          success: false,
          error: `No configuration found for OS instance: ${osName}`,
        };
      }

      return {
        success: true,
        data: JSON.parse(configData.value),
      };
    } catch (error) {
      this.logger.error('Failed to load OS config:', error);
      return {
        success: false,
        error: `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * List all OS instance configurations
   */
  async _tool_list_configs(request: oRequest): Promise<ToolResult> {
    try {
      this.logger.debug('Listing all OS configurations');

      // For disk backend, we need to list directory contents
      // For other backends, we'd need to implement a list operation
      // This is a simplified implementation
      return {
        success: true,
        message:
          'List operation not fully implemented yet - use ConfigManager.listOSInstances() for now',
        data: [],
      };
    } catch (error) {
      this.logger.error('Failed to list OS configs:', error);
      return {
        success: false,
        error: `Failed to list configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete OS instance configuration
   */
  async _tool_delete_config(request: oRequest): Promise<ToolResult> {
    const { osName } = request.params;

    try {
      this.logger.debug(`Deleting config for OS instance: ${osName}`);

      await this.use(this.getStorageAddress(), {
        method: 'delete',
        params: {
          key: this.getConfigKey(osName as string),
        },
      });

      return {
        success: true,
        message: `OS configuration deleted for: ${osName}`,
      };
    } catch (error) {
      this.logger.error('Failed to delete OS config:', error);
      return {
        success: false,
        error: `Failed to delete configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Add a lane CID to OS instance startup configuration
   */
  async _tool_add_lane_to_config(request: oRequest): Promise<ToolResult> {
    const { osName, cid } = request.params;

    try {
      this.logger.debug(
        `Adding lane ${cid} to config for OS instance: ${osName}`,
      );

      // Load current config
      const loadResult = await this._tool_load_config(
        new oRequest({
          id: request.id,
          method: request.method,
          params: {
            _connectionId: request.params._connectionId,
            _requestMethod: request.params._requestMethod,
            osName,
          },
        }),
      );

      if (!loadResult.success) {
        return loadResult;
      }

      const config = loadResult.data;

      // Initialize lanes array if it doesn't exist
      if (!config.oNetworkConfig) {
        config.oNetworkConfig = {};
      }
      if (!config.oNetworkConfig.lanes) {
        config.oNetworkConfig.lanes = [];
      }

      // Add CID if not already present
      if (!config.oNetworkConfig.lanes.includes(cid)) {
        config.oNetworkConfig.lanes.push(cid);

        // Save updated config
        await this._tool_save_config(
          new oRequest({
            id: request.id,
            method: request.method,
            params: {
              _connectionId: request.params._connectionId,
              _requestMethod: request.params._requestMethod,
              osName,
              config,
            },
          }),
        );
      }

      return {
        success: true,
        message: `Lane ${cid} added to OS configuration: ${osName}`,
      };
    } catch (error) {
      this.logger.error('Failed to add lane to OS config:', error);
      return {
        success: false,
        error: `Failed to add lane: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Remove a lane CID from OS instance startup configuration
   */
  async _tool_remove_lane_from_config(request: oRequest): Promise<ToolResult> {
    const { osName, cid } = request.params;

    try {
      this.logger.debug(
        `Removing lane ${cid} from config for OS instance: ${osName}`,
      );

      // Load current config
      const loadResult = await this._tool_load_config(
        new oRequest({
          id: request.id,
          method: request.method,
          params: {
            _connectionId: request.params._connectionId,
            _requestMethod: request.params._requestMethod,
            osName,
          },
        }),
      );

      if (!loadResult.success) {
        return loadResult;
      }

      const config = loadResult.data;

      if (!config.oNetworkConfig?.lanes) {
        return {
          success: true,
          message: 'No lanes found in configuration',
        };
      }

      // Remove CID if present
      const index = config.oNetworkConfig.lanes.indexOf(cid);
      if (index > -1) {
        config.oNetworkConfig.lanes.splice(index, 1);

        // Save updated config
        await this._tool_save_config(
          new oRequest({
            id: request.id,
            method: request.method,
            params: {
              _connectionId: request.params._connectionId,
              _requestMethod: request.params._requestMethod,
              osName,
              config,
            },
          }),
        );
      }

      return {
        success: true,
        message: `Lane ${cid} removed from OS configuration: ${osName}`,
      };
    } catch (error) {
      this.logger.error('Failed to remove lane from OS config:', error);
      return {
        success: false,
        error: `Failed to remove lane: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get all lane CIDs for an OS instance
   */
  async _tool_get_lanes(request: oRequest): Promise<ToolResult> {
    const { osName } = request.params;

    try {
      this.logger.debug(`Getting lanes for OS instance: ${osName}`);

      // Load current config
      const loadResult = await this._tool_load_config(
        new oRequest({
          id: request.id,
          method: request.method,
          params: {
            _connectionId: request.params._connectionId,
            _requestMethod: request.params._requestMethod,
            osName,
          },
        }),
      );

      if (!loadResult.success) {
        return {
          success: true,
          data: [],
        };
      }

      const config = loadResult.data;
      const lanes = config.oNetworkConfig?.lanes || [];

      return {
        success: true,
        data: lanes,
      };
    } catch (error) {
      this.logger.error('Failed to get lanes from OS config:', error);
      return {
        success: false,
        error: `Failed to get lanes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
