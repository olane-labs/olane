import { oAddress } from '../router/o-address.js';
import { oRequest } from './o-request.js';
import { oProtocolMethods } from '@olane/o-protocol';
import { oResponse } from './o-response.js';
import { ConnectionSendParams } from './interfaces/connection-send-params.interface.js';
import { v4 as uuidv4 } from 'uuid';
import { oObject } from '../core/o-object.js';
import { oConnectionConfig } from './interfaces/connection.config.js';
import { EventEmitter } from 'events';

export abstract class oConnection extends oObject {
  public readonly id: string;
  protected readonly emitter: EventEmitter = new EventEmitter();

  constructor(protected readonly config: oConnectionConfig) {
    super();
    this.id = uuidv4();
    this.logger.setNamespace(
      'Connection:[' +
        (config.callerAddress?.value || 'unknown') +
        ']-->[' +
        this.address.value +
        ']:' +
        this.id,
    );
  }

  get abortSignal(): AbortSignal | undefined {
    return this.config.abortSignal;
  }

  get address(): oAddress {
    return this.config.address;
  }

  get nextHopAddress(): oAddress {
    return this.config.nextHopAddress;
  }

  get callerAddress(): oAddress | undefined {
    return this.config.callerAddress;
  }

  onChunk(listener: (response: oResponse) => void) {
    this.emitter.addListener('chunk', listener);
  }

  validate(dto?: any): void {
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
        _callerAddress: this.callerAddress?.value,
        _isStreaming: this.config.isStream ?? false,
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
