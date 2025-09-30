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

export class oSearchResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/search')];
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest } = request;
    if (
      !node ||
      address.transports.length > 0 ||
      address.value === RestrictedAddresses.REGISTRY
    ) {
      return {
        nextHopAddress: address,
        targetAddress: address,
        requestOverride: resolveRequest,
      };
    }
    node.logger.debug(
      '[oSearchResolver] Resolving address: ',
      address.toString(),
    );
    // search the leader registry for the address
    const registrySearchResults = await node.use(
      new oAddress(RestrictedAddresses.REGISTRY),
      {
        method: 'search',
        params: {
          staticAddress: address.toString(),
          address: address.toString(),
        },
      },
    );

    // if there are results, return the first one
    const registrySearchResultsArray = registrySearchResults.result
      .data as any[];

    if (registrySearchResultsArray.length > 0) {
      const registrySearchResult = registrySearchResultsArray[0];
      // we know the final destination, so let's return it + the next hop
      const targetAddress = new oAddress(registrySearchResult.address);
      const nextHopAddress = oAddress.next(node.address, targetAddress);
      const targetTransports = registrySearchResult.transports.map(
        (t: { value: string; type: TransportType }) =>
          new oNodeTransport(t.value),
      );
      const childAddress = node?.hierarchyManager.getChild(nextHopAddress);
      nextHopAddress.setTransports(
        nextHopAddress.value === RestrictedAddresses.LEADER
          ? node.leader?.transports
          : childAddress?.transports || targetTransports,
      );
      targetAddress.setTransports(targetTransports);
      node.logger.debug(
        'nextHopAddress and targetAddress',
        nextHopAddress,
        targetAddress,
      );
      return {
        nextHopAddress: nextHopAddress,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }
    return {
      nextHopAddress: address,
      targetAddress: address,
      requestOverride: resolveRequest,
    };
  }
}
