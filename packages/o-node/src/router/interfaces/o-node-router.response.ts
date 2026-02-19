import { oNodeAddress } from '../o-node.address.js';
import { oRouterRequest, RouteResponse } from '@olane/o-core';

export interface oNodeRouterResponse extends RouteResponse {
  nextHopAddress: oNodeAddress;
  targetAddress: oNodeAddress;
  requestOverride?: oRouterRequest;
}
