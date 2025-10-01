import {
  oAddress,
  oAddressResolver,
  oCustomTransport,
  oTransport,
  ResolveRequest,
  RestrictedAddresses,
  RouteResponse,
  TransportType,
} from '@olane/o-core';
import { oNodeTransport } from '../o-node.transport.js';
import { oNodeAddress } from '../o-node.address.js';

export class oLeaderResolverFallback extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/fallback/leader')];
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest, targetAddress } = request;
    // check to see if something odd was attempted where the leader transports were applied to a different address
    if (
      node.leader &&
      address.transports.some((t) => node.leader?.transports.includes(t))
    ) {
      return {
        nextHopAddress: node.leader as oNodeAddress,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }
    // if already has transports, return the address
    if (address.transports.length > 0) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }

    return {
      nextHopAddress: node.leader as oNodeAddress,
      targetAddress: targetAddress,
      requestOverride: resolveRequest,
    };
  }
}
