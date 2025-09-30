import {
  oAddress,
  oCore,
  oRequest,
  oRouter,
  oRouterRequest,
} from '@olane/o-core';

export abstract class oToolRouter extends oRouter {
  protected abstract forward(
    address: oAddress,
    request: oRequest | oRouterRequest,
    node?: oCore,
  ): Promise<any>;

  async route(request: oRouterRequest, node: oCore): Promise<any> {
    const { payload } = request.params;
    const { address } = request.params;

    const destinationAddress = new oAddress(address as string);

    // determine the next hop address from the encapsulated address
    const { nextHopAddress, targetAddress, requestOverride } =
      await this.translate(destinationAddress, node);

    const finalRequest = requestOverride || request;
    if (finalRequest && targetAddress) {
      finalRequest.params.address = targetAddress.toString();
    }
    // TODO: send the request to the destination
    return this.forward(nextHopAddress, finalRequest, node);
  }
}
