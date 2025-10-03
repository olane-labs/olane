import { oCore } from '../../core/o-core.js';
import { oAddress } from '../o-address.js';
import { oRouterRequest } from '../o-request.router.js';

export interface ResolveRequest {
  address: oAddress;
  targetAddress: oAddress;
  node: oCore;
  request?: oRouterRequest;
}
