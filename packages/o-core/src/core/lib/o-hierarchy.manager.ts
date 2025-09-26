import { oAddress } from '../../router/o-address.js';
import { oObject } from '../o-object.js';

export interface oHierarchyManagerConfig {
  leaders?: oAddress[];
  parents?: oAddress[];
  children?: oAddress[];
}

export class oHierarchyManager extends oObject {
  public leaders: oAddress[] = [];
  public children: oAddress[] = [];
  public parents: oAddress[] = []; // multiple parents allow for more flexibility with address construction

  constructor(config: oHierarchyManagerConfig) {
    super();
    this.leaders = config.leaders || [];
    this.children = config.children || [];
    this.parents = config.parents || [];
  }

  private deduplicate(addresses: oAddress[]): oAddress[] {
    const set = new Set(addresses.map((a) => a.toString()));
    return Array.from(set).map((a) => new oAddress(a));
  }

  addChild(address: oAddress | string): void {
    // deduplicate
    this.children = this.deduplicate([
      ...this.children,
      new oAddress(address.toString()),
    ]);
  }

  getChild(address: oAddress): oAddress | undefined {
    return this.children.find((a) => a.toString() === address.toString());
  }

  removeChild(address: oAddress | string): void {
    this.children = this.deduplicate([
      ...this.children.filter((a) => a.toString() !== address.toString()),
    ]);
  }

  addParent(address: oAddress | string): void {
    this.parents = this.deduplicate([
      ...this.parents,
      new oAddress(address.toString()),
    ]);
  }

  removeParent(address: oAddress | string): void {
    this.parents = this.deduplicate([
      ...this.parents.filter((a) => a.toString() !== address.toString()),
    ]);
  }

  getChildren(): oAddress[] {
    return this.children;
  }

  getParents(): oAddress[] {
    return this.parents;
  }

  getLeaders(): oAddress[] {
    return this.leaders;
  }
}
