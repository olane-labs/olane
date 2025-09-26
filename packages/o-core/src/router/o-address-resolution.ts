import { oAddress } from './o-address.js';
import { oAddressResolver } from './o-address-resolver.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import type { oCore } from '../core/o-core.js';
import { oObject } from '../core/o-object.js';

export class oAddressResolution extends oObject {
  private readonly resolvers: oAddressResolver[] = [];

  addResolver(resolver: oAddressResolver) {
    this.resolvers.push(resolver);
  }

  supportsAddress(address: oAddress): boolean {
    return this.resolvers.some((r) =>
      address.transports.some((t) => {
        return r.transportTypes.some((r: TransportType) => r === t.type);
      }),
    );
  }

  async resolve(address: oAddress, node: oCore): Promise<oAddress> {
    let resolvedAddress = new oAddress(address.toString(), address.transports);
    for (const resolver of this.resolvers) {
      resolvedAddress = await resolver.resolve(resolvedAddress, node);
    }
    return resolvedAddress;
  }
}
