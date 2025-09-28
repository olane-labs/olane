import { oCapabilityResult } from '../../capabilities/interfaces/o-capability.result.js';
import { oTaskConfig } from '../../interfaces/index.js';

export interface oCapabilityConfigureResult extends oCapabilityResult {
  result?: oTaskConfig;
}
