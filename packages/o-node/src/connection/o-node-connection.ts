import { Connection, Uint8ArrayList, pushable, all } from '@olane/o-config';
import { oProtocolMethods } from '@olane/o-protocol';
import {
  ConnectionSendParams,
  oConnection,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';

export class oNodeConnection extends oConnection {
  protected p2pConnection: Connection;

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection;
  }

  async read(source: any) {
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

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
