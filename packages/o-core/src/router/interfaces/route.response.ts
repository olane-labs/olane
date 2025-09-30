import { oAddress } from '../o-address.js';
import { oRouterRequest } from '../o-request.router.js';

export interface RouteResponse {
  nextHopAddress: oAddress;
  targetAddress: oAddress;
  requestOverride?: oRouterRequest;
}
