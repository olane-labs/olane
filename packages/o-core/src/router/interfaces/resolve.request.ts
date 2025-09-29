import { oRequest } from '../../connection/o-request.js';
import { oCore } from '../../core/o-core.js';
import { oAddress } from '../o-address.js';

export interface ResolveRequest {
  address: oAddress;
  node?: oCore;
  request?: oRequest;
}
