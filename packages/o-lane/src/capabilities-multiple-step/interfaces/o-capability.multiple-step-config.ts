import { oCapabilityConfig } from '../../capabilities/interfaces/o-capability.config-interface.js';
import { oIntent } from '../../intent/o-intent.js';
import { oLaneConfig } from '../../interfaces/index.js';

export interface oCapabilityMultipleStepConfig extends oCapabilityConfig {
  laneConfig: oLaneConfig;
  parentLaneId: string;
  params: {
    intents: oIntent[];
    explanation: string;
  };
  summary: string;
}
