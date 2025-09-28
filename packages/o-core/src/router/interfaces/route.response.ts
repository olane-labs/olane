import { oRequest } from '../../connection/o-request.js';
import { oAddress } from '../o-address.js';

export interface RouteResponse {
  nextHopAddress: oAddress;
  targetAddress: oAddress;
  requestOverride?: oRequest;
}
