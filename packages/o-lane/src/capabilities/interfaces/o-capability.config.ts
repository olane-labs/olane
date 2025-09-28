import { oIntent } from '../../intent';
import { oLaneConfig } from '../../interfaces';
import type { oLaneTool } from '../../o-lane.tool';

export interface oCapabilityConfig {
  node: oLaneTool;
  intent: oIntent;
  laneConfig: oLaneConfig;
}
