import { oCapabilityType } from '../capabilities';
import { oTaskConfig } from './o-lane-task.config';

export interface oConfigureResult {
  task: oTaskConfig;
  type: oCapabilityType.CONFIGURE;
}
