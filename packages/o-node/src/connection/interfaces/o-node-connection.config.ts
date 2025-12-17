import { Connection } from '@olane/o-config';
import { oConnectionConfig } from '@olane/o-core';
import type { StreamReusePolicy } from '../stream-handler.config.js';

export interface oNodeConnectionConfig extends oConnectionConfig {
  p2pConnection: Connection;
  runOnLimitedConnection?: boolean;
  reusePolicy?: StreamReusePolicy;
}
