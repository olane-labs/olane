import { oAddress, oCore } from '@olane/o-core';
import { oLaneContext } from '../o-lane.context.js';

export interface oLaneConfig {
  // an oAddress that contains the config for the plan
  intent: string;

  context?: oLaneContext;
  sequence?: any[];

  streamTo?: oAddress;

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
