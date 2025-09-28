import { oAddress } from '@olane/o-core';
import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';

export interface oCapabilityConfigureConfig extends oCapabilityConfig {
  receiver: oAddress;
}
