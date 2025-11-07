import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';

export interface oCapabilityTaskConfig extends oCapabilityConfig {
  params: {
    task: {
      address: string;
      payload: {
        method: string;
        params: { [key: string]: any };
      };
    };
    summary: string;
  };
}
