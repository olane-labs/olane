import { oAddress } from './o-address.js';
import { oAddressResolver } from './o-address-resolver.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import type { oCore } from '../core/o-core.js';
import { oObject } from '../core/o-object.js';
import { RouteResponse } from './interfaces/route.response.js';
import { oRequest } from '../connection/o-request.js';
import { ResolveRequest } from './interfaces/resolve.request.js';

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

    let requestOverride: oRequest | undefined = request.request;

    for (const resolver of this.resolvers) {
      const { nextHopAddress, requestOverride: resolverRequestOverride } =
        await resolver.resolve({
          address: resolvedAddress,
          node: request.node,
          request: requestOverride,
        });
      this.logger.debug(
        `[${request.node?.address}]: Resolved address: ${request.address.toString()} to ${nextHopAddress.toString()}`,
      );
      requestOverride = resolverRequestOverride || requestOverride;
      resolvedAddress = nextHopAddress;
    }

    return {
      nextHopAddress: resolvedAddress,
      targetAddress: request.address,
      requestOverride,
    };
  }
}
