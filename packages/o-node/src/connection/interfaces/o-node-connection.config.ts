import { Connection } from '@olane/o-config';
import { oConnectionConfig } from '@olane/o-core';

export interface oNodeConnectionConfig extends oConnectionConfig {
  p2pConnection: Connection;
}
