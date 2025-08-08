import { Connection, Uint8ArrayList, pushable, all } from '@olane/o-config';
import { Logger } from '../utils/logger';
import { oAddress } from '../o-address';
import { v4 as uuidv4 } from 'uuid';
import { oRequest } from './o-request';
import { oProtocolMethods } from '@olane/o-protocol';
import { oResponse } from './o-response';
import { ConnectionSendParams } from '../interfaces/connection-send-params.interface';

export class oConnection {
  public readonly id: string;
  private readonly logger: Logger;
  private readonly p2pConnection: Connection;
  private readonly address: oAddress;
  private readonly nextHopAddress: oAddress;
  private requestCounter: number = 0;

  constructor(
    private readonly config: {
      nextHopAddress: oAddress;
      callerAddress?: oAddress;
      address: oAddress;
      p2pConnection: Connection;
    },
  ) {
    this.id = uuidv4();
    this.address = config.address;
    this.nextHopAddress = config.nextHopAddress;
    this.logger = new Logger(
      'Connection:[' +
        (config.callerAddress?.value || 'unknown') +
        ']-->[' +
        this.address.value +
        ']:' +
        this.id,
    );
    this.p2pConnection = config.p2pConnection;
  }

  async read(source) {
    const chunks: any = await all(source);

    const data = new Uint8ArrayList(...chunks).slice();
    if (!data || data.length === 0) {
      throw new Error('No data received');
    }
    return JSON.parse(new TextDecoder().decode(data));
  }

  validate() {
    if (this.config.p2pConnection.status !== 'open') {
      throw new Error('Connection is not valid');
    }
    // do nothing
  }

  createRequest(method: string, params: ConnectionSendParams): oRequest {
    return new oRequest({
      method: method,
      params: {
        _connectionId: this.id,
        _requestMethod: method,
        ...params,
      },
      id: this.requestCounter++,
    });
  }

  async start() {
    this.logger.debug('Starting handshake, address: ' + this.address.value);
    const params = this.createRequest(oProtocolMethods.ROUTE, {
      address: this.address.value,
      payload: {
        method: oProtocolMethods.HANDSHAKE,
        params: {},
      },
    });
    const request = new oRequest(params);
    return this.transmit(request);
  }

  async transmit(request: oRequest): Promise<oResponse> {
    const stream = await this.p2pConnection.newStream(
      this.nextHopAddress.protocol,
    );

    // Create a pushable stream
    const pushableStream = pushable();
    pushableStream.push(new TextEncoder().encode(request.toString()));
    pushableStream.end();

    // Send the data
    await stream.sink(pushableStream);
    const res = await this.read(stream.source);

    // process the response
    const response = new oResponse({
      ...res.result,
    });
    return response;
  }

  async send(data: ConnectionSendParams): Promise<oResponse> {
    // proxy through the router tool
    const request = this.createRequest(oProtocolMethods.ROUTE, data);
    return this.transmit(request);
  }

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
