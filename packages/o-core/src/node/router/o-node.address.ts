import { Multiaddr, multiaddr } from '@olane/o-config';
import { CID } from 'multiformats';
import { CoreUtils } from '../../utils/core.utils.js';
import { oTransport } from '../../transports/o-transport.js';
import { oAddress } from '../../router/o-address.js';
import { TransportType } from '../../transports/interfaces/transport-type.enum.js';

export class oNodeAddress extends oAddress {
  constructor(
    public readonly value: string,
    public transports: Array<oTransport> = [],
  ) {
    super(value);
  }

  setTransports(transports: oTransport[]): void {
    this.transports = transports;
  }

  get libp2pTransports(): oTransport[] {
    return this.transports.filter((t) => t.type === TransportType.LIBP2P);
  }

  get customTransports(): oTransport[] {
    return this.transports.filter((t) => t.type === TransportType.CUSTOM);
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

  toMultiaddr(): Multiaddr {
    return multiaddr(this.protocol);
  }

  static fromMultiaddr(ma: Multiaddr): oAddress {
    return new oAddress(ma.toString().replace('/o/', 'o://'));
  }

  static equals(a: oAddress, b: oAddress): boolean {
    return a.value === b.value;
  }

  async toCID(): Promise<CID> {
    return await CoreUtils.toCID({ address: this.toString() });
  }
}
