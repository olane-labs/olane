import { oAddress } from './o-address.js';
import { oAddressResolver } from './o-address-resolver.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import { oHierarchyManager } from '../core/lib/o-hierarchy.manager.js';

export class oAddressResolution {
  private readonly resolvers: oAddressResolver[] = [];

  constructor(private readonly hierarchy: oHierarchyManager) {
    this.hierarchy = hierarchy;
  }

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

  async resolve(address: oAddress): Promise<oAddress> {
    let resolvedAddress = new oAddress(address.toString(), address.transports);
    for (const resolver of this.resolvers) {
      resolvedAddress = await resolver.resolve(resolvedAddress, this.hierarchy);
    }
    return resolvedAddress;
  }
}
