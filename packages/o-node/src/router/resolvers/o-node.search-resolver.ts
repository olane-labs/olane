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
    if (address.transports.length > 0) {
      return {
        nextHopAddress: address,
        targetAddress: address,
        requestOverride: resolveRequest,
      };
    }
    // search the leader registry for the address
    const extraParams = address
      .toString()
      .replace(address.toRootAddress().toString(), '');
    const params = {
      staticAddress: address.toRootAddress().toString(),
      address: address.toString(),
    };
    const registrySearchResults = await node.use(
      new oAddress(RestrictedAddresses.REGISTRY),
      {
        method: 'search',
        params: params,
      },
    );

    // if there are results, return the first one
    const registrySearchResultsArray = (
      registrySearchResults.result.data as any[]
    ).filter(
      // filter out the items that may cause infinite looping
      (result) =>
        result.staticAddress !== RestrictedAddresses.REGISTRY &&
        result.address !== node.address,
    );

    if (registrySearchResultsArray.length > 0) {
      const registrySearchResult = registrySearchResultsArray[0];
      // we know the final destination, so let's return it + the next hop
      const targetAddress = new oAddress(
        registrySearchResult.address + extraParams,
      );
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
