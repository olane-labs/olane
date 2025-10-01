import { oAddress } from './o-address.js';
import { oAddressResolver } from './o-address-resolver.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import type { oCore } from '../core/o-core.js';
import { oObject } from '../core/o-object.js';
import { RouteResponse } from './interfaces/route.response.js';
import { ResolveRequest } from './interfaces/resolve.request.js';
import { oRouterRequest } from './o-request.router.js';

export class oAddressResolution extends oObject {
  private readonly resolvers: oAddressResolver[] = [];

  addResolver(resolver: oAddressResolver) {
    this.resolvers.push(resolver);
  }

  supportsAddress(address: oAddress): boolean {
    return this.resolvers.some((r) =>
      address.transports.some((t) => {
        return r.transportTypes.some((r: TransportType) => r === t.type);
      }),
    );
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    let resolvedAddress = new oAddress(
      request.address.toString(),
      request.address.transports,
    );

    let targetAddress = resolvedAddress;
    let requestOverride: oRouterRequest | undefined = request.request;

    for (const resolver of this.resolvers) {
      const {
        nextHopAddress,
        targetAddress: resolverTargetAddress,
        requestOverride: resolverRequestOverride,
      } = await resolver.resolve({
        address: resolvedAddress,
        targetAddress: targetAddress,
        node: request.node,
        request: requestOverride,
      });
      requestOverride = resolverRequestOverride || requestOverride;
      targetAddress = resolverTargetAddress || targetAddress;
      resolvedAddress = nextHopAddress;
    }

    return {
      nextHopAddress: resolvedAddress,
      targetAddress: targetAddress,
      requestOverride: requestOverride,
    };
  }
}
