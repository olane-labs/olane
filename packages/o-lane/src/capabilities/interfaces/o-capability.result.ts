import { oCapabilityType } from '../enums/o-capability.type-enum';

export interface oCapabilityResult {
  result?: any;
  type: oCapabilityType;
  error?: string;
}
