import fs from 'fs-extra';
import path from 'path';
import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_INSTANCE_PATH,
  DEFAULT_CONFIG_FILE,
} from '@olane/o-core';
import { OlaneOSSystemStatus } from '../o-olane-os/enum/o-os.status-enum.js';
import { OlaneOSConfig } from '../o-olane-os/index.js';
import { oNodeAddress } from '@olane/o-node';

export interface OlaneOSInstanceConfig {
  name: string;
  version: string;
  description: string;
  port: number;
  status: OlaneOSSystemStatus;
  path?: string;
  createdAt?: string;
  pid?: number;
  peerId?: string;
  transports?: string[];
  oNetworkConfig?: OlaneOSConfig;
  remoteLeaderAddress?: oNodeAddress;
}

export interface CLIConfig {
  instancesPath: string;
}

export const CONFIG_FILE_NAME = 'config.json';

export class ConfigManager {
  private static configPath = DEFAULT_CONFIG_PATH;
  private static instancesPath = DEFAULT_INSTANCE_PATH;
  private static configFile = DEFAULT_CONFIG_FILE;

  static async initialize(): Promise<void> {
    await fs.ensureDir(ConfigManager.configPath);
    await fs.ensureDir(ConfigManager.instancesPath);

    if (!(await fs.pathExists(ConfigManager.configFile))) {
      await this.writeConfig(this.getDefaultConfig());
    }
  }

  static getDefaultConfig(): CLIConfig {
    return {
      instancesPath: ConfigManager.instancesPath,
    };
  }

  static async getConfig(): Promise<CLIConfig> {
    await this.initialize();
    const config = await fs.readJson(ConfigManager.configFile);
    return { ...this.getDefaultConfig(), ...config };
  }

  static async saveConfig(config: Partial<CLIConfig>): Promise<void> {
    await this.initialize();
    const currentConfig = await this.getConfig();
    const newConfig = { ...currentConfig, ...config };
    await this.writeConfig(newConfig);
  }

  static async writeConfig(config: Partial<CLIConfig>): Promise<void> {
    await fs.writeJson(ConfigManager.configFile, config, { spaces: 2 });
  }

  static async getOSConfigFromPath(
    path: string,
  ): Promise<OlaneOSInstanceConfig | null> {
    if (await fs.pathExists(path)) {
      return await fs.readJson(path);
    }
    return null;
  }

  static async getOSConfig(
    name: string,
  ): Promise<OlaneOSInstanceConfig | null> {
    const configPath = path.join(
      ConfigManager.instancesPath,
      name,
      CONFIG_FILE_NAME,
    );
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    return null;
  }

  static async updateOSConfig(
    config: OlaneOSInstanceConfig,
  ): Promise<OlaneOSInstanceConfig | null> {
    const c = await this.getOSConfig(config.name);
    if (c) {
      await this.saveOSConfig({ ...c, ...config });
    }
    return c;
  }

  static async saveOSConfig(config: OlaneOSInstanceConfig): Promise<void> {
    const osPath = path.join(ConfigManager.instancesPath, config.name);
    await fs.ensureDir(osPath);
    await fs.writeJson(path.join(osPath, CONFIG_FILE_NAME), config, {
      spaces: 2,
    });
  }

  static async listOSInstances(): Promise<OlaneOSInstanceConfig[]> {
    try {
      await this.initialize();
      const osInstances: OlaneOSInstanceConfig[] = [];
      const osInstanceNames = await fs.readdir(ConfigManager.instancesPath);

      for (const osInstanceName of osInstanceNames) {
        const config = await this.getOSConfig(osInstanceName);
        if (config) {
          osInstances.push(config);
        }
      }

      return osInstances;
    } catch (error) {
      // if the default path for config does not exist, return an empty array
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  static async deleteOSInstance(name: string): Promise<void> {
    const osInstancePath = path.join(ConfigManager.instancesPath, name);
    if (await fs.pathExists(osInstancePath)) {
      await fs.remove(osInstancePath);
    }
  }

  /**
   * Add a lane CID to the startup lanes list for an OS instance
   * @param name - The name of the OS instance
   * @param cid - The Content ID of the lane to add
   */
  static async addLaneToCID(name: string, cid: string): Promise<void> {
    const config = await this.getOSConfig(name);
    if (!config) {
      throw new Error(`OS instance not found: ${name}`);
    }

    // Initialize lanes array if it doesn't exist
    if (!config.oNetworkConfig) {
      config.oNetworkConfig = {};
    }
    if (!config.oNetworkConfig.lanes) {
      config.oNetworkConfig.lanes = [];
    }

    // Add the CID if it's not already in the list
    if (!config.oNetworkConfig.lanes.includes(cid)) {
      config.oNetworkConfig.lanes.push(cid);
      await this.saveOSConfig(config);
    }
  }

  /**
   * Get the list of startup lane CIDs for an OS instance
   * @param name - The name of the OS instance
   * @returns Array of lane CIDs
   */
  static async getLanes(name: string): Promise<string[]> {
    const config = await this.getOSConfig(name);
    return config?.oNetworkConfig?.lanes || [];
  }

  /**
   * Remove a lane CID from the startup lanes list
   * @param name - The name of the OS instance
   * @param cid - The Content ID of the lane to remove
   */
  static async removeLane(name: string, cid: string): Promise<void> {
    const config = await this.getOSConfig(name);
    if (!config || !config.oNetworkConfig?.lanes) {
      return;
    }

    const index = config.oNetworkConfig.lanes.indexOf(cid);
    if (index > -1) {
      config.oNetworkConfig.lanes.splice(index, 1);
      await this.saveOSConfig(config);
    }
  }
}
