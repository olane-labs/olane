import { oAddressResolver, oAddress, TransportType } from '@olane/o-core';
import { oNodeAddress } from '../o-node.address.js';
import type { oRequest } from '@olane/o-core';
import { oNodeRouterResponse } from '../interfaces/o-node-router.response.js';
import { ResolveRequest } from '@olane/o-core';

export class oNodeResolver extends oAddressResolver {
  constructor(protected readonly address: oNodeAddress) {
    super(address);
  }

  get supportedTransports(): TransportType[] {
    return [TransportType.LIBP2P];
  }

  async resolve(routeRequest: ResolveRequest): Promise<oNodeRouterResponse> {
    const { address, node, request } = routeRequest;
    const nextAddress = oAddress.next(this.address, address);
    const childAddress = node?.hierarchyManager.getChild(nextAddress);

    // get the child address from hierarchy (which includes transports)
    if (childAddress) {
      return {
        nextHopAddress: childAddress as oNodeAddress,
        targetAddress: address as oNodeAddress,
        requestOverride: request as oRequest,
      };
    }

    return {
      nextHopAddress: address as oNodeAddress,
      targetAddress: address as oNodeAddress,
      requestOverride: request as oRequest,
    };
  }
}
