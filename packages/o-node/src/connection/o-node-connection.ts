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
    this.setupConnectionListeners();
  }

  setupConnectionListeners() {
    this.logger.debug(
      'Setting up connection listeners for address: ' +
        this.nextHopAddress.toString(),
    );
    this.p2pConnection?.addEventListener('close', () => {
      this.logger.debug(
        'Connection closed for address: ' + this.nextHopAddress.toString(),
      );
    });
  }

  validate() {
    if (this.config.p2pConnection.status !== 'open') {
      throw new Error('Connection is not valid');
    }
    // do nothing
  }

  async transmit(request: oRequest): Promise<oResponse> {
    try {
      if (this.config.runOnLimitedConnection) {
        this.logger.debug('Running on limited connection...');
      }
      const stream = await this.p2pConnection.newStream(
        this.nextHopAddress.protocol,
        {
          signal: this.abortSignal,
          maxOutboundStreams: process.env.MAX_OUTBOUND_STREAMS
            ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
            : 1000,
          runOnLimitedConnection: this.config.runOnLimitedConnection ?? false,
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
        const abortHandler = async () => {
          try {
            await stream.abort(new Error('Request aborted'));
          } catch (e) {
            // Stream may already be closed
          }
          reject(new Error('Request aborted'));
        };

        // Listen for abort signal
        if (this.abortSignal) {
          this.abortSignal.addEventListener('abort', abortHandler);
        }

        stream.addEventListener('message', async (event) => {
          const response = await CoreUtils.processStreamResponse(event);
          this.emitter.emit('chunk', response);
          // marked as the last chunk let's close
          if (response.result._last || !response.result._isStreaming) {
            // this.logger.debug('Last chunk received...');
            lastResponse = response;
            // Clean up abort listener before closing
            if (this.abortSignal) {
              this.abortSignal.removeEventListener('abort', abortHandler);
            }
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

      if (stream.status === 'open') {
        await stream.abort(new Error('Connection closed'));
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

  async abort(error: Error) {
    this.logger.debug('Aborting connection');
    await this.p2pConnection.abort(error);
    this.logger.debug('Connection aborted');
  }

  async close() {
    this.logger.debug('Closing connection');
    await this.p2pConnection.close();
    this.logger.debug('Connection closed');
  }
}
