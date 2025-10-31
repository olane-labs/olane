import {
  CoreUtils,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
  ChildJoinedEvent,
} from '@olane/o-core';
import { oTool } from '@olane/o-tool';
import { oServerNode } from './nodes/server.node.js';
import { Connection, Stream } from '@olane/o-config';
import { oNodeTransport } from './router/o-node.transport.js';
import { oNodeAddress } from './router/o-node.address.js';

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
    // CRITICAL: Attach message listener immediately to prevent buffer overflow (libp2p v3)
    // Per libp2p migration guide: "If no message event handler is added, streams will
    // buffer incoming data until a pre-configured limit is reached, after which the stream will be reset."
    const messageHandler = async (event: any) => {
      if (!event.data) {
        this.logger.warn('Malformed event data');
        return;
      }
      const requestConfig: oRequest =
        await CoreUtils.processStreamRequest(event);
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
    };

    // Attach listener synchronously before any async operations
    stream.addEventListener('message', messageHandler);
  }

  async _tool_identify(): Promise<any> {
    return {
      address: this.address.toString(),
      staticAddress: this.staticAddress?.toString(),
      transports: this.transports.map((t) => t.toMultiaddr().toString()),
    };
  }

  async _tool_child_register(request: oRequest): Promise<any> {
    this.logger.debug('Child register: ', request.params);
    const { address, transports }: any = request.params;
    const childAddress = new oNodeAddress(
      address,
      transports.map((t: string) => new oNodeTransport(t)),
    );

    // Add child to hierarchy
    this.hierarchyManager.addChild(childAddress);

    // Emit child joined event
    if (this.notificationManager) {
      this.notificationManager.emit(
        new ChildJoinedEvent({
          source: this.address,
          childAddress,
          parentAddress: this.address,
        }),
      );
    }

    return {
      message: `Child node registered with parent! ${childAddress.toString()}`,
      parentTransports: this.parentTransports.map((t) => t.toString()),
    };
  }
}
