import { Stream } from '@olane/o-config';
import {
  CoreUtils,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oNodeConnection } from '@olane/o-node';

export class oLimitedConnection extends oNodeConnection {
  async getOrCreateStream(): Promise<Stream> {
    if (this.p2pConnection.status !== 'open') {
      throw new oError(oErrorCodes.INVALID_STATE, 'Connection not open');
    }
    // check if we have an open stream
    const stream = this.p2pConnection.streams.find(
      (stream) => stream.status === 'open',
    );
    if (stream) {
      this.logger.debug(
        'Reusing existing stream for address: ' +
          this.nextHopAddress.toString(),
      );
      return stream;
    }
    this.logger.debug(
      'Creating new stream for address: ' + this.nextHopAddress.toString(),
    );
    return super.getOrCreateStream();
  }

  async postTransmit(stream: Stream) {
    // do nothing as we don't want to close the stream
  }
}
