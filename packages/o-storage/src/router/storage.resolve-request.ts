import { ResolveRequest } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';

export interface StorageResolveRequest extends ResolveRequest {
  node: oLaneTool;
}
