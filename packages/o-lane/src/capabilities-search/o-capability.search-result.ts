import { oCapabilityType } from '../capabilities/enums/o-capability.type-enum.js';
import { oCapabilityResult } from '../capabilities/o-capability.result.js';

export class oCapabilitySearchResult extends oCapabilityResult {
  result?: string;
  type: oCapabilityType = oCapabilityType.EVALUATE;
}
