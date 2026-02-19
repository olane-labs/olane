import { oCapabilityType } from '../capabilities/index.js';
import { oTaskConfig } from './o-lane-task.config.js';

export interface oConfigureResult {
  task: oTaskConfig;
  type: oCapabilityType.CONFIGURE;
}
