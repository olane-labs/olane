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
    const childAddress = node?.hierarchyManager.getChild(address);
    this.logger.debug(
      `[${node?.address}]: Children: ${node?.hierarchyManager.children.map((c) => c.toString()).join(', ')}`,
    );
    this.logger.debug(
      `[${node?.address}]: Resolving address: ${address.toString()} and child address: ${childAddress?.toString()}`,
    );
    this.logger.debug(
      'Child transports: ' +
        childAddress?.transports.map((t) => t.toString()).join(', '),
    );

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
