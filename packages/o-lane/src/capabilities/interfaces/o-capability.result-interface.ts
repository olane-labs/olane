import { oCapabilityConfig } from '..';
import { oCapabilityType } from '../enums/o-capability.type-enum';

export interface oCapabilityResultInterface {
  result?: any;
  type: oCapabilityType;
  error?: string;
  config?: oCapabilityConfig;
}
