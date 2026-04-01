import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import type {
  WorldConfig,
  WorldAddressEntry,
  WorldSupportedType,
  WorldData,
} from './world.types.js';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * A world instance node — hub for addresses of a given world.
 * Registered as a child of the WorldManagerTool at o://world-manager/{world-name}.
 *
 * Supported types define what kinds of addresses can be registered.
 * The first supported type is 'filepath'.
 */
export class WorldInstanceTool extends oLaneTool {
  private worldConfig: WorldConfig;
  private addresses: WorldAddressEntry[] = [];
  private persistPath: string | undefined;

  constructor(
    nodeConfig: oNodeConfig,
    worldConfig: WorldConfig,
    persistPath?: string,
  ) {
    super({
      ...nodeConfig,
      description: `World instance: ${worldConfig.name}`,
      methods: {
        register_address: {
          name: 'register_address',
          description: 'Register an address with this world',
          parameters: [
            { name: 'address', type: 'string', required: true, description: 'The address to register' },
            { name: 'type', type: 'string', required: true, description: 'Address type (e.g. filepath)' },
          ],
          dependencies: [],
        },
        remove_address: {
          name: 'remove_address',
          description: 'Remove an address from this world',
          parameters: [
            { name: 'address', type: 'string', required: true, description: 'The address to remove' },
          ],
          dependencies: [],
        },
        list_addresses: {
          name: 'list_addresses',
          description: 'List all addresses in this world',
          parameters: [
            { name: 'type', type: 'string', required: false, description: 'Filter by type' },
          ],
          dependencies: [],
        },
        register_filepath: {
          name: 'register_filepath',
          description: 'Register a filepath with this world',
          parameters: [
            { name: 'path', type: 'string', required: true, description: 'The filepath to register' },
          ],
          dependencies: [],
        },
        list_filepaths: {
          name: 'list_filepaths',
          description: 'List all filepaths in this world',
          parameters: [],
          dependencies: [],
        },
        get_world_info: {
          name: 'get_world_info',
          description: 'Get info about this world instance',
          parameters: [],
          dependencies: [],
        },
      },
    });
    this.worldConfig = worldConfig;
    this.persistPath = persistPath;
  }

  get world(): WorldConfig {
    return this.worldConfig;
  }

  async start(): Promise<void> {
    await super.start();
    await this.loadAddresses();
  }

  // ── Tool methods ───────────────────────────────────────────

  async _tool_register_address(request: oRequest): Promise<ToolResult> {
    const { address, type, metadata } = request.params as any;
    if (!this.worldConfig.supportedTypes.includes(type as WorldSupportedType)) {
      return {
        success: false,
        error: `Unsupported type '${type}'. Supported: ${this.worldConfig.supportedTypes.join(', ')}`,
      };
    }

    const entry: WorldAddressEntry = {
      address,
      type,
      registeredAt: new Date().toISOString(),
      metadata,
    };
    const existing = this.addresses.findIndex((a) => a.address === address);
    if (existing >= 0) {
      this.addresses[existing] = entry;
    } else {
      this.addresses.push(entry);
    }

    await this.persistAddresses();
    return { success: true };
  }

  async _tool_remove_address(request: oRequest): Promise<ToolResult> {
    const { address } = request.params as any;
    const before = this.addresses.length;
    this.addresses = this.addresses.filter((a) => a.address !== address);
    const removed = this.addresses.length < before;
    if (removed) await this.persistAddresses();
    return { success: true, removed };
  }

  async _tool_list_addresses(request: oRequest): Promise<ToolResult> {
    const { type } = request.params as any;
    const filtered = type
      ? this.addresses.filter((a) => a.type === type)
      : [...this.addresses];
    return { success: true, addresses: filtered };
  }

  async _tool_register_filepath(request: oRequest): Promise<ToolResult> {
    const { path: filepath, metadata } = request.params as any;
    return this._tool_register_address({
      ...request,
      params: { address: filepath, type: 'filepath', metadata },
    } as any);
  }

  async _tool_list_filepaths(_request: oRequest): Promise<ToolResult> {
    const filepaths = this.addresses.filter((a) => a.type === 'filepath');
    return { success: true, filepaths };
  }

  async _tool_get_world_info(_request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      config: this.worldConfig,
      addressCount: this.addresses.length,
    };
  }

  // ── Convenience accessors (non-tool) ───────────────────────

  getAddresses(type?: WorldSupportedType): WorldAddressEntry[] {
    if (type) return this.addresses.filter((a) => a.type === type);
    return [...this.addresses];
  }

  // ── Persistence ────────────────────────────────────────────

  private async loadAddresses(): Promise<void> {
    if (!this.persistPath) return;
    try {
      if (await fs.pathExists(this.persistPath)) {
        const data: WorldData = await fs.readJson(this.persistPath);
        this.addresses = data.addresses || [];
      }
    } catch {
      this.addresses = [];
    }
  }

  private async persistAddresses(): Promise<void> {
    if (!this.persistPath) return;
    await fs.ensureDir(path.dirname(this.persistPath));
    const data: WorldData = {
      config: this.worldConfig,
      addresses: this.addresses,
    };
    await fs.writeJson(this.persistPath, data, { spaces: 2 });
  }
}
