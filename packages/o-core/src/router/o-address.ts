import { oObject } from '../core/o-object.js';
import { oTransport } from '../transports/o-transport.js';
import { RestrictedAddresses } from './enums/restricted-addresses.enum';

export class oAddress extends oObject {
  constructor(
    public readonly value: string,
    public transports: Array<oTransport> = [],
  ) {
    super(value);
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

  toString(): string {
    return this.value;
  }

  supportsTransport(transport: oTransport): boolean {
    return this.transports.some((t) => t.type === transport.type);
  }

  static equals(a: oAddress, b: oAddress): boolean {
    return a.value === b.value;
  }

  static leader(): oAddress {
    return new oAddress(RestrictedAddresses.LEADER);
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
      remainingPath === targetAddress.toString() ||
      oAddress.isStatic(targetAddress)
    ) {
      return oAddress.leader();
    }
    // we need to go to the child address
    const nextHop = remainingPath.replace('/o/', '').split('/').reverse().pop();
    return new oAddress(address.value + '/' + nextHop);
  }
}
