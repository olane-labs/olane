import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_INSTANCE_PATH,
  DEFAULT_CONFIG_FILE,
  oAddress,
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
  approvalMode?: 'allow' | 'review' | 'auto';
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
      approvalMode: 'allow',
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
    // Use direct filesystem operations for OS config persistence
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
}
