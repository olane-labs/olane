import { oAddress } from './o-address';
import { Logger } from '../utils/logger.js';

export class oRouter {
  private logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  async handleStaticAddressTranslation(
    addressInput: oAddress,
  ): Promise<oAddress> {
    let result = addressInput;
    this.logger.debug(
      'Handling static address translation...',
      result.toString(),
    );
    // handle static address translation
    if (result.value.indexOf('o://leader') === -1) {
      // TODO: we need to be more dynamic around the o://leader prefix
      const response: any = await this.use(
        new oAddress('o://leader/register', result.transports),
        {
          method: 'search',
          params: { staticAddress: result.root },
        },
      );
      const searchResults = response.result.data;
      if (searchResults.length > 0) {
        // the root was found, let's add the rest of the path to the address
        const remainderPaths = result.paths.split('/').slice(1);
        const resolvedAddress =
          searchResults[0].address +
          (remainderPaths.length > 0 ? '/' + remainderPaths.join('/') : ''); // TODO: we need to handle this better
        result = new oAddress(resolvedAddress, result.transports);
      } else {
        this.logger.warn('Failed to translate static address');
        // TODO: we need to handle this better
      }
    }
    return result;
  }

  async translateAddress(addressWithLeaderTransports: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }> {
    // determine if this is external
    const isInternal = this.isInternalAddress(addressWithLeaderTransports);
    if (!isInternal) {
      // external address, so we need to route
      this.logger.debug(
        'Address is external, routing...',
        addressWithLeaderTransports,
      );
      return {
        nextHopAddress: new oAddress(
          'o://leader',
          addressWithLeaderTransports.libp2pTransports,
        ),
        targetAddress: addressWithLeaderTransports,
      };
    }
    let targetAddress = addressWithLeaderTransports;
    let nextHopAddress = addressWithLeaderTransports;

    // handle static address translation for search based upon base functionality
    targetAddress = await this.handleStaticAddressTranslation(targetAddress);

    nextHopAddress = await this.addressResolution.resolve(targetAddress);
    const leaderTransports = this.getTransports(nextHopAddress);
    nextHopAddress.setTransports(leaderTransports);

    return {
      nextHopAddress,
      targetAddress: targetAddress,
    };
  }

  isInternalAddress(addressWithLeaderTransports: oAddress): boolean {
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

  getTransports(address: oAddress): Multiaddr[] {
    let leaderTransports: Multiaddr[] = address.libp2pTransports;

    // check if we already know where we want to go
    if (leaderTransports.length > 0) {
      return leaderTransports as Multiaddr[];
    }

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
