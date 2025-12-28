import { Connection, Libp2p } from '@olane/o-config';
import { oConnectionConfig } from '@olane/o-core';
import type { StreamReusePolicy } from '../stream-handler.config.js';

export interface oNodeConnectionConfig extends oConnectionConfig {
  p2pConnection: Connection;
  p2pNode?: Libp2p;
  runOnLimitedConnection?: boolean;
  reusePolicy?: StreamReusePolicy;
}
