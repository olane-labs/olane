import { multiaddr, Multiaddr } from '@olane/o-config';
import { oTransport, TransportType } from '@olane/o-core';

export class oNodeTransport extends oTransport {
  public readonly type: TransportType = TransportType.LIBP2P;
  public value: Multiaddr | string;

  constructor(value: Multiaddr | string) {
    super(value);
    this.value = value;
  }

  toMultiaddr(): Multiaddr {
    return multiaddr(this.toString());
  }

  toString(): string {
    return this.value.toString();
  }

  toPeerId(): string {
    return this.value.toString().split('/p2p/')[1];
  }
}
