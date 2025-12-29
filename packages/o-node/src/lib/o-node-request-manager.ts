import {
  CoreUtils,
  oConnectionConfig,
  oError,
  oErrorCodes,
  oRequest,
  oRequestManager,
  oResponse,
  ResponseBuilder,
  UseOptions,
} from '@olane/o-core';
import { oNodeRequestManagerConfig } from './interfaces/o-node-request-manager.config.js';
import {
  oNodeConnection,
  oNodeConnectionConfig,
  oNodeConnectionManager,
  oNodeStream,
} from '../connection/index.js';
import { oNodeRouter } from '../router/o-node.router.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { UseDataConfig } from '@olane/o-core/dist/src/core/interfaces/use-data.config.js';
import { oNode } from '../o-node.js';
import { Connection, Stream } from '@olane/o-config';
import {
  oNodeMessageEvent,
  oNodeMessageEventData,
} from '../connection/enums/o-node-message-event.js';
import { oStreamRequest } from '../connection/o-stream.request.js';
import { EventEmitter } from 'events';
import { AbortSignalConfig } from '../connection/interfaces/abort-signal.config.js';
import { RunResult } from '@olane/o-tool';
import { v4 } from 'uuid';

export class oNodeRequestManager extends oRequestManager {
  connectionManager: oNodeConnectionManager;
  router: oNodeRouter;
  protected eventEmitter: EventEmitter = new EventEmitter();

  constructor(readonly config: oNodeRequestManagerConfig) {
    super();
    this.router = new oNodeRouter();
    this.connectionManager = config.connectionManager;
  }

  async translateAddress(
    address: oNodeAddress,
    options?: UseOptions,
    nodeRef?: oNode,
  ): Promise<{ nextHopAddress: oNodeAddress; targetAddress: oNodeAddress }> {
    if (!nodeRef) {
      throw new Error(
        'Failed to translate address due to invalid node reference',
      );
    }
    const { nextHopAddress, targetAddress } = options?.noRouting
      ? { nextHopAddress: address, targetAddress: address }
      : await this.router.translate(address, nodeRef);
    return {
      nextHopAddress: nextHopAddress as oNodeAddress,
      targetAddress: targetAddress as oNodeAddress,
    };
  }

  async connectToNode(
    nextHopAddress: oNodeAddress,
    options: Omit<oNodeConnectionConfig, 'nextHopAddress'>,
  ): Promise<oNodeConnection> {
    if (!this.connectionManager) {
      this.logger.error('Connection manager not initialized');
      throw new Error('Node is not ready to connect to other nodes');
    }
    const connection = await this.connectionManager
      .connect({
        nextHopAddress: nextHopAddress,
        ...options,
      })
      .catch((error) => {
        // TODO: we need to handle this better and document
        if (error.message === 'Can not dial self') {
          this.logger.error(
            'Make sure you are entering the network not directly through the leader node.',
          );
        }
        throw error;
      });
    if (!connection) {
      throw new Error('Connection failed');
    }
    return connection;
  }

  async send(
    address: oNodeAddress,
    data: UseDataConfig,
    options?: UseOptions,
    nodeRef?: oNode,
  ): Promise<oResponse> {
    if (!address.validate()) {
      throw new Error('Invalid address');
    }

    this.logger.debug('Using address: ', address.toString());

    // check for static match
    // TODO
    // if (address.toStaticAddress().equals(this.config.callerAddress.toStaticAddress())) {
    //   return this.useSelf(data);
    // }

    // if no routing is requested, use the address as is
    if (options?.noRouting) {
      this.logger.debug(
        'No routing requested, using address as is',
        address.toString(),
      );
    }
    const { nextHopAddress, targetAddress } = await this.translateAddress(
      address,
      options,
      nodeRef,
    );

    const connection = await this.connectToNode(nextHopAddress, {
      targetAddress: targetAddress,
      callerAddress: this.config.callerAddress,
      readTimeoutMs: options?.readTimeoutMs,
      drainTimeoutMs: options?.drainTimeoutMs,
      isStream: options?.isStream,
      abortSignal: options?.abortSignal,
    });

    if (options?.isStream) {
      connection.onChunk((response) => {
        options.onChunk?.(response);
      });
    }

    // communicate the payload to the target node
    const requestId = data?.id || v4();
    const stream = await connection.send(
      {
        address: targetAddress?.toString() || '',
        payload: data || {},
        id: requestId,
      },
      options,
    );
    const response = await stream.waitForResponse(requestId);
    stream.close();

    // we handle streaming response differently
    if (options?.isStream) {
      return response;
    }

    // if there is an error, throw it to continue to bubble up
    this.handleResponseError(response);
    return response;
  }

