import { oAddress } from '../o-address';
import { oAddressResolver } from './o-address-resolver';

export class oAddressResolution {
  private readonly resolvers: oAddressResolver[] = [];

  addResolver(resolver: oAddressResolver) {
    this.resolvers.push(resolver);
  }

  supportsTransport(address: oAddress): boolean {
    return this.resolvers.some((r) =>
      address.customTransports.some((t) => {
        return r.transports.includes(t);
      }),
    );
  }

  async resolve(address: oAddress): Promise<oAddress> {
    let resolvedAddress = new oAddress(address.toString(), address.transports);
    for (const resolver of this.resolvers) {
      resolvedAddress = await resolver.resolve(resolvedAddress);
    }
    // // ensure we have the transports from the original address
    // if (address.transports.length > 0) {
    //   resolvedAddress.setTransports(address.transports as Multiaddr[]);
    // }
    return resolvedAddress;
  }
}
