import { Connection } from '@olane/o-config';
import {
  CoreUtils,
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
          runOnLimitedConnection: true, // TODO: should this be configurable?
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

      // Send the data with backpressure handling (libp2p v3 best practice)
      const data = new TextEncoder().encode(request.toString());
      const sent = stream.send(data);

      let lastResponse: any;

      await new Promise((resolve, reject) => {
        // TODO: add timeout
        stream.addEventListener('message', async (event) => {
          const response = await CoreUtils.processStreamResponse(event);
          this.emitter.emit('chunk', response);
          // marked as the last chunk let's close
          if (response.result._last || !response.result._isStreaming) {
            // this.logger.debug('Last chunk received...');
            lastResponse = response;
            await stream.close();
            resolve(true);
          }
        });
      });

      // If send() returns false, wait for the stream to drain before continuing
      if (!sent) {
        this.logger.debug('Stream buffer full, waiting for drain...');
        await stream.onDrain({
          signal: AbortSignal.timeout(this.config.drainTimeoutMs ?? 30_000),
        }); // Default: 30 second timeout
      }

      const response = oResponse.fromJSON(lastResponse);
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
