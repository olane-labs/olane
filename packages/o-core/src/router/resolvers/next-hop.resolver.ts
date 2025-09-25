import { Libp2p, multiaddr, Multiaddr } from '@olane/o-config';
import { oAddress } from '../../o-address.js';
import { oAddressResolver } from '../o-address-resolver.js';
import { NetworkUtils } from '../../utils/network.utils.js';

export class NextHopResolver extends oAddressResolver {
  // when we use the network to find the next hop, we need to make sure we are just searching for child addresses
  async resolveAddressToTransports(address: oAddress): Promise<Multiaddr[]> {
    try {
      this.logger.debug('Finding node for address: ', address.toString());
      const { transports } = await NetworkUtils.findNode(this.p2pNode, address);
      this.logger.debug('Found node for address: ', transports);
      return transports;
    } catch (e) {
      this.logger.warn('No providers found', e);
      return [];
    }
  }

  async findProviderTransports(address: oAddress): Promise<Multiaddr[]> {
    this.logger.debug(
      'Finding provider transports for address: ',
      address.toString(),
    );
    // let's default the static resolution to the p2p approach
    if (this.isStaticAddress(address)) {
      return this.resolveAddressToTransports(address);
    }
    const peers = await this.p2pNode.peerStore.all();
    const peer = peers.find((p) =>
      p.protocols.some((p) => p === address.protocol),
    );
    this.logger.debug('Found peer: ', peer);
    if (
      !peer ||
      !peer.addresses.length
      // &&
      // this.isHoppingDown(address) &&
      // !this.isLeaderNextHop(address)
    ) {
      return this.resolveAddressToTransports(address);
    }
    if (!peer) {
      return [];
    }
    return peer.addresses.map((a: any) =>
      multiaddr(a.multiaddr + '/p2p/' + peer.id.toString()),
    );
  }

  async findNextHop(targetAddress: oAddress): Promise<oAddress> {
    // check to see if we are at the destination
    if (targetAddress.protocol === this.address.protocol) {
      this.logger.debug('At destination, finding provider transports...');
      const transports = await this.findProviderTransports(targetAddress);
      return new oAddress(
        targetAddress.value,
        transports.map((t) => multiaddr(t)),
      );
    }

    const nextHopAddress = this.determineNextHopAddress(targetAddress);

    const transports = await this.findProviderTransports(nextHopAddress);
    if (!transports.length) {
      this.logger.warn(
        'No transports found for next hop: ' + nextHopAddress.toString(),
      );
    }
    return new oAddress(nextHopAddress.toString(), transports);
  }

  async resolve(address: oAddress): Promise<oAddress> {
    // return this.findNextHop(address);
    return this.findNextHop(address);
  }
}
