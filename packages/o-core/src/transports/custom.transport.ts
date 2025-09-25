import { TransportType } from './interfaces/transport-type.enum.js';
import { oTransport } from './o-transport.js';

export class oCustomTransport extends oTransport {
  constructor(value: string) {
    super(value, TransportType.CUSTOM);
  }

  toString(): string {
    return this.value.toString();
  }
}
