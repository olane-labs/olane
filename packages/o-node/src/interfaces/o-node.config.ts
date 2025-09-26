import { oCoreConfig } from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';

export interface oNodeConfig extends oCoreConfig {
  leader: oNodeAddress;
  staticAddress: oNodeAddress;
  parent: oNodeAddress;
}
