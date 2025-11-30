import { ResolveRequest } from '@olane/o-core';
import { oNodeTool } from '@olane/o-node';

export interface StorageResolveRequest extends ResolveRequest {
  node: oNodeTool;
}
