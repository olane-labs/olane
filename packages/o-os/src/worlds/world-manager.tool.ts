import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest, DEFAULT_INSTANCE_PATH } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { WorldInstanceTool } from './world-instance.tool.js';
import type { WorldConfig, WorldSupportedType, WorldData } from './world.types.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { watch, type FSWatcher } from 'node:fs';

export interface WorldManagerConfig extends oNodeConfig {
  /** Base storage path for world data. Defaults to ~/.olane/storage/{systemName}/worlds/ */
  storagePath?: string;
}

/**
 * WorldManagerTool — dedicated oLaneTool node at o://world-manager.
 * Child of the root leader. Manages the lifecycle of all world instance nodes.
 *
 * On startup: reads persisted world configs and starts a WorldInstanceTool child for each.
 */
export class WorldManagerTool extends oLaneTool {
  private worlds: Map<string, WorldInstanceTool> = new Map();
  private storagePath: string;
  private fsWatcher: FSWatcher | null = null;
  private syncDebounce: NodeJS.Timeout | null = null;

  constructor(config: WorldManagerConfig) {
    super({
      ...config,
      address: new oAddress('o://world-manager'),
      description: 'Manages world instances (branded networks)',
      methods: {
        create_world: {
          name: 'create_world',
          description: 'Create a new world (branded network)',
          parameters: [
            { name: 'name', type: 'string', required: true, description: 'World name' },
            { name: 'description', type: 'string', required: false, description: 'World description' },
            { name: 'icon', type: 'string', required: false, description: 'World icon' },
            { name: 'supportedTypes', type: 'array', required: false, description: 'Supported address types' },
            { name: 'createdBy', type: 'string', required: false, description: 'Copass ID of creator' },
          ],
          dependencies: [],
        },
        remove_world: {
          name: 'remove_world',
          description: 'Remove a world',
          parameters: [
            { name: 'id', type: 'string', required: true, description: 'World ID' },
          ],
          dependencies: [],
        },
        list_worlds: {
          name: 'list_worlds',
          description: 'List all worlds',
          parameters: [],
          dependencies: [],
        },
        join_world: {
          name: 'join_world',
          description: 'Join a world by Copass ID',
          parameters: [
            { name: 'id', type: 'string', required: true, description: 'World ID' },
            { name: 'copassId', type: 'string', required: true, description: 'Copass ID' },
          ],
          dependencies: [],
        },
      },
    });
    this.storagePath =
      config.storagePath ??
      path.join(
        DEFAULT_INSTANCE_PATH,
        '..',
        'storage',
        config.systemName || 'default',
        'worlds',
      );
  }

  async start(): Promise<void> {
    await super.start();
    await fs.ensureDir(this.storagePath);
    await this.restoreWorlds();
    this.startWatching();
  }

  async stop(): Promise<void> {
    this.stopWatching();
    await super.stop();
  }

  /**
   * Watch the worlds directory for file changes.
   * When the CLI writes a new address to a world JSON,
   * the running instance picks it up and syncs to memory.
   */
  private startWatching(): void {
    try {
      this.fsWatcher = watch(this.storagePath, (event, filename) => {
        if (!filename?.endsWith('.json')) return;
        // Debounce — multiple events fire for a single write
        if (this.syncDebounce) clearTimeout(this.syncDebounce);
        this.syncDebounce = setTimeout(() => {
          this.syncFromDisk(filename).catch((err) =>
            this.logger.warn(`Failed to sync world file ${filename}:`, err),
          );
        }, 500);
      });
      this.fsWatcher.unref(); // Don't prevent process exit
      this.logger.debug('Watching worlds directory for changes');
    } catch (err) {
      this.logger.warn('Could not watch worlds directory:', err);
    }
  }

