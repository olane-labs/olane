import { oIntent } from '../../intent/o-intent.js';
import { oLaneConfig } from '../../interfaces/o-lane.config.js';
import type { oLaneTool } from '../../o-lane.tool.js';

export interface oCapabilityConfig {
  node: oLaneTool;
  intent: oIntent;
  laneConfig: oLaneConfig;
  history: string;
  params?: any;
  isReplay?: boolean;
  onChunk?: (chunk: any) => void;
}
