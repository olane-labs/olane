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

  clear(): void {
    this.leaders = [];
    this.children = [];
    this.parents = [];
  }

  private deduplicate(addresses: oAddress[]): oAddress[] {
    const added: any = {};
    return addresses.filter((a: oAddress) => {
      if (added[a.toString()]) {
        return false;
      }
      added[a.toString()] = true;
      return true;
    });
  }

  addChild(address: oAddress): void {
    // remove child if it exists
    this.removeChild(address);
    // deduplicate
    this.children = this.deduplicate([...this.children, address]);
  }

  getChild(address: oAddress): oAddress | undefined {
    return this.children.find(
      (a) =>
        a.toStaticAddress().toString() === address.toStaticAddress().toString(),
    );
  }

  removeChild(address: oAddress | string): void {
    this.children = this.deduplicate([
      ...this.children.filter((a) => a.toString() !== address.toString()),
    ]);
  }

  addParent(address: oAddress): void {
    this.parents = this.deduplicate([...this.parents, address]);
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
