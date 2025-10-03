import { oHierarchyManager, oHierarchyManagerConfig } from '@olane/o-core';
import { oNodeAddress } from './router/o-node.address.js';

export interface oNodeHierarchyManagerConfig extends oHierarchyManagerConfig {
  leaders: oNodeAddress[];
  children: oNodeAddress[];
  parents: oNodeAddress[];
}

export class oNodeHierarchyManager extends oHierarchyManager {
  public leaders: oNodeAddress[] = [];
  public children: oNodeAddress[] = [];
  public parents: oNodeAddress[] = [];

  constructor(config: oNodeHierarchyManagerConfig) {
    super(config);
    this.leaders = config.leaders || [];
    this.children = config.children || [];
    this.parents = config.parents || [];
  }

  get leader(): oNodeAddress | null {
    return this.leaders.length > 0 ? this.leaders[0] : null;
  }
}
