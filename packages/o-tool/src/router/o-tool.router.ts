import { oAddress, oCore, oRequest, oRouter } from '@olane/o-core';
import { oRouterRequest, RequestParams } from '@olane/o-protocol';

export abstract class oToolRouter extends oRouter {
  abstract forward(
    address: oAddress,
    request: oRequest | oRouterRequest,
    node?: oCore,
  ): Promise<any>;

  async route(request: oRouterRequest, node: oCore): Promise<any> {
    const { payload } = request.params;
    const { address } = request.params;

    const destinationAddress = new oAddress(address as string);

    // determine the next hop address from the encapsulated address
    const { nextHopAddress, targetAddress } = await this.translate(
      destinationAddress,
      node,
    );

    const isSelf = nextHopAddress.equals(destinationAddress);

    // at destination, convert the route request to goal request
    let nextHopRequest: oRequest | oRouterRequest = isSelf
      ? new oRequest({
          params: payload.params as RequestParams,
          id: request.id as string,
          method: payload.method as string,
        })
      : request;

    // TODO: send the request to the destination
    return this.forward(nextHopAddress, nextHopRequest, node);
  }
}
