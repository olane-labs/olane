
import { oCapabilityType } from '../enums/o-capability.type-enum.js';
import { oCapabilityConfig } from '../o-capability.config.js';

export interface oCapabilityResultInterface {
  result?: any;
  type: oCapabilityType;
  error?: string;
  config?: oCapabilityConfig;
  shouldPersist?: boolean;
}
