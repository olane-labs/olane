import { ResolveRequest } from '@olane/o-core';
import { oNodeTool } from '@olane/o-node';

export interface AgentResolveRequest extends ResolveRequest {
  node: oNodeTool;
}
