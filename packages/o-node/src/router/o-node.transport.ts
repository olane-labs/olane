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

  // TODO: improve this to account for all variations of transport values from libp2p
  toPeerId(): string {
    // handle relayed addresses
    if (this.value.toString()?.indexOf('/p2p-circuit') > -1) {
      return this.value.toString().split('/p2p-circuit/p2p/')[1];
    }
    const peerId = this.value.toString().split('/p2p/')[1];
    return peerId;
  }
}
