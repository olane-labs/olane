import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { oTokenStore, oTokenStoreEntry } from './o-token-store.js';

export interface FileTokenStoreConfig {
  directory: string;
}

export class FileTokenStore implements oTokenStore {
  private directory: string;
  private initialized = false;

  constructor(config: FileTokenStoreConfig) {
    this.directory = config.directory;
  }

  async get(key: string): Promise<oTokenStoreEntry | null> {
    await this.ensureDirectory();
    const filePath = this.keyToPath(key);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }

    try {
      return JSON.parse(raw) as oTokenStoreEntry;
    } catch {
      // Corrupted file — remove it and return null
      await unlink(filePath).catch(() => {});
      return null;
    }
  }

  async set(key: string, entry: oTokenStoreEntry): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.keyToPath(key);
    const tmpPath = filePath + '.tmp';
    const data = JSON.stringify(entry, null, 2);

    // Atomic write: write to tmp, then rename
    await writeFile(tmpPath, data, { encoding: 'utf-8', mode: 0o600 });
    await rename(tmpPath, filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.keyToPath(key);
    await unlink(filePath).catch((err: any) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  private keyToPath(key: string): string {
    const sanitized = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    return join(this.directory, `${sanitized}.token.json`);
  }

  private async ensureDirectory(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    this.initialized = true;
  }
}
