import fs from 'fs-extra';
import path from 'path';
import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_NETWORKS_PATH,
  DEFAULT_CONFIG_FILE,
} from '@olane/o-core';
import { NetworkConfigInterface, NetworkStatus } from '../network/index.js';

export interface NetworkConfig {
  name: string;
  version: string;
  description: string;
  port: number;
  status: NetworkStatus;
  path?: string;
  createdAt?: string;
  pid?: number;
  peerId?: string;
  transports?: string[];
  oNetworkConfig?: NetworkConfigInterface;
}

export interface CLIConfig {
  networksPath: string;
}

export const CONFIG_FILE_NAME = 'config.json';

export class ConfigManager {
  private static configPath = DEFAULT_CONFIG_PATH;
  private static networksPath = DEFAULT_NETWORKS_PATH;
  private static configFile = DEFAULT_CONFIG_FILE;

  static async initialize(): Promise<void> {
    console.log('Initializing config...', ConfigManager.configPath);
    await fs.ensureDir(ConfigManager.configPath);
    console.log('Ensuring config path...', ConfigManager.configPath);
    await fs.ensureDir(ConfigManager.networksPath);
    console.log('Ensured networks path...', ConfigManager.networksPath);

    if (!(await fs.pathExists(ConfigManager.configFile))) {
      await this.writeConfig(this.getDefaultConfig());
    }
  }

  static getDefaultConfig(): CLIConfig {
    return {
      networksPath: ConfigManager.networksPath,
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

  static async getNetworkConfigFromPath(
    path: string,
  ): Promise<NetworkConfig | null> {
    if (await fs.pathExists(path)) {
      return await fs.readJson(path);
    }
    return null;
  }

  static async getNetworkConfig(name: string): Promise<NetworkConfig | null> {
    const configPath = path.join(
      ConfigManager.networksPath,
      name,
      CONFIG_FILE_NAME,
    );
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
    return null;
  }

  static async saveNetworkConfig(config: NetworkConfig): Promise<void> {
    const networkPath = path.join(ConfigManager.networksPath, config.name);
    await fs.ensureDir(networkPath);
    await fs.writeJson(path.join(networkPath, CONFIG_FILE_NAME), config, {
      spaces: 2,
    });
  }

  static async listNetworks(): Promise<NetworkConfig[]> {
    try {
      await this.initialize();
      const networks: NetworkConfig[] = [];
      const networkNames = await fs.readdir(ConfigManager.networksPath);

      for (const networkName of networkNames) {
        const config = await this.getNetworkConfig(networkName);
        if (config) {
          networks.push(config);
        }
      }

      return networks;
    } catch (error) {
      // if the default path for config does not exist, return an empty array
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  static async deleteNetwork(name: string): Promise<void> {
    const networkPath = path.join(ConfigManager.networksPath, name);
    if (await fs.pathExists(networkPath)) {
      await fs.remove(networkPath);
    }
  }
}
