import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config';

export interface oCapabilityTaskConfig extends oCapabilityConfig {
  task: {
    address: string;
    payload: {
      method: string;
      params: { [key: string]: any };
    };
  };
}
