import { oAddress } from './o-address';

import { oObject } from '../core/o-object.js';
import { oAddressResolution } from './o-address-resolution';
import { oAddressResolver } from './o-address-resolver';
import { oRequest } from '../connection/o-request.js';
import type { oCore } from '../core/o-core.js';
import { oRouterRequest, RequestParams } from '@olane/o-protocol';

export abstract class oRouter extends oObject {
  public addressResolution!: oAddressResolution;

  constructor() {
    super();
    this.addressResolution = new oAddressResolution();
  }

  abstract translate(addressWithLeaderTransports: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }>;

  abstract isInternal(addressWithLeaderTransports: oAddress): boolean;

  addResolver(resolver: oAddressResolver): void {
    this.addressResolution.addResolver(resolver);
  }

  supportsAddress(address: oAddress): boolean {
    return this.addressResolution.supportsAddress(address);
  }

  abstract route(request: oRouterRequest, node?: oCore): Promise<any>;

  extractToolRequest(request: oRouterRequest): oRequest {
    const { payload } = request.params;
    return new oRequest({
      params: payload.params as RequestParams,
      id: request.id,
      method: payload.method as string,
    });
  }
}
