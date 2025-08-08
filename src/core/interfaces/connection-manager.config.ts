import { Libp2p } from '@olane/o-config';
import { Logger } from '../utils/logger';

export interface oConnectionManagerConfig {
  logger: Logger;
  p2pNode: Libp2p;
}
