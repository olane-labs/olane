import {
  oAddress,
  oCore,
  oRequest,
  oRouter,
  oRouterRequest,
} from '@olane/o-core';
import { JSONRPC_VERSION } from '@olane/o-protocol';

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
    const req = new oRouterRequest({
      method: finalRequest.method,
      params: finalRequest.params,
      id: finalRequest.id,
      jsonrpc: JSONRPC_VERSION,
      stream: request.stream,
    });
    if (finalRequest && targetAddress) {
      finalRequest.params.address = targetAddress.toString();
    }
    // TODO: send the request to the destination
    return this.forward(nextHopAddress, req, node);
  }
}
