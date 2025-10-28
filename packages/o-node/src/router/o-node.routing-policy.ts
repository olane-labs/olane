import { oAddress, oRoutingPolicy, RouteResponse } from '@olane/o-core';
import type { oNode } from '../o-node.js';
import { oNodeAddress } from './o-node.address.js';

/**
 * Routing policy implementation for oNode that handles internal/external routing decisions
 * and leader-based routing strategies.
 */
export class oNodeRoutingPolicy extends oRoutingPolicy {
  /**
   * Determines if an address is internal to the current node's hierarchy.
   * An address is considered internal if:
   * 1. It doesn't have leader references, OR
   * 2. Its leader references match our known leaders
   *
   * @param address The address to check
   * @param node The current node context
   * @returns True if the address is internal to this hierarchy
   */
  isInternalAddress(address: oAddress, node: oNode): boolean {
    const nodeAddress = address as oNodeAddress;

    // if we are trying to connect to a parent, it's internal
    if (node.hierarchyManager.parents.some((p) => p.equals(address))) {
      return true;
    }

    if (
      nodeAddress.paths.indexOf(oAddress.leader().paths) !== -1 && // if the address has a leader
      nodeAddress.libp2pTransports?.length > 0
    ) {
      // transports are provided, let's see if they match our known leaders
      const isLeaderRef =
        nodeAddress.toString() === oAddress.leader().toString();
      const isOurLeaderRef =
        node.address.equals(nodeAddress) ||
        node.hierarchyManager.leaders.some((l) => l.equals(nodeAddress));
      return isLeaderRef || isOurLeaderRef;
    }
    return true;
  }

  /**
   * Determines the routing strategy for external addresses.
   * External addresses are routed to the leader of the external OS using
   * the address's libp2p transports.
   *
   * @param address The address to evaluate
   * @param node The current node context
   * @returns RouteResponse if external routing is needed, null if internal
   */
  getExternalRoutingStrategy(
    address: oAddress,
    node: oNode,
  ): RouteResponse | null {
    const nodeAddress = address as oNodeAddress;
    const isInternal = this.isInternalAddress(address, node);

    if (!isInternal) {
      // external address, so we need to route
      this.logger.debug('Address is external, routing...', nodeAddress);

      // route to leader of external OS
      return {
        nextHopAddress: new oNodeAddress(
          oAddress.leader().toString(),
          nodeAddress.libp2pTransports,
        ),
        targetAddress: nodeAddress,
      };
    }
    return null;
  }
}
