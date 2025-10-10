import {
  oAddress,
  oAddressResolver,
  oCustomTransport,
  oTransport,
  ResolveRequest,
  RouteResponse,
} from '@olane/o-core';
import { oNodeTransport } from '@olane/o-node';

export class oGatewayResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/olane')];
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest, targetAddress } = request;
    if (
      !address.paths.startsWith('olane') ||
      targetAddress?.customTransports?.some(
        (t) => this.customTransports.some((ct) => ct.value === t.value), // if the transport /olane is included, route through the gateway
      )
    ) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }
    // this is destined for the olane gateway
    const olaneAddress = oAddress.leader();
    olaneAddress.setTransports([
      new oNodeTransport('/dns4/leader.olane.com/tcp/3000/tls'),
    ]);
    return {
      nextHopAddress: olaneAddress,
      targetAddress: targetAddress,
      requestOverride: resolveRequest,
    };
  }
}
