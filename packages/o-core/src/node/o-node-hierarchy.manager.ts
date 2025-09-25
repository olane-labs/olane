import {
  oHierarchyManager,
  oHierarchyManagerConfig,
} from '../core/lib/o-hierarchy.manager';
import { oNodeAddress } from './router/o-node.address';

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
}
