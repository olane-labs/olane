import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config.js';
import { oIntent } from '../../intent/o-intent.js';
import { oLaneConfig } from '../../interfaces/index.js';

export interface oCapabilityMultipleStepConfig extends oCapabilityConfig {
  intents: oIntent[];
  explanation: string;
  laneConfig: oLaneConfig;
  parentLaneId: string;
}
