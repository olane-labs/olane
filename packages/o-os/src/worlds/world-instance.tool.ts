import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { FilesystemTool } from '../tools/filesystem.tool.js';
import type {
  WorldConfig,
  WorldAddressEntry,
  WorldSupportedType,
  WorldData,
} from './world.types.js';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import * as path from 'path';

async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

/**
 * A world instance node — hub for addresses of a given world.
 * Registered as a child of the WorldManagerTool at o://world-manager/{world-name}.
 *
 * Each world instance owns a FilesystemTool child that provides scoped
 * filesystem access to the directories (addresses) registered with it.
 */
export class WorldInstanceTool extends oLaneTool {
  private worldConfig: WorldConfig;
  private addresses: WorldAddressEntry[] = [];
  private persistPath: string | undefined;
  public filesystemTool: FilesystemTool | null = null;

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
          description: 'Register an address (directory path) with this world',
          parameters: [
            { name: 'address', type: 'string', required: true, description: 'The directory path to register' },
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

    // Create the FilesystemTool child node scoped to this world's filepath addresses
    const filepathAddresses = this.addresses
      .filter((a) => a.type === 'filepath')
      .map((a) => a.address);

    const slug = this.worldConfig.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    this.filesystemTool = new FilesystemTool(
      {
        address: new oAddress(`o://world-manager/${slug}/fs`),
        leader: this.leader,
        parent: this.address,
        _allowNestedAddress: true,
      },
      filepathAddresses,
    );
    this.addChildNode(this.filesystemTool as any);
    await this.filesystemTool.start();
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

    const existing = this.addresses.find((a) => a.address === address);
    if (existing) {
      return {
        success: false,
        error: `Address '${address}' is already registered in world '${this.worldConfig.name}'`,
      };
    }

    const entry: WorldAddressEntry = {
      address,
      type,
      registeredAt: new Date().toISOString(),
      metadata,
    };
    this.addresses.push(entry);

    // Sync filepath to the FilesystemTool
    if (type === 'filepath' && this.filesystemTool) {
      await this.filesystemTool._tool_add_path({ params: { path: address } } as any);
    }

    await this.persistAddresses();
    return { success: true };
  }

  async _tool_remove_address(request: oRequest): Promise<ToolResult> {
    const { address } = request.params as any;
    const entry = this.addresses.find((a) => a.address === address);
    const before = this.addresses.length;
    this.addresses = this.addresses.filter((a) => a.address !== address);
    const removed = this.addresses.length < before;

    if (removed) {
      // Unsync from FilesystemTool
      if (entry?.type === 'filepath' && this.filesystemTool) {
        await this.filesystemTool._tool_remove_path({ params: { path: address } } as any);
      }
      await this.persistAddresses();
    }

    return { success: true, removed };
  }

  async _tool_list_addresses(request: oRequest): Promise<ToolResult> {
    const { type } = request.params as any;
    const filtered = type
      ? this.addresses.filter((a) => a.type === type)
      : [...this.addresses];
    return { success: true, addresses: filtered };
  }

  async _tool_get_world_info(_request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      config: this.worldConfig,
      addressCount: this.addresses.length,
      filesystemPaths: this.filesystemTool?.getAllowedPaths() || [],
    };
  }

  // ── Convenience accessors ─────────────────────────────────

  getAddresses(type?: WorldSupportedType): WorldAddressEntry[] {
    if (type) return this.addresses.filter((a) => a.type === type);
    return [...this.addresses];
  }

  // ── Persistence ────────────────────────────────────────────

  private async loadAddresses(): Promise<void> {
    if (!this.persistPath) return;
    try {
      if (await pathExists(this.persistPath)) {
        const raw = await readFile(this.persistPath, 'utf8');
        if (!raw.trim()) return;
        const data: WorldData = JSON.parse(raw);
        this.addresses = data.addresses || [];
      }
    } catch {
      this.addresses = [];
    }
  }

  async persistAddresses(): Promise<void> {
    if (!this.persistPath) return;
    await mkdir(path.dirname(this.persistPath), { recursive: true });
    const data: WorldData = {
      config: this.worldConfig,
      addresses: this.addresses,
    };
    await writeFile(this.persistPath, JSON.stringify(data, null, 2), 'utf8');
  }
}