  private stopWatching(): void {
    if (this.syncDebounce) clearTimeout(this.syncDebounce);
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
    }
  }

  /**
   * Sync a world from its JSON file on disk into the running instance.
   * Handles both new worlds and updated addresses on existing worlds.
   */
  private async syncFromDisk(filename: string): Promise<void> {
    const filePath = path.join(this.storagePath, filename);
    if (!(await fs.pathExists(filePath))) return;

    try {
      const data: WorldData = await fs.readJson(filePath);
      const worldConfig: WorldConfig = data.config;
      if (!worldConfig?.id) return;

      const existing = this.worlds.get(worldConfig.id);
      if (existing) {
        // Sync addresses: add any new ones from disk into the running instance
        const diskAddresses = data.addresses || [];
        const currentAddresses = existing.getAddresses();

        for (const addr of diskAddresses) {
          const alreadyLoaded = currentAddresses.some((a) => a.address === addr.address);
          if (!alreadyLoaded) {
            await existing._tool_register_address({
              params: { address: addr.address, type: addr.type, metadata: addr.metadata },
            } as any);
            this.logger.debug(`Synced new address '${addr.address}' to world '${worldConfig.name}'`);
          }
        }
      } else {
        // New world — start it
        const instance = await this.startWorldInstance(worldConfig);
        this.worlds.set(worldConfig.id, instance);
        this.logger.debug(`Synced new world from disk: ${worldConfig.name}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to parse world file ${filename}:`, err);
    }
  }

  // ── Tool methods ───────────────────────────────────────────

  async _tool_create_world(request: oRequest): Promise<ToolResult> {
    const { name, description, icon, supportedTypes, createdBy } =
      request.params as any;

    const id = `world-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

    if (this.worlds.has(id)) {
      return { success: false, error: `World '${name}' already exists` };
    }

    const worldConfig: WorldConfig = {
      id,
      name,
      description,
      icon,
      supportedTypes: supportedTypes || ['filepath'],
      members: createdBy ? [createdBy] : [],
      createdAt: new Date().toISOString(),
      createdBy,
    };

    const instance = await this.startWorldInstance(worldConfig);
    this.worlds.set(id, instance);
    await this.persistWorldConfig(worldConfig);

    return { success: true, world: worldConfig };
  }

  async _tool_remove_world(request: oRequest): Promise<ToolResult> {
    const { id } = request.params as any;
    const instance = this.worlds.get(id);
    if (!instance) {
      return { success: false, error: `World '${id}' not found` };
    }

    await instance.stop();
    this.worlds.delete(id);

    const worldFile = path.join(this.storagePath, `${id}.json`);
    if (await fs.pathExists(worldFile)) {
      await fs.remove(worldFile);
    }

    return { success: true };
  }

  async _tool_list_worlds(_request: oRequest): Promise<ToolResult> {
    const worlds = Array.from(this.worlds.values()).map((w) => w.world);
    return { success: true, worlds };
  }

  async _tool_join_world(request: oRequest): Promise<ToolResult> {
    const { id, copassId } = request.params as any;
    const instance = this.worlds.get(id);
    if (!instance) {
      return { success: false, error: `World '${id}' not found` };
    }

    if (!instance.world.members.includes(copassId)) {
      instance.world.members.push(copassId);
      await this.persistWorldConfig(instance.world);
    }

    return { success: true };
  }

  // ── Public accessors ───────────────────────────────────────

  listWorlds(): WorldConfig[] {
    return Array.from(this.worlds.values()).map((w) => w.world);
  }

  getWorldInstance(id: string): WorldInstanceTool | undefined {
    return this.worlds.get(id);
  }

  /**
   * Create a world (public convenience, delegates to _tool_create_world).
   */
  async createWorld(params: {
    name: string;
    description?: string;
    icon?: string;
    supportedTypes?: WorldSupportedType[];
    createdBy?: string;
  }): Promise<ToolResult> {
    return this._tool_create_world({ params } as any);
  }

  /**
   * Join a world (public convenience, delegates to _tool_join_world).
   */
  async joinWorld(id: string, copassId: string): Promise<ToolResult> {
    return this._tool_join_world({ params: { id, copassId } } as any);
  }

  // ── Internal ───────────────────────────────────────────────

  private async startWorldInstance(
    worldConfig: WorldConfig,
  ): Promise<WorldInstanceTool> {
    const slug = worldConfig.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const worldAddress = new oAddress(`o://world-manager/${slug}`);
    const persistFile = path.join(this.storagePath, `${worldConfig.id}.json`);

    const instance = new WorldInstanceTool(
      {
        address: worldAddress,
        leader: this.address,
        parent: this.address,
        _allowNestedAddress: true,
      },
      worldConfig,
      persistFile,
    );

    this.addChildNode(instance as any);
    await instance.start();

    return instance;
  }

  private async restoreWorlds(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = await fs.readJson(path.join(this.storagePath, file));
          const worldConfig: WorldConfig = data.config || data;
          if (worldConfig.id && worldConfig.name) {
            const instance = await this.startWorldInstance(worldConfig);
            this.worlds.set(worldConfig.id, instance);
            this.logger.debug(`Restored world: ${worldConfig.name}`);
          }
        } catch (err) {
          this.logger.error(`Failed to restore world from ${file}:`, err);
        }
      }
    } catch {
      // No worlds to restore
    }
  }

  private async persistWorldConfig(config: WorldConfig): Promise<void> {
    await fs.ensureDir(this.storagePath);
    const existing = path.join(this.storagePath, `${config.id}.json`);
    let addresses: any[] = [];
    try {
      if (await fs.pathExists(existing)) {
        const data = await fs.readJson(existing);
        addresses = data.addresses || [];
      }
    } catch {
      // ignore
    }
    await fs.writeJson(
      existing,
      { config, addresses },
      { spaces: 2 },
    );
  }
}
