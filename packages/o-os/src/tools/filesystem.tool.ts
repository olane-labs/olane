import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { readFile, readdir, stat, access } from 'fs/promises';
import * as path from 'path';

/**
 * FilesystemTool — an oLaneTool that provides scoped filesystem access
 * for a world. Each world gets its own FilesystemTool as a child node.
 *
 * The tool maintains a list of allowed directory paths (addresses).
 * All file operations are restricted to these directories.
 */
export class FilesystemTool extends oLaneTool {
  private allowedPaths: string[] = [];

  constructor(config: oNodeConfig, allowedPaths?: string[]) {
    super({
      ...config,
      description: 'Scoped filesystem access for a world',
      methods: {
        add_path: {
          name: 'add_path',
          description: 'Add a directory path to the allowed list',
          parameters: [
            { name: 'path', type: 'string', required: true, description: 'Absolute directory path' },
          ],
          dependencies: [],
        },
        remove_path: {
          name: 'remove_path',
          description: 'Remove a directory path from the allowed list',
          parameters: [
            { name: 'path', type: 'string', required: true, description: 'Path to remove' },
          ],
          dependencies: [],
        },
        list_paths: {
          name: 'list_paths',
          description: 'List all allowed directory paths',
          parameters: [],
          dependencies: [],
        },
        read_file: {
          name: 'read_file',
          description: 'Read a file within an allowed path',
          parameters: [
            { name: 'path', type: 'string', required: true, description: 'File path to read' },
          ],
          dependencies: [],
        },
        list_files: {
          name: 'list_files',
          description: 'List files in a directory within an allowed path',
          parameters: [
            { name: 'path', type: 'string', required: true, description: 'Directory path' },
            { name: 'recursive', type: 'boolean', required: false, description: 'List recursively' },
          ],
          dependencies: [],
        },
        stat_path: {
          name: 'stat_path',
          description: 'Get file/directory info within an allowed path',
          parameters: [
            { name: 'path', type: 'string', required: true, description: 'Path to stat' },
          ],
          dependencies: [],
        },
      },
    });
    this.allowedPaths = allowedPaths || [];
  }

  getAllowedPaths(): string[] {
    return [...this.allowedPaths];
  }

  // ── Path management ────────────────────────────────────────

  async _tool_add_path(request: oRequest): Promise<ToolResult> {
    const { path: dirPath } = request.params as any;
    const resolved = path.resolve(dirPath);

    try {
      await access(resolved);
      const stats = await stat(resolved);
      if (!stats.isDirectory()) {
        return { success: false, error: `'${resolved}' is not a directory` };
      }
    } catch {
      return { success: false, error: `'${resolved}' does not exist or is not accessible` };
    }

    if (!this.allowedPaths.includes(resolved)) {
      this.allowedPaths.push(resolved);
    }

    return { success: true, path: resolved };
  }

  async _tool_remove_path(request: oRequest): Promise<ToolResult> {
    const { path: dirPath } = request.params as any;
    const resolved = path.resolve(dirPath);
    const before = this.allowedPaths.length;
    this.allowedPaths = this.allowedPaths.filter((p) => p !== resolved);
    return { success: true, removed: this.allowedPaths.length < before };
  }

  async _tool_list_paths(_request: oRequest): Promise<ToolResult> {
    return { success: true, paths: [...this.allowedPaths] };
  }

  // ── File operations (scoped to allowed paths) ──────────────

  async _tool_read_file(request: oRequest): Promise<ToolResult> {
    const { path: filePath } = request.params as any;
    const resolved = path.resolve(filePath);

    if (!this.isWithinAllowedPath(resolved)) {
      return { success: false, error: `'${resolved}' is outside allowed paths` };
    }

    try {
      const content = await readFile(resolved, 'utf8');
      return { success: true, content, path: resolved };
    } catch (err) {
      return { success: false, error: `Failed to read: ${err}` };
    }
  }

  async _tool_list_files(request: oRequest): Promise<ToolResult> {
    const { path: dirPath, recursive } = request.params as any;
    const resolved = path.resolve(dirPath);

    if (!this.isWithinAllowedPath(resolved)) {
      return { success: false, error: `'${resolved}' is outside allowed paths` };
    }

    try {
      const entries = await readdir(resolved, {
        withFileTypes: true,
        recursive: !!recursive,
      });
      const files = entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(e.parentPath || resolved, e.name),
      }));
      return { success: true, files };
    } catch (err) {
      return { success: false, error: `Failed to list: ${err}` };
    }
  }

  async _tool_stat_path(request: oRequest): Promise<ToolResult> {
    const { path: targetPath } = request.params as any;
    const resolved = path.resolve(targetPath);

    if (!this.isWithinAllowedPath(resolved)) {
      return { success: false, error: `'${resolved}' is outside allowed paths` };
    }

    try {
      const stats = await stat(resolved);
      return {
        success: true,
        path: resolved,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    } catch (err) {
      return { success: false, error: `Failed to stat: ${err}` };
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  private isWithinAllowedPath(filePath: string): boolean {
    return this.allowedPaths.some(
      (allowed) => filePath === allowed || filePath.startsWith(allowed + path.sep),
    );
  }
}
