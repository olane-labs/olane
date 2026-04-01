import * as fs from 'fs-extra';
import * as path from 'path';
import { DEFAULT_INSTANCE_PATH } from '@olane/o-core';

export type AddressBookEntryType = 'internal' | 'external';

export interface AddressBookEntry {
  address: string;
  type: AddressBookEntryType;
  alias?: string;
  copassId?: string;
  worldId?: string;
  lastSeen?: string;
  metadata?: Record<string, unknown>;
}

export interface AddressBookData {
  version: string;
  entries: AddressBookEntry[];
}

const EMPTY_BOOK: AddressBookData = { version: '1.0', entries: [] };

/**
 * Persistent address book for tracking internal and external network addresses.
 */
export class AddressBook {
  private storagePath: string;
  private data: AddressBookData = { ...EMPTY_BOOK, entries: [] };

  constructor(instanceName: string, basePath?: string) {
    const base = basePath ?? path.join(DEFAULT_INSTANCE_PATH, '..', 'storage');
    this.storagePath = path.join(base, instanceName, 'address-book.json');
  }

  async load(): Promise<void> {
    try {
      if (await fs.pathExists(this.storagePath)) {
        this.data = await fs.readJson(this.storagePath);
      }
    } catch {
      this.data = { ...EMPTY_BOOK, entries: [] };
    }
  }

  private async persist(): Promise<void> {
    await fs.ensureDir(path.dirname(this.storagePath));
    await fs.writeJson(this.storagePath, this.data, { spaces: 2 });
  }

  async add(entry: AddressBookEntry): Promise<void> {
    const existing = this.data.entries.findIndex(
      (e) => e.address === entry.address,
    );
    if (existing >= 0) {
      this.data.entries[existing] = { ...this.data.entries[existing], ...entry };
    } else {
      this.data.entries.push(entry);
    }
    await this.persist();
  }

  async remove(address: string): Promise<boolean> {
    const before = this.data.entries.length;
    this.data.entries = this.data.entries.filter((e) => e.address !== address);
    if (this.data.entries.length < before) {
      await this.persist();
      return true;
    }
    return false;
  }

  get(address: string): AddressBookEntry | undefined {
    return this.data.entries.find((e) => e.address === address);
  }

  list(type?: AddressBookEntryType): AddressBookEntry[] {
    if (type) {
      return this.data.entries.filter((e) => e.type === type);
    }
    return [...this.data.entries];
  }

  findByAlias(alias: string): AddressBookEntry | undefined {
    return this.data.entries.find((e) => e.alias === alias);
  }

  findByCopassId(copassId: string): AddressBookEntry | undefined {
    return this.data.entries.find((e) => e.copassId === copassId);
  }

  findByWorld(worldId: string): AddressBookEntry[] {
    return this.data.entries.filter((e) => e.worldId === worldId);
  }
}
