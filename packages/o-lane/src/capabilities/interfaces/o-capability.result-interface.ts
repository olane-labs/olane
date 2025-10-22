import { oCapabilityConfig } from '../interfaces/o-capability.config.js';
import { oCapabilityType } from '../enums/o-capability.type-enum.js';

export interface oCapabilityResultInterface {
  result?: any;
  type: oCapabilityType;
  error?: string;
  config?: oCapabilityConfig;
  shouldPersist?: boolean;
}