  async receiveStream({
    connection,
    stream,
  }: {
    connection: Connection;
    stream: Stream;
  }) {
    const unknown = new oNodeAddress('o://unknown', []);
    const oConnection = await this.connectionManager.answer(
      {
        nextHopAddress: unknown,
        targetAddress: unknown,
        callerAddress: unknown,
        p2pConnection: connection,
      },
      stream,
    );
    // Get the oNodeConnection for this libp2p connection

    if (!oConnection) {
      this.logger.error('Failed to process inbound connection');
      throw new Error('Failed to process inbound connection');
    }

    // listen for requests
    this.listenForMessages(oConnection, {});
  }

  async sendResponse(request: oStreamRequest, result: RunResult) {
    const responseBuilder = ResponseBuilder.create();
    const responseStream = request.stream;
    try {
      // Emit InboundRequest event and wait for handler to process
      const response = await responseBuilder.build(request, result, null);
      await CoreUtils.sendResponse(response, request.stream);

      this.logger.debug(
        `Successfully processed request: method=${request.method}, id=${request.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error processing request: method=${request.method}, id=${request.id}`,
        error,
      );
      const errorResponse = await responseBuilder.buildError(request, error);
      await CoreUtils.sendResponse(errorResponse, responseStream);
    }
  }

  // bubble up the messages to the request handler
  protected async listenForMessages(
    connection: oNodeConnection,
    options: AbortSignalConfig,
  ) {
    if (connection.eventEmitter.listenerCount(oNodeMessageEvent.request) > 0) {
      this.logger.warn(
        'Already listening for this event on connection id:',
        connection.id,
      );
      return;
    }
    connection.on(oNodeMessageEvent.request, async (data: oStreamRequest) => {
      try {
        const result = await this.emitAsync<RunResult>(
          oNodeMessageEvent.request,
          data,
        );
        this.sendResponse(data, result);
      } catch (err) {
        this.logger.error('Error with request:', err);
        const responseBuilder = ResponseBuilder.create();
        const errorResponse = await responseBuilder.buildError(data, err);
        await CoreUtils.sendResponse(errorResponse, data.stream);
        throw err;
      }
    });
  }

  /**
   * Add event listener
   */
  on<K extends oNodeMessageEvent>(
    event: K | string,
    listener: (data: oNodeMessageEventData[K]) => void,
  ): void {
    this.eventEmitter.on(event as string, listener);
  }

  /**
   * Remove event listener
   */
  off<K extends oNodeMessageEvent>(
    event: K | string,
    listener: (data: oNodeMessageEventData[K]) => void,
  ): void {
    this.eventEmitter.off(event as string, listener);
  }

  /**
   * Emit event
   */
  // private emit<K extends oNodeMessageEvent>(
  //   event: K,
  //   data?: oNodeMessageEventData[K],
  // ): void {
  //   this.eventEmitter.emit(event, data);
  // }

  private async emitAsync<T>(event: oNodeMessageEvent, data: any): Promise<T> {
    const listeners = this.eventEmitter.listeners(event);

    if (listeners.length === 0) {
      throw new oError(
        oErrorCodes.INTERNAL_ERROR,
        `No listener registered for event: ${event}`,
      );
    }

    // Call the first listener and await its response
    const listener = listeners[0] as (...args: any[]) => Promise<T>;
    return await listener(data);
  }
}
