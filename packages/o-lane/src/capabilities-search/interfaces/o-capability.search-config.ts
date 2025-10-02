import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';

export interface oCapabilitySearchConfig extends oCapabilityConfig {
  queries: {
    query: string;
  }[];
  isExternal: boolean;
  explanation: string;
}
