import { oIntent } from '../../intent/o-intent.js';
import { oLaneConfig } from '../../interfaces/o-lane.config.js';
import { oToolBase } from '@olane/o-tool';

export interface oCapabilityConfig {
  // Using oToolBase to allow any tool that extends it (oLaneTool, or other mixin-based tools)
  node: oToolBase;
  intent: oIntent;
  laneConfig: oLaneConfig;
  history: string;
  params?: any;
  isReplay?: boolean;
  useStream?: boolean;
  onChunk?: (chunk: any) => void;
}
