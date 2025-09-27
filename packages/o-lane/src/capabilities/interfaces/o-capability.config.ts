import { oIntent } from '../../intent';
import type { oLaneTool } from '../../o-lane.tool';

export interface oCapabilityConfig {
  node: oLaneTool;
  intent: oIntent;
}
