import { oAddress } from './o-address.js';

import { oObject } from '../core/o-object.js';
import { oAddressResolution } from './o-address-resolution.js';
import { oAddressResolver } from './o-address-resolver.js';
import { oRequest } from '../connection/o-request.js';
import type { oCore } from '../core/o-core.js';
import { RouteResponse } from './interfaces/route.response.js';
import { oRouterRequest } from './o-request.router.js';

export abstract class oRouter extends oObject {
  public addressResolution!: oAddressResolution;

  constructor() {
    super();
    this.addressResolution = new oAddressResolution();
  }

  // NEXT HOP ADDRESS + TRANSPORTS
  abstract translate(
    addressWithLeaderTransports: oAddress,
    node: oCore,
  ): Promise<RouteResponse>;

  // determine if the request is internal
  abstract isInternal(
    addressWithLeaderTransports: oAddress,
    node: oCore,
  ): boolean;

  // ROUTING FUNCTIONALIYT

  // route the request to the next node
  abstract route(request: oRouterRequest, node: oCore): Promise<RouteResponse>;

  // use the node + address + transports to forward the request to the next node
  protected abstract forward(
    address: oAddress,
    request: oRequest | oRouterRequest,
    node: oCore,
  ): Promise<any>;

  addResolver(resolver: oAddressResolver): void {
    this.addressResolution.addResolver(resolver);
  }

  supportsAddress(address: oAddress): boolean {
    return this.addressResolution.supportsAddress(address);
  }
}
