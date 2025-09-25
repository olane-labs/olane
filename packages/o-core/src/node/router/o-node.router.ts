import { oNodeAddress } from './o-node.address';
import { oRouter } from '../../router/o-router';
import { oNodeTransport } from './o-node.transport';
import { oAddress } from '../../router/o-address';
import { RouteResponse } from '../../router/interfaces/route.response';
import { oAddressResolution } from '../../router/o-address-resolution';
import { oNodeRouterConfig } from './interfaces/o-node-router.config';

export class oNodeRouter extends oRouter {
  public addressResolution: oAddressResolution;

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
    const leaderTransports = this.getTransports(nextHopAddress);
    nextHopAddress.setTransports(leaderTransports);

    return {
      nextHopAddress,
      targetAddress: targetAddress,
    };
  }

  isInternal(addressWithLeaderTransports: oNodeAddress): boolean {
    if (addressWithLeaderTransports.libp2pTransports?.length > 0) {
      // transports are provided, let's see if they match our known leaders
      const leaderTransports =
        this.type === NodeType.LEADER
          ? this.address.libp2pTransports
          : this.config.leader?.libp2pTransports;
      this.logger.debug('Leader transports: ', leaderTransports);
      if (leaderTransports && leaderTransports.length > 0) {
        this.logger.debug(
          'Address transports: ',
          addressWithLeaderTransports.libp2pTransports,
        );
        // compare against our known leaders
        const isInternal = leaderTransports.some((t) =>
          addressWithLeaderTransports.libp2pTransports.includes(t),
        );
        return isInternal;
      }
    }
    return true;
  }

  getTransports(address: oNodeAddress): oNodeTransport[] {
    const nodeTransports: oNodeTransport[] =
      address.libp2pTransports as oNodeTransport[];

    // if the transports are provided, then we can use them
    if (nodeTransports.length > 0) {
      return nodeTransports;
    }

    // if we are not in a network & no leaders are provided, then we can't resolve the address
    if (!this.config.hierarchyManager.leaders.length) {
      throw new Error('No leader transports provided, cannot resolve address');
    }

    // if we are in a network, then we have a leader to reference
    const leaderTransports = this.config.hierarchyManager.leaders.map(
      (l: oNodeAddress) => l.libp2pTransports,
    );

    // if leader transports are not provided, then we need to search for them
    // Assume we are looking for a leader within our network for now
    // TODO: we need to add some discovery managers that every node can use to find external network resources
    if (leaderTransports.length === 0) {
      this.logger.debug(
        'No leader transports provided, we are going to search within our own network',
      );
      if (!this.config.leader) {
        // TODO: how do we handle when the node is the leader? // technically we are in the network
        if (this.type === NodeType.LEADER) {
          this.logger.debug('Node is a leader, using own transports');
          leaderTransports = this.transports.map((t) => multiaddr(t));
        } else {
          this.logger.warn(
            'We are not within a network, cannot search for addressed node without leader.',
          );
        }
      } else {
        leaderTransports = this.config.leader.libp2pTransports;
      }
    }

    if (leaderTransports.length === 0) {
      throw new Error(
        'No leader transports provided, cannot search for leaders',
      );
    }
    return leaderTransports as Multiaddr[];
  }
}
