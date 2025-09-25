import { oNode } from '../../node/o-node.js';
import { oAddress } from '../../router/o-address.js';
import { oCustomTransport } from '../../transports/custom.transport.js';
import { TransportType } from '../../transports/interfaces/transport-type.enum.js';
import { oTransport } from '../../transports/o-transport.js';
import { oAnythingResolver } from './anything.resolver.js';

export class oMethodResolver extends oAnythingResolver {
  static get customTransports(): oTransport[] {
    return [new oCustomTransport('/method')];
  }
  async resolve(address: oAddress, node: oNode): Promise<oAddress> {
    const nextHopAddress = await super.resolve(address, node);
    const method: string | undefined = nextHopAddress.protocol.split('/').pop();
    if (method) {
      const methodName = node.myTools()[method as any];
      if (methodName) {
        return new oAddress(
          nextHopAddress.toString(),
          oMethodResolver.customTransports,
        );
      }
    }
    return address;
  }
}
