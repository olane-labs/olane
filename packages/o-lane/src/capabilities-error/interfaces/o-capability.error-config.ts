import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';
import { oError } from '@olane/o-core';

export interface oCapabilityErrorConfig extends oCapabilityConfig {
  error: oError;
}
