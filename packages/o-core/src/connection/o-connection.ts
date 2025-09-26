import { oAddress } from '../router/o-address.js';
import { oRequest } from './o-request.js';
import { oProtocolMethods } from '@olane/o-protocol';
import { oResponse } from './o-response.js';
import { ConnectionSendParams } from './interfaces/connection-send-params.interface.js';
import { v4 as uuidv4 } from 'uuid';
import { oObject } from '../core/o-object.js';
import { oConnectionConfig } from './interfaces/connection.config.js';

export abstract class oConnection extends oObject {
  public readonly id: string;
  public readonly address: oAddress;
  public readonly nextHopAddress: oAddress;
  public readonly callerAddress: oAddress | undefined;

  constructor(protected readonly config: oConnectionConfig) {
    super();
    this.id = uuidv4();
    this.address = config.address;
    this.nextHopAddress = config.nextHopAddress;
    this.callerAddress = config.callerAddress;
    this.logger.setNamespace(
      'Connection:[' +
        (config.callerAddress?.value || 'unknown') +
        ']-->[' +
        this.address.value +
        ']:' +
        this.id,
    );
  }

  validate(): void {
    if (!this.address || !this.nextHopAddress || !this.callerAddress) {
      throw new Error('Connection configuration is invalid');
    }
  }

  createRequest(method: string, params: ConnectionSendParams): oRequest {
    return new oRequest({
      method: method,
      params: {
        _connectionId: this.id,
        _requestMethod: method,
        ...params,
      },
      id: params.id || uuidv4(),
    });
  }

  abstract transmit(request: oRequest): Promise<oResponse>;

  async send(data: ConnectionSendParams): Promise<oResponse> {
    // proxy through the router tool
    const request = this.createRequest(oProtocolMethods.ROUTE, data);
    return this.transmit(request);
  }

  async close() {
    this.logger.debug('Closing connection...');
  }
}
