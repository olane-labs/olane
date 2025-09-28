import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config';

export interface oCapabilitySearchConfig extends oCapabilityConfig {
  query: string;
  external: boolean;
  explanation: string;
}
