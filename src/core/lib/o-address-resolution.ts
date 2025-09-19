import { oAddress } from '../o-address.js';
import { oAddressResolver } from './o-address-resolver.js';

export class oAddressResolution {
  private readonly resolvers: oAddressResolver[] = [];

  addResolver(resolver: oAddressResolver) {
    this.resolvers.push(resolver);
  }

  supportsTransport(address: oAddress): boolean {
    if (address.libp2pTransports.length > 0) {
      return false;
    }
    return this.resolvers.some((r) =>
      address.customTransports.some((t) => {
        console.log(
          'Checking if resolver supports transport: ',
          t,
          r.transports,
        );
        return r.transports.includes(t);
      }),
    );
  }

  async resolve(address: oAddress): Promise<oAddress> {
    let resolvedAddress = new oAddress(address.toString(), address.transports);
    for (const resolver of this.resolvers) {
      resolvedAddress = await resolver.resolve(resolvedAddress);
    }
    return resolvedAddress;
  }
}
