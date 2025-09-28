import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';
import { oIntent } from '../../intent/o-intent.js';

export interface oCapabilityMultipleStepConfig extends oCapabilityConfig {
  intents: oIntent[];
  explanation: string;
}
