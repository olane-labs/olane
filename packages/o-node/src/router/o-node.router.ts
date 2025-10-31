import { oNodeAddress } from './o-node.address.js';
import {
  CoreUtils,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  oRouterRequest,
  RouteResponse,
} from '@olane/o-core';
import type { oNode } from '../o-node.js';
import { oToolRouter } from '@olane/o-tool';
import { RequestParams } from '@olane/o-protocol';
import { oNodeConnection } from '../connection/o-node-connection.js';
import { oNodeRoutingPolicy } from './o-node.routing-policy.js';
import { Stream } from '@olane/o-config';

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

    let nextHopRequest: oRequest | oRouterRequest = new oRequest({
      method: request.method,
      params: request.params,
      id: request.id,
    });

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
   */
  private async executeSelfRouting(
    request: oRouterRequest,
    node: oNode,
  ): Promise<any> {
    const { payload } = request.params;
    const params = payload.params as RequestParams;
    const localRequest = new oRequest({
      method: payload.method as string,
      params: { ...params },
      id: request.id,
    });

    const result = await node.execute(localRequest);
    return result;
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
    return new oRequest({
      method: payload.method as string,
      params: { ...params },
      id: request.id,
    });
  }

  /**
   * Dials a remote node and transmits the request via libp2p.
   */
  private async dialAndTransmit(
    address: oNodeAddress,
    request: oRequest | oRouterRequest,
    node: oNode,
  ): Promise<any> {
    try {
      const connection = await node.p2pNode.dial(
        address.libp2pTransports.map((t) => t.toMultiaddr()),
      );

      const nodeConnection = new oNodeConnection({
        p2pConnection: connection,
        nextHopAddress: address,
        address: node.address,
        callerAddress: node.address,
      });

      if (request.params._isStream) {
        const routeRequest = request as oRouterRequest;
        if (!routeRequest.stream) {
          throw new oError(oErrorCodes.INVALID_REQUEST, 'Stream is required');
        }
        nodeConnection.onChunk((response) => {
          CoreUtils.sendStreamResponse(response, routeRequest.stream as Stream);
        });
        // allow this to continue as we will tell the transmitter to stream the response and we will intercept via the above listener
      }

      const response = await nodeConnection.transmit(request);
      return response.result.data;
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  /**
   * Translates an address to determine the next hop and target addresses.
   * First checks routing policy for external routing, then applies resolver chain.
   */
  async translate(address: oNodeAddress, node: oNode): Promise<RouteResponse> {
    // Check if external routing is needed
    const externalRoute = this.routingPolicy.getExternalRoutingStrategy(
      address,
      node,
    );
    if (externalRoute) {
      return externalRoute;
    }

    // Apply resolver chain for internal routing
    const { nextHopAddress, targetAddress, requestOverride } =
      await this.addressResolution.resolve({
        address,
        node,
        targetAddress: address,
      });

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
