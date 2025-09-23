import { oAddress, oCoreNode } from '../../core/index.js';
import { oPlanContext } from '../plan.context.js';

export interface oPlanConfig {
  // an oAddress that contains the config for the plan
  intent: string;

  context?: oPlanContext;
  sequence?: any[];

  streamTo?: oAddress;

  // o-networking information
  currentNode: oCoreNode;
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
