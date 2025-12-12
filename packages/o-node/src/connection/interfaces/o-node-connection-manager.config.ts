import { oConnectionManagerConfig } from '@olane/o-core';
import { Libp2p } from '@olane/o-config';

export interface oNodeConnectionManagerConfig extends oConnectionManagerConfig {
  p2pNode: Libp2p;
  runOnLimitedConnection?: boolean;
  originAddress?: string;
  useLengthPrefixing?: boolean;
}
