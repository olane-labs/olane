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
export class oNodeRouter extends oToolRouter {
  constructor() {
    super();
  }

  protected async forward(
    address: oNodeAddress,
    request: oRouterRequest,
    node: oNode,
  ): Promise<any> {
    if (!request.stream) {
      throw new oError(oErrorCodes.INVALID_REQUEST, 'Stream is required');
    }

    const stream = request.stream;

    let nextHopRequest: oRequest | oRouterRequest = new oRequest({
      method: request.method,
      params: request.params,
      id: request.id,
    });

    // are we dialing self?
    if (node.address.toString() === address.toString()) {
      const { payload } = request.params;
      const params = payload.params as RequestParams;
      nextHopRequest = new oRequest({
        method: payload.method as string,
        params: {
          ...params,
        },
        id: request.id,
      });
      const result = await node.execute(nextHopRequest);
      const response = CoreUtils.buildResponse(
        nextHopRequest,
        result,
        result?.error,
      );

      // add the request method to the response
      return CoreUtils.sendResponse(response, stream);
    }

    // next hop is the destination address
    if (
      address
        ?.toStaticAddress()
        .equals(new oAddress(request?.params?.address).toStaticAddress())
    ) {
      // reached destination, so change from route to actual request
      const { payload } = request.params;
      const params = payload.params as RequestParams;
      nextHopRequest = new oRequest({
        method: payload.method as string,
        params: {
          ...params,
        },
        id: request.id,
      });
    }

    // dial the target
    try {
      const connection = await node?.p2pNode.dial(
        address.libp2pTransports.map((t) => t.toMultiaddr()),
      );
      const nodeConnection = new oNodeConnection({
        p2pConnection: connection,
        nextHopAddress: address,
        address: node.address,
        callerAddress: node.address,
      });

      await nodeConnection.transmit(nextHopRequest);
      // await stream.send(new TextEncoder().encode(response.toString()));
    } catch (error: any) {
      if (error?.name === 'UnsupportedProtocolError') {
        throw new oError(oErrorCodes.NOT_FOUND, 'Address not found');
      }
      throw error;
    }
  }

  private handleExternalAddress(
    address: oNodeAddress,
    node: oNode,
  ): RouteResponse | null {
    // determine if this is external
    const isInternal = this.isInternal(address, node);
    if (!isInternal) {
      // external address, so we need to route
      this.logger.debug('Address is external, routing...', address);

      // route to leader of external OS
      return {
        nextHopAddress: new oNodeAddress(
          oAddress.leader().toString(),
          address.libp2pTransports,
        ),
        targetAddress: address,
      };
    }
    return null;
  }

  async translate(address: oNodeAddress, node: oNode): Promise<RouteResponse> {
    const externalRoute = this.handleExternalAddress(address, node);
    if (externalRoute) {
      this.logger.debug('External route found', externalRoute);
      return externalRoute;
    }

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

  isInternal(addressWithTransports: oNodeAddress, node: oNode): boolean {
    if (
      addressWithTransports.paths.indexOf(oAddress.leader().paths) !== -1 && // if the address has a leader
      addressWithTransports.libp2pTransports?.length > 0
    ) {
      // transports are provided, let's see if they match our known leaders
      const isLeaderRef =
        addressWithTransports.toString() === oAddress.leader().toString();
      const isOurLeaderRef = node.hierarchyManager.leaders.some((l) =>
        l.equals(addressWithTransports),
      );
      return isLeaderRef || isOurLeaderRef;
    }
    return true;
  }
}
