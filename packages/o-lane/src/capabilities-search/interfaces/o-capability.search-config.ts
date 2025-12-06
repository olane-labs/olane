import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config-interface.js';

export interface oCapabilitySearchConfig extends oCapabilityConfig {
  params: {
    queries: {
      query: string;
      limit: number;
    }[];
    isExternal: boolean;
    explanation: string;
    summary: string;
  };
}
