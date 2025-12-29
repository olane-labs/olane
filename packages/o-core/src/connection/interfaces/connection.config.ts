import { oAddress } from '../../router/o-address.js';

export interface oConnectionConfig {
  nextHopAddress: oAddress;
  callerAddress?: oAddress;
  targetAddress: oAddress;

  isStream?: boolean;
}
