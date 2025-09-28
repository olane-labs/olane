import { oAddress, oCore } from '@olane/o-core';
import { oLaneContext } from '../o-lane.context.js';
import { oCapability } from '../capabilities/o-capability.js';
import { oIntent } from '../intent/o-intent.js';

export interface oLaneConfig {
  // an oAddress that contains the config for the plan
  intent: oIntent;

  context?: oLaneContext;
  sequence?: any[];

  streamTo?: oAddress;

  capabilities?: oCapability[];

  // o-networking information
  currentNode: oCore;
  caller: oAddress;
  receiver?: oAddress; // if the receiver is not set, we will use the network's default receiver
  promptFunction?: (
    intent: string,
    context: string,
    agentHistory: string,
    extraInstructions: string,
  ) => string;
  extraInstructions?: string;
  parentId?: string;

  shouldContinue?: () => boolean;
}
