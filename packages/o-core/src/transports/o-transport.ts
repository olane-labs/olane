import { oObject } from '../core/o-object';
import { TransportType } from './interfaces/transport-type.enum';

export abstract class oTransport extends oObject {
  public readonly value: any;
  public readonly type: TransportType = TransportType.LIBP2P;

  constructor(value: any, type: TransportType = TransportType.LIBP2P) {
    super();
    this.value = value;
    this.type = type;
  }

  abstract toString(): string;
}
