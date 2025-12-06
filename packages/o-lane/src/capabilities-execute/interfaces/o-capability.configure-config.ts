
import { oCapabilityConfigInterface } from '../../capabilities/interfaces/o-capability.config-interface.js';

export interface oCapabilityExecuteConfig extends oCapabilityConfigInterface {
  params: {
    address: string;
    intent: string;
  };
}
