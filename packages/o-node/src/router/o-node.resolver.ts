import { oAddressResolver, oAddress, oHierarchyManager } from '@olane/o-core';
import { oNodeAddress } from './o-node.address.js';

export class oNodeResolver extends oAddressResolver {
  constructor(protected readonly address: oNodeAddress) {
    super(address);
  }

  async resolve(
    address: oNodeAddress,
    hierarchy: oHierarchyManager,
  ): Promise<oNodeAddress> {
    const nextAddress = oAddress.next(this.address, address);
    const childAddress = hierarchy.getChild(nextAddress);

    // get the child address from hierarchy (which includes transports)
    if (childAddress) {
      return childAddress as oNodeAddress;
    }

    return address;
  }
}
