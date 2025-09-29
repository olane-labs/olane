import { oNodeAddress } from '../o-node.address';
import { oRequest, RouteResponse } from '@olane/o-core';

export interface oNodeRouterResponse extends RouteResponse {
  nextHopAddress: oNodeAddress;
  targetAddress: oNodeAddress;
  requestOverride?: oRequest;
}
