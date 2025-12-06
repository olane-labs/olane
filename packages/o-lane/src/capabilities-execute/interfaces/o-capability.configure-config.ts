

import { oCapabilityConfig } from '../../capabilities/o-capability.config.js';

export interface oCapabilityExecuteConfig extends oCapabilityConfig {
  params: {
    address: string;
    intent: string;
  };
}
