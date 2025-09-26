import { oAddress } from './o-address';

import { oObject } from '../core/o-object.js';
import { oAddressResolution } from './o-address-resolution';
import { oAddressResolver } from './o-address-resolver';
import { oTransport } from '../transports';

export abstract class oRouter extends oObject {
  public addressResolution!: oAddressResolution;

  abstract translate(addressWithLeaderTransports: oAddress): Promise<{
    nextHopAddress: oAddress;
    targetAddress: oAddress;
  }>;

  abstract isInternal(addressWithLeaderTransports: oAddress): boolean;

  addResolver(resolver: oAddressResolver): void {
    this.addressResolution.addResolver(resolver);
  }

  supportsAddress(address: oAddress): boolean {
    return this.addressResolution.supportsAddress(address);
  }
}
