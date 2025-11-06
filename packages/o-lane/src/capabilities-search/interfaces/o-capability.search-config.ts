import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';

export interface oCapabilitySearchConfig extends oCapabilityConfig {
  params: {
    queries: {
      query: string;
      limit: number;
    }[];
    isExternal: boolean;
    explanation: string;
    update_message: string;
  };
}
