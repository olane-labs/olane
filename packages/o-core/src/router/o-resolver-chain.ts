import { oAddress } from './o-address.js';
import { oAddressResolver } from './o-address-resolver.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import type { oCore } from '../core/o-core.js';
import { oObject } from '../core/o-object.js';
import { RouteResponse } from './interfaces/route.response.js';
import { ResolveRequest } from './interfaces/resolve.request.js';
import { oRouterRequest } from './o-request.router.js';

/**
 * Manages a chain of address resolvers using the Chain of Responsibility pattern.
 * Sequentially executes registered resolvers to transform addresses and routing requests.
 */
export class oResolverChain extends oObject {
  private readonly resolvers: oAddressResolver[] = [];

  /**
   * Registers a resolver in the chain.
   * @param resolver The resolver to add
   * @param isPriority If true, adds to the front of the chain; otherwise appends to the end
   */
  addResolver(resolver: oAddressResolver, isPriority: boolean = false) {
    if (isPriority) {
      this.resolvers.unshift(resolver);
    } else {
      this.resolvers.push(resolver);
    }
  }

  /**
   * Checks if any resolver in the chain supports the given address.
   * @param address The address to check
   * @returns True if at least one resolver supports this address
   */
  supportsAddress(address: oAddress): boolean {
    return this.resolvers.some((r) =>
      address.transports.some((t) => {
        return r.transportTypes.some((r: TransportType) => r === t.type);
      }),
    );
  }

  /**
   * Executes the resolver chain to transform an address and request.
   * Each resolver in sequence can modify the nextHopAddress, targetAddress, and request.
   * @param request The resolve request containing address, node, and optional request override
   * @returns The final route response after all resolvers have executed
   */
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
