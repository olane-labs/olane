import { Connection } from '@olane/o-config';
import { oConnectionConfig } from '@olane/o-core';

export interface oNodeConnectionConfig extends oConnectionConfig {
  p2pConnection: Connection;
  runOnLimitedConnection?: boolean;
  /**
   * Enable length-prefixed streaming (libp2p v3 best practice)
   * @default false (for backward compatibility)
   */
  useLengthPrefixing?: boolean;
}
