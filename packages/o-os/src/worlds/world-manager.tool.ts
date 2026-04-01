import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest, DEFAULT_INSTANCE_PATH } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { WorldInstanceTool } from './world-instance.tool.js';
import type { WorldConfig, WorldSupportedType } from './world.types.js';
import * as fs from 'fs-extra';
import * as path from 'path';

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
