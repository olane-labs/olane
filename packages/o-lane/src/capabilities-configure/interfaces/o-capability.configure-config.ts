import { oAddress } from '@olane/o-core';
import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config';

export interface oCapabilityConfigureConfig extends oCapabilityConfig {
  receiver: oAddress;
}
