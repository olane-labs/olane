import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
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
 * Uses the shared OS-level FilesystemTool for scoped filesystem access
 * to the directories (addresses) registered with it.
 */
export class WorldInstanceTool extends oLaneTool {
  private worldConfig: WorldConfig;
  private addresses: WorldAddressEntry[] = [];
  private persistPath: string | undefined;
  private fsAddress = new oAddress('o://fs');

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
        ping_address: {
          name: 'ping_address',
          description: 'Ping a registered address to verify the underlying resource still exists',
          parameters: [
            { name: 'address', type: 'string', required: true, description: 'The registered address to ping' },
          ],
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

    // Sync existing filepath addresses to the shared OS-level FilesystemTool
    const filepathAddresses = this.addresses
      .filter((a) => a.type === 'filepath')
      .map((a) => a.address);

    for (const addr of filepathAddresses) {
      await this.use(this.fsAddress, { method: 'add_path', params: { path: addr } });
    }
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

    // Validate and register with o://fs BEFORE storing
    if (type === 'filepath') {
      const fsResult = await this.use(this.fsAddress, { method: 'add_path', params: { path: address } });
      if (!fsResult.result?.success) {
        return {
          success: false,
          error: fsResult.result?.error || `Address '${address}' does not exist or is not a valid directory`,
        };
      }
    }

    const entry: WorldAddressEntry = {
      address,
      type,
      registeredAt: new Date().toISOString(),
      metadata,
    };
    this.addresses.push(entry);
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
      if (entry?.type === 'filepath') {
        await this.use(this.fsAddress, { method: 'remove_path', params: { path: address } });
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
    const fsResponse = await this.use(this.fsAddress, { method: 'list_paths' });
    return {
      success: true,
      config: this.worldConfig,
      addressCount: this.addresses.length,
      filesystemPaths: fsResponse.result?.paths || [],
    };
  }

  async _tool_ping_address(request: oRequest): Promise<ToolResult> {
    const { address } = request.params as any;
    const entry = this.addresses.find((a) => a.address === address);
    if (!entry) {
      return { success: false, error: `Address '${address}' is not registered in this world` };
    }

    if (entry.type === 'filepath') {
      const fsResult = await this.use(this.fsAddress, { method: 'stat_path', params: { path: entry.address } });
      if (!fsResult.result?.success) {
        return {
          success: false,
          address: entry.address,
          type: entry.type,
          error: fsResult.result?.error || 'Resource not reachable',
        };
      }
      return {
        success: true,
        address: entry.address,
        type: entry.type,
        isDirectory: fsResult.result.isDirectory,
        size: fsResult.result.size,
        modified: fsResult.result.modified,
      };
    }

    return { success: false, error: `Ping not supported for type '${entry.type}'` };
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
