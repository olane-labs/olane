import { multiaddr, Multiaddr } from '@olane/o-config';
import { TransportType } from '../../transports/interfaces/transport-type.enum';
import { oTransport } from '../../transports/o-transport';

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
}
