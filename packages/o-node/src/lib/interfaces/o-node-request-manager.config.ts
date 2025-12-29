import { oNodeAddress } from '../../router/o-node.address.js';
import { oNodeConnectionManager } from '../../connection/o-node-connection.manager.js';

export interface oNodeRequestManagerConfig {
  callerAddress: oNodeAddress;
  connectionManager: oNodeConnectionManager;
}
