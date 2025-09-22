import { oNode } from '../../../node/index.js';
import { oAddress } from '../../o-address.js';
import { oAnythingResolver } from './anything.resolver.js';

export class oMethodResolver extends oAnythingResolver {
  static get transports(): string[] {
    return ['/method'];
  }
  async resolve(address: oAddress, node: oNode): Promise<oAddress> {
    const nextHopAddress = await super.resolve(address, node);
    const method: string | undefined = nextHopAddress.protocol.split('/').pop();
    if (method) {
      const methodName = node.myTools()[method as any];
      if (methodName) {
        return new oAddress(
          nextHopAddress.toString(),
          oMethodResolver.transports,
        );
      }
    }
    return address;
  }
}
