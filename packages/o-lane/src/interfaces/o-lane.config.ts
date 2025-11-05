import { oAddress, oCore } from '@olane/o-core';
import { oLaneContext } from '../o-lane.context.js';
import { oCapability } from '../capabilities/o-capability.js';
import { oIntent } from '../intent/o-intent.js';
import { oLaneTool } from '../o-lane.tool.js';

export interface oLaneConfig {
  // an oAddress that contains the config for the plan
  intent: oIntent;
  caller: oAddress;

  context?: oLaneContext;
  sequence?: any[];

  streamTo?: oAddress;
  capabilities?: oCapability[];

  // o-networking information
  currentNode: oLaneTool;
  extraInstructions?: string;
  parentLaneId?: string;

  maxCycles?: number;

  // Mark this lane as one that should be persisted to config for replay on startup
  persistToConfig?: boolean;
  onChunk?: (chunk: any) => void;
  useStream?: boolean;
}
