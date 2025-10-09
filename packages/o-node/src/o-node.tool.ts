import {
  CoreUtils,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
} from '@olane/o-core';
import { oTool } from '@olane/o-tool';
import { oServerNode } from './nodes/server.node.js';
import { Connection, Stream } from '@olane/o-config';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export class oNodeTool extends oTool(oServerNode) {
  async handleProtocol(address: oAddress) {
    this.logger.debug('Handling protocol: ' + address.protocol);
    await this.p2pNode.handle(address.protocol, this.handleStream.bind(this), {
      maxInboundStreams: Infinity,
      maxOutboundStreams: Infinity,
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    await this.handleProtocol(this.address);
    if (
      this.staticAddress &&
      this.staticAddress?.toString() !== this.address.toString()
    ) {
      await this.handleProtocol(this.staticAddress);
    }
  }

  async handleStream(stream: Stream, connection: Connection): Promise<void> {
    stream.addEventListener('message', async (event) => {
      if (!event.data) {
        this.logger.warn('Malformed event data');
        return;
      }
      const requestConfig: oRequest = await CoreUtils.processStream(event);
      const request = new oRequest(requestConfig);
      let success = true;
      const result = await this.execute(request, stream).catch((error) => {
        this.logger.error(
          'Error executing tool: ',
          request.toString(),
          error,
          typeof error,
        );
        success = false;
        const responseError: oError =
          error instanceof oError
            ? error
            : new oError(oErrorCodes.UNKNOWN, error.message);
        return {
          error: responseError.toJSON(),
        };
      });
      if (success) {
        this.metrics.successCount++;
      } else {
        this.metrics.errorCount++;
      }
      // compose the response & add the expected connection + request fields

      const response: oResponse = CoreUtils.buildResponse(
        request,
        result,
        result?.error,
      );

      // add the request method to the response
      await CoreUtils.sendResponse(response, stream);
    });
  }
}
