import { oAddress, oCoreNode } from '../../core';
import { oPlanContext } from '../plan.context';

export interface oPlanConfig {
  // an oAddress that contains the config for the plan
  intent: string;
  noIndex?: boolean;
  useCache?: boolean;

  context?: oPlanContext;
  sequence?: any[];

  // o-networking information
  currentNode: oCoreNode;
  caller: oAddress;
  receiver?: oAddress; // if the receiver is not set, we will use the network's default receiver
  promptFunction?: (
    intent: string,
    context: string,
    agentHistory: string,
  ) => string;
}
