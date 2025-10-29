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
 *
 *   // Implement custom routing logic with transport setup
 *   protected determineNextHop(
 *     node: oCore,
 *     resolvedTargetAddress: oAddress,
 *     searchResult: any
 *   ): oAddress {
 *     // Always route directly to target, bypassing hierarchy
 *     const targetTransports = this.mapTransports(searchResult);
 *     resolvedTargetAddress.setTransports(targetTransports);
 *     return resolvedTargetAddress;
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
 * - `determineNextHop()` - Implement custom routing logic to determine the next hop address
 * - `resolveNextHopTransports()` - Customize transport resolution for the next hop
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
    return new oAddress('o://leader/registry');
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

  /**
   * Determines the next hop address for routing to the target and sets up its transports.
   *
   * This method implements the complete routing logic including:
   * 1. Determining the next address in the path (using `oAddress.next()`)
   * 2. Mapping transports from the search result
   * 3. Resolving and setting transports on the next hop address
   * 4. Setting transports on the target address
   *
   * The default implementation:
   * - Uses `oAddress.next()` for standard hierarchy-based routing
   * - Maps transports from the registry search result
   * - Resolves next hop transports based on leader/hierarchy
   * - Configures both next hop and target with appropriate transports
   *
   * Override this method to implement custom routing logic, such as:
   * - Direct peer-to-peer routing
   * - Custom hierarchy traversal
   * - Alternative transport selection strategies
   * - Bypass leader for certain routes
   *
   * @param node - The current node context
   * @param resolvedTargetAddress - The resolved target address to route to
   * @param searchResult - The raw search result from the registry containing transport data
   * @returns The next hop address with transports configured
   *
   * @example Custom direct routing
   * ```typescript
   * class DirectSearchResolver extends oSearchResolver {
   *   protected determineNextHop(
   *     node: oCore,
   *     resolvedTargetAddress: oAddress,
   *     searchResult: any
   *   ): oAddress {
   *     // Always route directly to the target, bypassing hierarchy
   *     const targetTransports = this.mapTransports(searchResult);
   *     resolvedTargetAddress.setTransports(targetTransports);
   *     return resolvedTargetAddress;
   *   }
   * }
   * ```
   */
  protected determineNextHop(
    node: oCore,
    resolvedTargetAddress: oAddress,
    searchResult: any,
  ): oAddress {
    // Determine next hop using standard hierarchy logic
    const nextHopAddress = oAddress.next(node.address, resolvedTargetAddress);

    // Map transports from search result
    const targetTransports = this.mapTransports(searchResult);

    // Set transports on the next hop based on routing logic
    nextHopAddress.setTransports(
      this.resolveNextHopTransports(nextHopAddress, targetTransports, node),
    );

    return nextHopAddress;
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

    // Perform registry search with error handling
    const searchParams = this.buildSearchParams(address);
    const registryAddress = this.getRegistryAddress();

    let searchResponse;
    try {
      searchResponse = await node.use(registryAddress, {
        method: this.getSearchMethod(),
        params: searchParams,
      });
    } catch (error) {
      // Log the error but don't throw - allow fallback resolvers to handle it
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if this is a circuit breaker error (fast-fail scenario)
      if (errorMessage.includes('Circuit breaker is OPEN')) {
        this.logger.warn(
          `Registry search blocked by circuit breaker for ${address.toString()}: ${errorMessage}`,
        );
      } else {
        this.logger.error(
          `Registry search failed for ${address.toString()}: ${errorMessage}`,
        );
      }

      // Return original address without transports, letting next resolver in chain handle it
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }

    // Filter and select result
    const filteredResults = this.filterSearchResults(
      searchResponse.result.data as any[],
      node,
    );
    const selectedResult = this.selectResult(filteredResults);

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
      .toString() // o://embeddings-text replace o://embeddings-text = ''
      .replace(address.toRootAddress().toString(), '');

    // Check if selectedResult.address already contains the complete path
    // This happens when registry finds via staticAddress - the returned address
    // is the canonical hierarchical location, so we shouldn't append extraParams
    const resultAddress = selectedResult.address;
    const shouldAppendParams =
      extraParams && !resultAddress.endsWith(extraParams);

    const resolvedTargetAddress = new oAddress(
      shouldAppendParams ? resultAddress + extraParams : resultAddress,
    );

    // Set transports on the target address
    resolvedTargetAddress.setTransports(this.mapTransports(selectedResult));

    // Determine next hop and configure transports
    const nextHopAddress = this.determineNextHop(
      node,
      resolvedTargetAddress,
      selectedResult,
    );

    return {
      nextHopAddress: nextHopAddress,
      targetAddress: resolvedTargetAddress,
      requestOverride: resolveRequest,
    };
  }
}
