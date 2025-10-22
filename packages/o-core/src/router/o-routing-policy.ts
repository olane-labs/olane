import { oAddress } from './o-address.js';
import { oObject } from '../core/o-object.js';
import type { oCore } from '../core/o-core.js';
import { RouteResponse } from './interfaces/route.response.js';

/**
 * Provides routing policy decisions based on network topology and address characteristics.
 * Determines whether addresses are internal/external, when to route to leaders, etc.
 *
 * This layer separates network topology awareness from address resolution logic,
 * making routing decisions testable without network calls.
 */
export abstract class oRoutingPolicy extends oObject {
  /**
   * Determines if an address is internal to the current network/hierarchy.
   * @param address The address to check
   * @param node The current node context
   * @returns True if the address is internal, false if external
   */
  abstract isInternalAddress(address: oAddress, node: oCore): boolean;

  /**
   * Determines if the given address points to the node itself.
   * @param address The address to check
   * @param node The current node context
   * @returns True if this is a self-reference
   */
  isSelfAddress(address: oAddress, node: oCore): boolean {
    return node.address.equals(address);
  }

  /**
   * Checks if an address should be routed to a leader node.
   * Returns a RouteResponse if leader routing is required, null otherwise.
   * @param address The address to evaluate
   * @param node The current node context
   * @returns RouteResponse for leader routing, or null if not applicable
   */
  abstract getExternalRoutingStrategy(
    address: oAddress,
    node: oCore,
  ): RouteResponse | null;
}
