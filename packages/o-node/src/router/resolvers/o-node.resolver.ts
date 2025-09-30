import {
  oAddressResolver,
  oAddress,
  TransportType,
  CoreUtils,
} from '@olane/o-core';
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
    if (!node) {
      return {
        nextHopAddress: address as oNodeAddress,
        targetAddress: address as oNodeAddress,
        requestOverride: request,
      };
    }
    // if we are the same address, return the address
    if (address.toStaticAddress().equals(node.address.toStaticAddress())) {
      return {
        nextHopAddress: node.address as oNodeAddress,
        targetAddress: node.address as oNodeAddress,
        requestOverride: request as oRequest,
      };
    }
    // get the next node & check for child address existence
    const remainingPath = address.paths.replace(node.address.paths + '/', '');
    // ensure this is going down in the hierarchy
    if (remainingPath === address.paths && node.isLeader === false) {
      return {
        nextHopAddress: node.address as oNodeAddress,
        targetAddress: address as oNodeAddress,
        requestOverride: request as oRequest,
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
