import {
  oAddress,
  oAddressResolver,
  oCore,
  oCustomTransport,
  oTransport,
  ResolveRequest,
  RestrictedAddresses,
  RouteResponse,
  TransportType,
} from '@olane/o-core';
import { oNodeTransport } from '../o-node.transport.js';

/**
 * Address resolver that searches a registry to find transports for addresses.
 *
 * This resolver queries a registry service to find the transport information
 * for addresses that don't already have transports configured. It's designed
 * to be extensible through subclassing via protected template methods.
 *
 * @example Basic usage
 * ```typescript
 * const resolver = new oSearchResolver(nodeAddress);
 * router.addResolver(resolver);
 * ```
 *
 * @example Creating a custom search resolver
 * ```typescript
 * class CustomSearchResolver extends oSearchResolver {
 *   // Search a different registry
 *   protected getRegistryAddress(): oAddress {
 *     return new oAddress('o://my-custom-registry');
 *   }
 *
 *   // Use round-robin selection instead of first result
 *   private currentIndex = 0;
 *   protected selectResult(results: any[]): any | null {
 *     if (results.length === 0) return null;
 *     const result = results[this.currentIndex % results.length];
 *     this.currentIndex++;
 *     return result;
 *   }
 *
 *   // Add custom filtering logic
 *   protected filterSearchResults(results: any[], node: oCore): any[] {
 *     return super.filterSearchResults(results, node).filter(
 *       result => result.status === 'active'
 *     );
 *   }
 * }
 * ```
 *
 * ## Extension Points
 *
 * The following protected methods can be overridden to customize behavior:
 *
 * - `getRegistryAddress()` - Change which registry to search
 * - `getSearchMethod()` - Change the registry method to call
 * - `buildSearchParams()` - Customize search parameters
 * - `filterSearchResults()` - Add custom filtering logic
 * - `selectResult()` - Implement custom result selection (e.g., load balancing)
 * - `mapTransports()` - Customize how transports are mapped from results
 */
export class oSearchResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/search')];
  }

  /**
   * Returns the address of the registry to search.
   * Override this method to search a different registry.
   * @returns The registry address to query
   */
  protected getRegistryAddress(): oAddress {
    return new oAddress(RestrictedAddresses.REGISTRY);
  }

  /**
   * Returns the method name to call on the registry.
   * Override this method to use a different search method.
   * @returns The method name to call
   */
  protected getSearchMethod(): string {
    return 'search';
  }

  /**
   * Builds the search parameters for the registry query.
   * Override this method to customize search parameters.
   * @param address - The address being resolved
   * @returns Parameters to pass to the registry search method
   */
  protected buildSearchParams(address: oAddress): any {
    return {
      staticAddress: address.toRootAddress().toString(),
      address: address.toString(),
    };
  }

  /**
   * Filters the search results from the registry.
   * Override this method to apply custom filtering logic.
   * @param results - Raw results from the registry
   * @param node - The current node context
   * @returns Filtered array of results
   */
  protected filterSearchResults(results: any[], node: oCore): any[] {
    return results.filter(
      // filter out the items that may cause infinite looping
      (result) =>
        result.staticAddress !== RestrictedAddresses.REGISTRY &&
        result.address !== node.address,
    );
  }

  /**
   * Selects which result to use from the filtered results.
   * Override this method to implement custom selection logic (e.g., load balancing).
   * @param results - Filtered search results
   * @returns The selected result, or null if no suitable result
   */
  protected selectResult(results: any[]): any | null {
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Maps the transport data from the search result to oNodeTransport instances.
   * Override this method to customize transport mapping.
   * @param result - The selected search result
   * @returns Array of oNodeTransport instances
   */
  protected mapTransports(result: any): oNodeTransport[] {
    return result.transports.map(
      (t: { value: string; type: TransportType }) =>
        new oNodeTransport(t.value),
    );
  }

  /**
   * Resolves the transports for the next hop address.
   * This handles the logic of determining which transports to use based on
   * whether the next hop is the leader, a known child, or a new target.
   *
   * Override this method to customize transport resolution logic.
   *
   * @param nextHop - The next hop address
   * @param targetTransports - The transports from the registry search result
   * @param node - The current node context
   * @returns Array of transports to use for the next hop
   */
  protected resolveNextHopTransports(
    nextHop: oAddress,
    targetTransports: oNodeTransport[],
    node: oCore,
  ): oNodeTransport[] {
    // If next hop is the leader, use leader transports
    if (nextHop.value === RestrictedAddresses.LEADER) {
      return (node.leader?.transports || []) as oNodeTransport[];
    }

    // Check if next hop is a known child in the hierarchy
    const childAddress = node?.hierarchyManager.getChild(nextHop);
    if (childAddress?.transports) {
      return childAddress.transports as oNodeTransport[];
    }

    // Fall back to target transports from registry
    return targetTransports;
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest, targetAddress } = request;

    // Early return: if address already has transports, no search needed
    if (address.transports.length > 0) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }

    // Perform registry search
    const searchParams = this.buildSearchParams(address);
    const registryAddress = this.getRegistryAddress();
    this.logger.debug('registryAddress', registryAddress.toJSON());
    const searchResponse = await node.use(registryAddress, {
      method: this.getSearchMethod(),
      params: searchParams,
    });

    // Filter and select result
    const filteredResults = this.filterSearchResults(
      searchResponse.result.data as any[],
      node,
    );
    const selectedResult = this.selectResult(filteredResults);

    this.logger.debug(
      'selectedResult',
      JSON.stringify(selectedResult, null, 2),
    );

    // Early return: if no result found, return original address
    if (!selectedResult) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }

    // Build route from search result
    const extraParams = address
      .toString()
      .replace(address.toRootAddress().toString(), '');

    const resolvedTargetAddress = new oAddress(
      selectedResult.address + extraParams,
    );
    const nextHopAddress = oAddress.next(node.address, resolvedTargetAddress);
    const targetTransports = this.mapTransports(selectedResult);

    // Set transports on addresses
    nextHopAddress.setTransports(
      this.resolveNextHopTransports(nextHopAddress, targetTransports, node),
    );
    resolvedTargetAddress.setTransports(targetTransports);

    this.logger.debug(
      'nextHopAddress',
      JSON.stringify(nextHopAddress, null, 2),
    );
    this.logger.debug(
      'resolvedTargetAddress',
      JSON.stringify(resolvedTargetAddress, null, 2),
    );

    return {
      nextHopAddress: nextHopAddress,
      targetAddress: resolvedTargetAddress,
      requestOverride: resolveRequest,
    };
  }
}
