import { Libp2p } from '@olane/o-config';
import { Logger } from '../utils/logger.js';

export interface oConnectionManagerConfig {
  logger: Logger;
  p2pNode: Libp2p;
}
