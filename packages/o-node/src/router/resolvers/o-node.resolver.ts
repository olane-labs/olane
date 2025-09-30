import {
  oAddressResolver,
  oAddress,
  TransportType,
  CoreUtils,
} from '@olane/o-core';
import { oNodeAddress } from '../o-node.address.js';
import type { oRequest, oRouterRequest } from '@olane/o-core';
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

    // get the next node & check for child address existence
    const remainingPath = address.paths.replace(node.address.paths + '/', '');

    // ensure this is going down in the hierarchy
    if (remainingPath === address.paths && node.isLeader === false) {
      return {
        nextHopAddress: address as oNodeAddress,
        targetAddress: address as oNodeAddress,
        requestOverride: request as oRouterRequest,
      };
    }

    // next term resolver
    const parts = remainingPath.split('/');
    const nextNode = new oNodeAddress(`o://${parts.shift()}`);
    const childAddress = node?.hierarchyManager.getChild(nextNode);

    // get the child address from hierarchy (which includes transports)
    if (childAddress) {
      return {
        nextHopAddress: childAddress as oNodeAddress,
        targetAddress:
          childAddress.value === address.value
            ? (childAddress as oNodeAddress) // update the address to the child absolute address
            : (address as oNodeAddress),
        requestOverride: request as oRouterRequest,
      };
    }

    return {
      nextHopAddress: address as oNodeAddress,
      targetAddress: address as oNodeAddress,
      requestOverride: request,
    };
  }
}
