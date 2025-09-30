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
    const { address, node, request: resolveRequest } = request;
    if (!node || address.transports.length > 0) {
      return {
        nextHopAddress: address,
        targetAddress: address,
        requestOverride: resolveRequest,
      };
    }

    return {
      nextHopAddress: node.leader as oNodeAddress,
      targetAddress: address,
      requestOverride: resolveRequest,
    };
  }
}
