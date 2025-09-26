import { oNodeAddress } from './o-node.address.js';
import { oNodeTransport } from './o-node.transport.js';
import { oNodeRouterConfig } from './interfaces/o-node-router.config.js';
import { oNodeHierarchyManager } from '../o-node-hierarchy.manager.js';
import {
  oAddress,
  oAddressResolution,
  oRouter,
  RouteResponse,
} from '@olane/o-core';

export class oNodeRouter extends oRouter {
  constructor(readonly config: oNodeRouterConfig) {
    super();
    this.addressResolution = new oAddressResolution(
      this.config.hierarchyManager,
    );
  }

  private handleExternalAddress(address: oNodeAddress): RouteResponse | null {
    // determine if this is external
    const isInternal = this.isInternal(address);
    if (!isInternal) {
      // external address, so we need to route
      this.logger.debug('Address is external, routing...', address);

      // route to leader of external OS
      return {
        nextHopAddress: new oNodeAddress(
          oAddress.leader().toString(),
          address.libp2pTransports,
        ),
        targetAddress: address,
      };
    }
    return null;
  }

  async translate(address: oNodeAddress): Promise<RouteResponse> {
    const externalRoute = this.handleExternalAddress(address);
    if (externalRoute) {
      return externalRoute;
    }

    const targetAddress = address;
    const nextHopAddress = await this.addressResolution.resolve(targetAddress);
    const leaderTransports = this.getTransports(nextHopAddress as oNodeAddress);
    nextHopAddress.setTransports(leaderTransports);

    return {
      nextHopAddress,
      targetAddress: targetAddress,
    };
  }

  isInternal(addressWithTransports: oNodeAddress): boolean {
    if (addressWithTransports.libp2pTransports?.length > 0) {
      // transports are provided, let's see if they match our known leaders
      const isLeaderRef =
        addressWithTransports.toString() === oAddress.leader().toString();
      const isOurLeaderRef = this.config.hierarchyManager.leaders.some((l) =>
        l.equals(addressWithTransports),
      );
      return isLeaderRef || isOurLeaderRef;
    }
    return true;
  }

  getTransports(address: oNodeAddress): oNodeTransport[] {
    const nodeTransports = address.libp2pTransports;

    // if the transports are provided, then we can use them
    if (nodeTransports.length > 0) {
      return nodeTransports;
    }

    // if we are not in a network & no leaders are provided, then we can't resolve the address
    if (!this.config.hierarchyManager.leaders.length) {
      throw new Error('No leader transports provided, cannot resolve address');
    }

    // if we are in a network, then we have a leader to reference
    const leaderTransports = (
      this.config.hierarchyManager as oNodeHierarchyManager
    ).leaders.map((l: oNodeAddress) => l.libp2pTransports);

    return leaderTransports.flat();
  }
}
