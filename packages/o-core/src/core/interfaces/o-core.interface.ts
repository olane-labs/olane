import { Multiaddr } from '@olane/o-config';
import { oAddress } from '../../router/o-address';
import { oConnectionManager } from '../../connection/o-connection-manager';
import { oResolverChain } from '../../router/o-resolver-chain';
import { NodeState } from './state.enum';

export interface oCoreInterface {
  leaders: Multiaddr[];
  address: oAddress;
  staticAddress: oAddress;
  state: NodeState;
  errors: Error[];
  connectionManager: oConnectionManager;
  addressResolution: oResolverChain;
  description: string;

  start: () => Promise<void>;
  stop: () => Promise<void>;
}
