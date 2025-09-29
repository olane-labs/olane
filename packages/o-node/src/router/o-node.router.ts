import { oNodeAddress } from './o-node.address.js';
import { oNodeTransport } from './o-node.transport.js';
import { oNodeHierarchyManager } from '../o-node.hierarchy-manager.js';
import {
  NodeType,
  oAddress,
  oError,
  oErrorCodes,
  oRequest,
  RouteResponse,
} from '@olane/o-core';
import type { oNode } from '../o-node.js';
import { oToolRouter } from '@olane/o-tool';
import { pipe, pushable, Stream } from '@olane/o-config';
import { oRouterRequest, RequestParams } from '@olane/o-protocol';

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

    let nextHopRequest: oRequest | oRouterRequest = request;

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
      this.logger.debug(
        'Forward: reached destination, changing to actual request',
        nextHopRequest,
      );
    }

    // dial the target
    const targetStream = await node?.p2pNode.dialProtocol(
      address.libp2pTransports.map((t) => t.toMultiaddr()),
      address.protocol,
    );

    if (!targetStream) {
      throw new oError(
        oErrorCodes.FAILED_TO_DIAL_TARGET,
        'Failed to dial target',
      );
    }

    this.logger.debug('Forward: sending request to target...');

    const pushableStream = pushable();
    pushableStream.push(new TextEncoder().encode(nextHopRequest.toString()));
    pushableStream.end();
    await targetStream.sink(pushableStream);
    await pipe(targetStream.source, stream?.sink);
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
      return externalRoute;
    }

    const targetAddress = address;
    const { nextHopAddress, requestOverride } =
      await this.addressResolution.resolve({ address, node });
    this.logger.debug(
      'Translated address: ' +
        address.toString() +
        ' to ' +
        nextHopAddress.toString(),
    );
    const leaderTransports = this.getTransports(
      nextHopAddress as oNodeAddress,
      node,
    );
    nextHopAddress.setTransports(leaderTransports);

    return {
      nextHopAddress,
      targetAddress: targetAddress,
      requestOverride,
    };
  }

  isInternal(addressWithTransports: oNodeAddress, node: oNode): boolean {
    if (addressWithTransports.libp2pTransports?.length > 0) {
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

  getTransports(address: oNodeAddress, node: oNode): oNodeTransport[] {
    this.logger.debug(
      `[${node.address}]: ` +
        'Get transports for address: ' +
        address.toString(),
    );
    const nodeTransports = address?.libp2pTransports || [];

    // if the transports are provided, then we can use them
    if (nodeTransports?.length > 0) {
      this.logger.debug('Using provided transports...');
      return nodeTransports;
    }

    // if we are not in a network & no leaders are provided, then we can't resolve the address
    if (!node.leader) {
      throw new Error('No leader transports provided, cannot resolve address');
    }

    return node.leader.libp2pTransports;
  }
}
