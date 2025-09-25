import { Libp2p, Multiaddr } from '@olane/o-config';
import { Logger } from '../utils/logger.js';
import { oAddress } from './o-address.js';
import { oCore } from '../core/o-core.js';

export class oAddressResolver {
  public logger: Logger;
  constructor(
    protected readonly address: oAddress,
    protected readonly p2pNode: Libp2p,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  get transports(): string[] {
    return [];
  }

  isHoppingDown(targetAddress: oAddress): boolean {
    return targetAddress.protocol?.includes(this.address.protocol) === false;
  }

  isLeaderNextHop(targetAddress: oAddress): boolean {
    return targetAddress.protocol?.includes(this.address.protocol) === false;
  }

  isStaticAddress(targetAddress: oAddress): boolean {
    return targetAddress.toString()?.includes('o://leader') === false;
  }

  determineNextHopAddress(targetAddress: oAddress) {
    // do we have to start at the root leader or continue forward?
    const startAtLeader =
      targetAddress.protocol?.includes(this.address.protocol) === false;
    const prefix = startAtLeader ? 'o://' : this.address.value + '/';

    // determine the next hop
    const remainingPath = startAtLeader
      ? targetAddress.protocol
      : targetAddress.protocol.replace(this.address.protocol + '/', '');
    const nextHop = remainingPath.replace('/o/', '').split('/').reverse().pop();
    const nextHopAddress = new oAddress(prefix + nextHop);
    return nextHopAddress;
  }

  async resolve(address: oAddress, node?: oCore): Promise<oAddress> {
    return address;
  }
}
