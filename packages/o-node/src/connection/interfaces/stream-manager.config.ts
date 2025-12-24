import type { Connection } from '@libp2p/interface';

export interface StreamManagerConfig {
  /**
   * The libp2p connection this manager handles streams for
   */
  p2pConnection: Connection;
}
