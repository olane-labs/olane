import { Connection } from '@olane/o-config';
import { oNodeAddress } from '../../router/o-node.address';
import { oConnectionConfig } from '@olane/o-core';

export interface oNodeConnectionConfig extends oConnectionConfig {
  p2pConnection: Connection;
}
