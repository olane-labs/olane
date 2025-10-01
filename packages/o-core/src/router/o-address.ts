import { CID } from 'multiformats';
import { oObject } from '../core/o-object.js';
import { TransportType } from '../transports/index.js';
import { oTransport } from '../transports/o-transport.js';
import { CoreUtils } from '../utils/core.utils.js';
import { RestrictedAddresses } from './enums/restricted-addresses.enum.js';

export class oAddress extends oObject {
  public transports: oTransport[];

  constructor(
    public readonly value: string,
    transports: oTransport[] = [],
  ) {
    super(value);
    this.transports = transports;
  }

  get libp2pTransports(): oTransport[] {
    return this.transports.filter((t) => t.type === TransportType.LIBP2P) || [];
  }

  get customTransports(): oTransport[] {
    return this.transports.filter((t) => t.type === TransportType.CUSTOM) || [];
  }

  equals(other: oAddress): boolean {
    return this.value === other.value && this.transportsEqual(other);
  }

  transportsEqual(other: oAddress): boolean {
    return this.transports.every((t) =>
      other.transports.some((t2) => t.toString() === t2.toString()),
    );
  }

  setTransports(transports: oTransport[]): void {
    this.transports = transports;
  }

  validate(): boolean {
    if (!this.value.startsWith('o://')) {
      return false;
    }
    return true;
  }

  get paths(): string {
    return this.value.replace('o://', '');
  }

  get protocol(): string {
    return this.value.replace('o://', '/o/');
  }

  get root(): string {
    return 'o://' + this.paths.split('/')[0];
  }

  toStaticAddress(): oAddress {
    const paths = this.paths.split('/');
    if (paths.length === 0) {
      return this;
    }
    return new oAddress(`o://${paths[paths.length - 1]}`);
  }

  toRootAddress(): oAddress {
    const paths = this.paths.split('/');
    if (paths.length === 0) {
      return this;
    }
    return new oAddress(`o://${paths[0]}`);
  }

  toString(): string {
    return this.value;
  }

  supportsTransport(transport: oTransport): boolean {
    return this.transports.some((t) => t.type === transport.type);
  }

  async toCID(): Promise<CID> {
    return await CoreUtils.toCID({ address: this.toString() });
  }

  static equals(a: oAddress, b: oAddress): boolean {
    return a.value === b.value;
  }

  static leader(): oAddress {
    return new oAddress(RestrictedAddresses.LEADER);
  }

  static lane(): oAddress {
    return new oAddress(RestrictedAddresses.LANE);
  }

  static registry(): oAddress {
    return new oAddress(RestrictedAddresses.REGISTRY);
  }

  static isStatic(address: oAddress): boolean {
    return address.value.startsWith(RestrictedAddresses.LEADER) === false;
  }

  static next(address: oAddress, targetAddress: oAddress): oAddress {
    const remainingPath = targetAddress.protocol.replace(
      address.protocol + '/',
      '',
    );
    // we are at the destination
    if (remainingPath === '') {
      return address;
    }
    // do we need to go back to the leader?
    if (
      !address.equals(oAddress.leader()) && // if we are a leader, do not got back to self
      (remainingPath === targetAddress.protocol ||
        oAddress.isStatic(targetAddress))
    ) {
      return oAddress.leader();
    }
    // we need to go to the child address
    const nextHop = remainingPath.replace('/o/', '').split('/').reverse().pop();
    return new oAddress(address.value + '/' + nextHop);
  }
}
