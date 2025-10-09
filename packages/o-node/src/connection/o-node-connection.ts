import {
  Connection,
  Uint8ArrayList,
  pushable,
  all,
  Stream,
  byteStream,
} from '@olane/o-config';
import {
  oConnection,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnectionConfig } from './interfaces/o-node-connection.config.js';

export class oNodeConnection extends oConnection {
  public p2pConnection: Connection;

  constructor(protected readonly config: oNodeConnectionConfig) {
    super(config);
    this.p2pConnection = config.p2pConnection;
  }

  async read(source: Stream) {
    const bytes = byteStream(source);
    const output = await bytes.read({
      signal: AbortSignal.timeout(5_000),
    });
    const outputObj =
      output instanceof Uint8ArrayList ? output.subarray() : output;
    const jsonStr = new TextDecoder().decode(outputObj);
    return JSON.parse(jsonStr);
  }

  validate() {
    if (this.config.p2pConnection.status !== 'open') {
      throw new Error('Connection is not valid');
    }
    // do nothing
  }

  async transmit(request: oRequest): Promise<oResponse> {
    try {
      const stream = await this.p2pConnection.newStream(
        this.nextHopAddress.protocol,
        {
          maxOutboundStreams: Infinity,
        },
      );

      if (!stream || (stream.status !== 'open' && stream.status !== 'reset')) {
        throw new oError(
          oErrorCodes.FAILED_TO_DIAL_TARGET,
          'Failed to dial target',
        );
      }
      if (stream.status === 'reset') {
        throw new oError(
          oErrorCodes.CONNECTION_LIMIT_REACHED,
          'Connection limit reached',
        );
      }

      // Send the data
      await stream.send(new TextEncoder().encode(request.toString()));
      const res = await this.read(stream);

      // process the response
      const response = new oResponse({
        ...res.result,
      });
      return response;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
