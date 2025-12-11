
import { oCapabilityConfigInterface } from '../../capabilities/interfaces/o-capability.config-interface.js';

export interface oCapabilityConfigureConfig extends oCapabilityConfigInterface {
  params: {
    toolAddress: string;
    intent: string;
  };
}
