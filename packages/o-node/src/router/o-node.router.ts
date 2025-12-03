import { oNodeAddress } from './o-node.address.js';
import {
  CoreUtils,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  oRouterRequest,
  oResponse,
  ResponseBuilder,
  RouteResponse,
} from '@olane/o-core';
import type { oNode } from '../o-node.js';
import { oToolRouter } from '@olane/o-tool';
import { RequestParams } from '@olane/o-protocol';
import { oNodeRoutingPolicy } from './o-node.routing-policy.js';
import { Stream } from '@olane/o-config';
import { oStreamRequest } from '../connection/o-stream.request.js';

export class oNodeRouter extends oToolRouter {
  private routingPolicy: oNodeRoutingPolicy;

  constructor() {
    super();
    this.routingPolicy = new oNodeRoutingPolicy();
  }

  /**
   * Forwards a request to the specified address via libp2p transport.
   * Handles self-routing (local execution) and destination detection.
   *
   * @param address The next hop address to forward to
   * @param request The router request to forward
   * @param node The current node context
   * @returns The response from the forwarded request
   */
  protected async forward(
    address: oNodeAddress,
    request: oRouterRequest,
    node: oNode,
  ): Promise<any> {
    if (!request.stream) {
      throw new oError(oErrorCodes.INVALID_REQUEST, 'Stream is required');
    }

    let nextHopRequest: oRequest | oStreamRequest = new oRequest({
      method: request.method,
      params: request.params,
      id: request.id,
    });
    if (request.stream) {
      (nextHopRequest as oStreamRequest).stream = request.stream;
    }

    // Handle self-routing: execute locally instead of dialing
    if (this.routingPolicy.isSelfAddress(address, node)) {
      return this.executeSelfRouting(request, node);
    }

    // Check if we've reached the final destination
    const isDestination = this.isDestinationAddress(address, request);
    if (isDestination) {
      nextHopRequest = this.unwrapDestinationRequest(request);
    }

    // Dial and transmit to remote node
    return this.dialAndTransmit(address, nextHopRequest, node);
  }

  /**
   * Executes a request locally when routing to self.
   * Now uses ResponseBuilder for consistency with useSelf() behavior.
   */
  private async executeSelfRouting(
    request: oRouterRequest,
    node: oNode,
  ): Promise<any> {
    const { payload } = request.params;
    const params = payload.params as RequestParams;
    const localRequest = new oRequest({
      method: payload.method as string,
      params: {
        ...params,
        _connectionId: request.params._connectionId as string,
        _requestMethod: payload.method as string,
      },
      id: request.id,
    });

    // Create ResponseBuilder with metrics tracking
    const responseBuilder = ResponseBuilder.create().withMetrics(node.metrics);

    // Handle streaming requests
    const isStream = request.params._isStreaming as boolean;
    if (isStream && request.stream) {
      // For streaming, we need to handle the stream chunks
      try {
        const result = await node.execute(localRequest, request.stream);
        const response = await responseBuilder.build(
          localRequest,
          result,
          null,
          {
            isStream: true,
          },
        );
        // Return unwrapped data for consistency with dialAndTransmit
        return response.result.data;
      } catch (error: any) {
        const errorResponse = await responseBuilder.buildError(
          localRequest,
          error,
          {
            isStream: true,
          },
        );
        // For errors, throw to match remote behavior
        throw responseBuilder.normalizeError(error);
      }
    }

    // Handle non-streaming requests with error handling
    try {
      const result = await node.execute(localRequest);
      const response = await responseBuilder.build(localRequest, result, null);
      // Return unwrapped data to match dialAndTransmit behavior
      return response.result.data;
    } catch (error: any) {
      // Build error response for metrics tracking
      await responseBuilder.buildError(localRequest, error);
      // Then throw the normalized error
      throw responseBuilder.normalizeError(error);
    }
  }

  /**
   * Checks if the next hop is the final destination address.
   */
  private isDestinationAddress(
    address: oNodeAddress,
    request: oRouterRequest,
  ): boolean {
    return address
      ?.toStaticAddress()
      .equals(new oAddress(request?.params?.address).toStaticAddress());
  }

  /**
   * Unwraps the routing envelope when we've reached the destination.
   */
  private unwrapDestinationRequest(request: oRouterRequest): oRequest {
    const { payload } = request.params;
    const params = payload.params as RequestParams;
    return new oStreamRequest({
      method: payload.method as string,
      params: { ...params },
      id: request.id,
      stream: request.stream as Stream,
    });
  }

  /**
   * Dials a remote node and transmits the request via libp2p.
   */
  private async dialAndTransmit(
    address: oNodeAddress,
    request: oRequest | oStreamRequest,
    node: oNode,
  ): Promise<any> {
    try {
      const isStream =
        (request.params._isStreaming as boolean) ||
        (request.params.payload as any)?.params?._isStreaming;

      const nodeConnection = await node.connectionManager.connect({
        nextHopAddress: address,
        address: node.address,
        callerAddress: node.address,
        isStream: isStream,
      });

      if (isStream) {
        const routeRequest = request as oStreamRequest;
        if (!routeRequest.stream) {
          throw new oError(oErrorCodes.INVALID_REQUEST, 'Stream is required');
        }
        nodeConnection.onChunk(async (response) => {
          CoreUtils.sendStreamResponse(response, routeRequest.stream as Stream);
        });
        // allow this to continue as we will tell the transmitter to stream the response and we will intercept via the above listener
      }

      const response = await nodeConnection.transmit(request);
      return response.result.data;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found: ' + address.value);
      }
      throw error;
    }
  }

  /**
   * Translates an address to determine the next hop and target addresses.
   * First checks routing policy for external routing, then applies resolver chain.
   */
  async translate(address: oNodeAddress, node: oNode): Promise<RouteResponse> {
    // Apply resolver chain for internal routing
    if (!node.parent && !node.leader && address.transports?.length > 0) {
      // independent node
      return {
        nextHopAddress: address,
        targetAddress: address,
      }
    }
    const { nextHopAddress, targetAddress, requestOverride } =
      await this.addressResolution.resolve({
        address,
        node,
        targetAddress: address,
      });

      // if we defaulted back to the leader
    if (nextHopAddress.value === oAddress.leader().value) {
      // Check if external routing is needed for leader routing
      const externalRoute = this.routingPolicy.getExternalRoutingStrategy(
        address,
        node,
      );
      if (externalRoute) {
        return externalRoute;
      }
    }

    return {
      nextHopAddress,
      targetAddress: targetAddress,
      requestOverride,
    };
  }

  /**
   * Determines if an address is internal to this node's hierarchy.
   * Delegates to the routing policy for the decision.
   */
  isInternal(addressWithTransports: oNodeAddress, node: oNode): boolean {
    return this.routingPolicy.isInternalAddress(addressWithTransports, node);
  }
}
