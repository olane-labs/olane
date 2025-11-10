import {
  CoreUtils,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  oResponse,
  ResponseBuilder,
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
      maxInboundStreams: 10_000,
      maxOutboundStreams: process.env.MAX_OUTBOUND_STREAMS
        ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
        : 1000,
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
      const requestConfig: oRequest = await CoreUtils.processStream(event);
      const request = new oRequest(requestConfig);

      // Use ResponseBuilder with automatic error handling and metrics tracking
      const responseBuilder = ResponseBuilder.create().withMetrics(
        this.metrics,
      );

      let response: oResponse;
      try {
        const result = await this.execute(request, stream);
        response = await responseBuilder.build(request, result, null);
      } catch (error: any) {
        this.logger.error(
          'Error executing tool: ',
          request.toString(),
          error,
          typeof error,
        );
        response = await responseBuilder.buildError(request, error);
      }

      // Send the response
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
