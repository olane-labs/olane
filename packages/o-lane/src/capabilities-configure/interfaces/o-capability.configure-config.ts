import { oAddress } from '@olane/o-core';
import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config';
import { oHandshakeResult } from '../../interfaces';

export interface oCapabilityConfigureConfig extends oCapabilityConfig {
  handshake: oHandshakeResult;
  receiver: oAddress;
}
