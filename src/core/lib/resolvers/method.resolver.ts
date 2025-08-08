import { oNode } from '../../../node';
import { oAddress } from '../../o-address';
import { oAnythingResolver } from './anything.resolver';

export class oMethodResolver extends oAnythingResolver {
  static get transports(): string[] {
    return ['/method'];
  }
  async resolve(address: oAddress, node: oNode): Promise<oAddress> {
    const nextHopAddress = await super.resolve(address, node);
    const method = nextHopAddress.protocol.split('/').pop();
    if (method) {
      const methodName = node.myTools()[method];
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
