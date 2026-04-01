import { readFile, writeFile, mkdir, readdir, rm, access } from 'fs/promises';
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
  /** Copass ID linked to this OS instance. */
  copassId?: string;
  /** World ID if this instance represents a world. */
  worldId?: string;
}

export interface CLIConfig {
  instancesPath: string;
  approvalMode?: 'allow' | 'review' | 'auto';
}

export const CONFIG_FILE_NAME = 'config.json';

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p: string): Promise<any> {
  const data = await readFile(p, 'utf8');
  return JSON.parse(data);
}

async function writeJson(p: string, data: any, opts?: { spaces?: number }): Promise<void> {
  await writeFile(p, JSON.stringify(data, null, opts?.spaces), 'utf8');
}

export class ConfigManager {
  private static configPath = DEFAULT_CONFIG_PATH;
  private static instancesPath = DEFAULT_INSTANCE_PATH;
  private static configFile = DEFAULT_CONFIG_FILE;

  static async initialize(): Promise<void> {
    await mkdir(ConfigManager.configPath, { recursive: true });
    await mkdir(ConfigManager.instancesPath, { recursive: true });

    if (!(await pathExists(ConfigManager.configFile))) {
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
    const config = await readJson(ConfigManager.configFile);
    return { ...this.getDefaultConfig(), ...config };
  }

  static async saveConfig(config: Partial<CLIConfig>): Promise<void> {
    await this.initialize();
    const currentConfig = await this.getConfig();
    const newConfig = { ...currentConfig, ...config };
    await this.writeConfig(newConfig);
  }

  static async writeConfig(config: Partial<CLIConfig>): Promise<void> {
    await writeJson(ConfigManager.configFile, config, { spaces: 2 });
  }

  static async getOSConfigFromPath(
    p: string,
  ): Promise<OlaneOSInstanceConfig | null> {
    try {
      if (!(await pathExists(p))) return null;
      const raw = await readFile(p, 'utf8');
      if (!raw || !raw.trim()) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static async getOSConfig(
    name: string,
  ): Promise<OlaneOSInstanceConfig | null> {
    const configPath = path.join(
      ConfigManager.instancesPath,
      name,
      CONFIG_FILE_NAME,
    );
    if (await pathExists(configPath)) {
      return await readJson(configPath);
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
    await mkdir(osPath, { recursive: true });
    await writeJson(path.join(osPath, CONFIG_FILE_NAME), config, {
      spaces: 2,
    });
  }

  static async listOSInstances(): Promise<OlaneOSInstanceConfig[]> {
    try {
      await this.initialize();
      const osInstances: OlaneOSInstanceConfig[] = [];
      const osInstanceNames = await readdir(ConfigManager.instancesPath);

      for (const osInstanceName of osInstanceNames) {
        const config = await this.getOSConfig(osInstanceName);
        if (config) {
          osInstances.push(config);
        }
      }

      return osInstances;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  static async deleteOSInstance(name: string): Promise<void> {
    const osInstancePath = path.join(ConfigManager.instancesPath, name);
    if (await pathExists(osInstancePath)) {
      await rm(osInstancePath, { recursive: true });
    }
  }
}
