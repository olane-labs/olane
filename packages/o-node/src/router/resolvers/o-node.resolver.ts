import {
  oAddressResolver,
  oAddress,
  oHierarchyManager,
  TransportType,
} from '@olane/o-core';
import { oNodeAddress } from '../o-node.address.js';
import type { oCore } from '@olane/o-core';

export class oNodeResolver extends oAddressResolver {
  constructor(protected readonly address: oNodeAddress) {
    super(address);
  }

  get supportedTransports(): TransportType[] {
    return [TransportType.LIBP2P];
  }

  async resolve(address: oNodeAddress, node: oCore): Promise<oNodeAddress> {
    const nextAddress = oAddress.next(this.address, address);
    const childAddress = node.hierarchyManager.getChild(nextAddress);

    // get the child address from hierarchy (which includes transports)
    if (childAddress) {
      return childAddress as oNodeAddress;
    }

    return address;
  }
}
