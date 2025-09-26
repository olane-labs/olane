import { Multiaddr, multiaddr } from '@olane/o-config';
import { CID } from 'multiformats';
import { oNodeTransport } from './o-node.transport.js';
import { CoreUtils, Logger, oAddress, TransportType } from '@olane/o-core';

export class oNodeAddress extends oAddress {
  public transports: oNodeTransport[] = [];

  constructor(
    public readonly value: string,
    transports: oNodeTransport[] = [],
  ) {
    super(value);
    this.transports = transports;
  }

  static fromJSON(json: {
    value: string;
    transports: string[] | Multiaddr[];
  }): oNodeAddress {
    return new oNodeAddress(
      json.value,
      json.transports.map(
        (t: any) => new oNodeTransport(t as string | Multiaddr),
      ),
    );
  }

  get libp2pTransports(): oNodeTransport[] {
    return this.transports.filter((t) => t.type === TransportType.LIBP2P);
  }

  get customTransports(): oNodeTransport[] {
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
