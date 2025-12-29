import {
  oAddress,
  oConnectionConfig,
  oConnectionManager,
  oRequest,
  oRequestManager,
  oResponse,
  UseOptions,
} from '@olane/o-core';
import { oNodeRequestManagerConfig } from './interfaces/o-node-request-manager.config.js';
import {
  oNodeConnection,
  oNodeConnectionConfig,
  oNodeConnectionManager,
} from '../connection/index.js';
import { oNodeRouter } from '../router/o-node.router.js';
import { oNodeAddress } from '../router/o-node.address.js';
import { UseDataConfig } from '@olane/o-core/dist/src/core/interfaces/use-data.config.js';

export class oNodeRequestManager extends oRequestManager {
  connectionManager: oNodeConnectionManager | undefined;
  router: oNodeRouter;

  constructor(readonly config: oNodeRequestManagerConfig) {
    super();
    this.router = new oNodeRouter();
  }

  async translateAddress(
    address: oNodeAddress,
    options?: UseOptions,
  ): Promise<{ nextHopAddress: oNodeAddress; targetAddress: oNodeAddress }> {
    const { nextHopAddress, targetAddress } = options?.noRouting
      ? { nextHopAddress: address, targetAddress: address }
      : await this.router.translate(address);
    return {
      nextHopAddress: nextHopAddress as oNodeAddress,
      targetAddress: targetAddress as oNodeAddress,
    };
  }

  async connectToNode(
    address: oNodeAddress,
    options?: Omit<oConnectionConfig, 'nextHopAddress'>,
  ): Promise<oNodeConnection> {
    if (!this.connectionManager) {
      this.logger.error('Connection manager not initialized');
      throw new Error('Node is not ready to connect to other nodes');
    }
    const connection = await this.connectionManager
      .connect(config)
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
  ): Promise<oResponse> {
    if (!address.validate()) {
      throw new Error('Invalid address');
    }

    this.logger.debug('Using address: ', address.toString());

    // check for static match
    // TODO
    // if (address.toStaticAddress().equals(this.address.toStaticAddress())) {
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
    );

    // if (
    //   nextHopAddress?.toStaticAddress().equals(this.address.toStaticAddress())
    // ) {
    //   return this.useSelf(data);
    // }

    const connection = await this.connectToNode(nextHopAddress, {
      targetAddress: targetAddress,
      callerAddress: this.address,
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
    const response = await connection.send({
      address: targetAddress?.toString() || '',
      payload: data || {},
      id: data?.id,
    });

    // we handle streaming response differently
    if (options?.isStream) {
      return response;
    }

    // if there is an error, throw it to continue to bubble up
    this.handleResponseError(response);
    return response;
  }
}
