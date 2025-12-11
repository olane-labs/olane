import { oCapabilityConfig } from "../../capabilities/o-capability.config.js";


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
