import { Libp2p } from '@olane/o-config';
import { oAddress } from './o-address.js';
import { oCore } from '../core/o-core.js';
import { oObject } from '../core/o-object.js';
import { oTransport } from '../transports/o-transport.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import { oHierarchyManager } from '../core/lib/o-hierarchy.manager.js';

export abstract class oAddressResolver extends oObject {
  constructor(protected readonly address: oAddress) {
    super();
  }

  get customTransports(): oTransport[] {
    return [];
  }

  get transportTypes(): TransportType[] {
    return [];
  }

  async resolve(
    address: oAddress,
    hierarchy: oHierarchyManager,
  ): Promise<oAddress> {
    return address;
  }
}
