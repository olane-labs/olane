import { oAddress, oRequest, ChildJoinedEvent } from '@olane/o-core';
import { oTool } from '@olane/o-tool';
import { oServerNode } from './nodes/server.node.js';
import { Connection, Stream } from '@olane/o-config';
import { oNodeTransport } from './router/o-node.transport.js';
import { oNodeAddress } from './router/o-node.address.js';
import { ConnectionUtils } from './utils/connection.utils.js';
import { StreamManagerEvent } from './connection/stream-manager.events.js';
import type { InboundRequestData } from './connection/stream-manager.events.js';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export class oNodeTool extends oTool(oServerNode) {
  async handleProtocolReuse(address: oAddress) {
    const reuseProtocol = address.protocol + '/reuse';
    this.logger.debug('Handling protocol reuse: ' + reuseProtocol);
    const protocols = this.p2pNode.getProtocols();
    if (protocols.find((p) => p === reuseProtocol)) {
      // already handling
      return;
    }
    const maxOutboundsStreams = process.env.MAX_OUTBOUND_STREAMS
      ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
      : 1000;
    await this.p2pNode.handle(
      reuseProtocol,
      this.handleStreamReuse.bind(this),
      {
        maxInboundStreams: 10_000,
        maxOutboundStreams: maxOutboundsStreams,
        runOnLimitedConnection: true, // reuse is always on limited connections
      },
    );
    this.logger.debug('Handled protocol reuse: ' + reuseProtocol);
  }

  async handleProtocol(address: oAddress) {
    const protocols = this.p2pNode.getProtocols();
    if (protocols.find((p) => p === address.protocol)) {
      // already handling
      return;
    }
    const maxOutboundsStreams = process.env.MAX_OUTBOUND_STREAMS
      ? parseInt(process.env.MAX_OUTBOUND_STREAMS)
      : 1000;
    this.logger.debug('Handling protocol: ' + address.protocol, {
      maxInboundStreams: 10_000,
      maxOutboundStreams: maxOutboundsStreams,
      runOnLimitedConnection: this.config.runOnLimitedConnection,
    });
    await this.p2pNode.handle(address.protocol, this.handleStream.bind(this), {
      maxInboundStreams: 10_000,
      maxOutboundStreams: maxOutboundsStreams,
      runOnLimitedConnection: this.config.runOnLimitedConnection,
    });
    await this.handleProtocolReuse(address);
  }

  async initializeProtocols() {
    this.logger.info('Initializing custom protocols for node...');
    await this.handleProtocol(this.address);
    if (
      this.staticAddress &&
      this.staticAddress?.toString() !== this.address.toString()
    ) {
      await this.handleProtocol(this.staticAddress);
    }
  }

  async initialize(): Promise<void> {
    await super.initialize();
    await this.initializeProtocols();
  }

  async handleStreamReuse(
    stream: Stream,
    connection: Connection,
  ): Promise<void> {
    return this.handleStream(stream, connection, true);
  }

  async handleStream(
    stream: Stream,
    connection: Connection,
    reuse?: boolean,
  ): Promise<void> {
    let remoteAddress: oNodeAddress = new oNodeAddress('o://unknown', []);
    if (reuse) {
      this.logger.debug('Handle stream with reuse = true');
      // record inbound connection to manager
      remoteAddress = await ConnectionUtils.addressFromConnection({
        currentNode: this,
        connection: connection,
      });
    }

    const oConnection = await this.connectionManager.answer({
      nextHopAddress: remoteAddress,
      address: remoteAddress,
      callerAddress: this.address,
      p2pConnection: connection,
      reuse,
    });

    // Get the oNodeConnection for this libp2p connection
    // const oConnection =
    //   this.connectionManager.getConnectionByP2pConnection(connection);

    if (!oConnection) {
      this.logger.error('No oNodeConnection found for incoming stream', {
        remotePeer: connection.remotePeer.toString(),
        connectionId: connection.id,
      });
      return;
    }

    // Subscribe to InboundRequest events from the stream manager
    // This follows an event-driven pattern for handling incoming requests
    oConnection.streamManager.on(
      StreamManagerEvent.InboundRequest,
      async (data: InboundRequestData) => {
        try {
          const result = await this.execute(data.request, data.stream);
          // Return the raw result - StreamManager will build and send the response
          return result;
        } catch (error: any) {
          this.logger.error(
            'Error executing tool: ',
            data.request.toString(),
            error,
            typeof error,
          );
          throw error; // StreamManager will handle error response building
        }
      },
    );

    // Use the connection's StreamManager for consistent stream handling
    // This follows libp2p v3 best practices for length-prefixed streaming
    await oConnection.streamManager.handleIncomingStream(stream, connection);
  }

  async _tool_identify(): Promise<any> {
    return {
      address: this.address.toString(),
      staticAddress: this.staticAddress?.toString(),
      transports: this.transports.map((t) => t.toMultiaddr().toString()),
    };
  }

  async _tool_child_register(request: oRequest): Promise<any> {
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

    // create downward direction connection
    this.logger.debug('Pinging child to confirm access');
    await this.useChild(childAddress, {
      method: 'ping',
      params: {},
    });

    return {
      message: `Child node registered with parent! ${childAddress.toString()}`,
      parentTransports: this.parentTransports.map((t) => t.toString()),
    };
  }
}
