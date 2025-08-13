import { oNode } from '../../../node/index.js';
import { oAddress } from '../../o-address.js';
import { oAddressResolver } from '../o-address-resolver.js';

export abstract class oAnythingResolver extends oAddressResolver {
  get transports(): string[] {
    return ['/anything'];
  }

  async resolve(address: oAddress, node: oNode): Promise<oAddress> {
    const nextHopAddress = this.determineNextHopAddress(address);
    // at this point, the next-hop resolver did not work so we can trust that the
    // next hop should be contained within the current node as an abstraction
    this.logger.debug('Resolving anything address: ', address);
    return new oAddress(
      nextHopAddress.toString(),
      (address.transports || []).concat(this.transports),
    );
  }
}
