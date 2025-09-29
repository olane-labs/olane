import { oAddress } from './o-address.js';
import { oObject } from '../core/o-object.js';
import { oTransport } from '../transports/o-transport.js';
import { TransportType } from '../transports/interfaces/transport-type.enum.js';
import { RouteResponse } from './interfaces/route.response.js';
import { ResolveRequest } from './interfaces/resolve.request.js';

export abstract class oAddressResolver extends oObject {
  constructor(protected readonly address: oAddress) {
    super();
  }

  get customTransports(): oTransport[] {
    return [];
  }

  get transportTypes(): TransportType[] {
    return this.customTransports.map((transport) => transport.type);
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    return {
      nextHopAddress: request.address,
      targetAddress: request.address,
    };
  }
}
