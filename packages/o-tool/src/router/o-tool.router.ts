import {
  oAddress,
  oCore,
  oRequest,
  oRouter,
  oRouterRequest,
} from '@olane/o-core';
import { JSONRPC_VERSION, oProtocolMethods } from '@olane/o-protocol';

export abstract class oToolRouter extends oRouter {
  protected abstract forward(
    address: oAddress,
    request: oRequest | oRouterRequest,
    node?: oCore,
  ): Promise<any>;

  async route(request: oRouterRequest, node: oCore): Promise<any> {
    const { payload }: any = request.params;
    const { address } = request.params;

    const { method } = payload;
    const isHandshake = method === oProtocolMethods.HANDSHAKE;
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
    const params = (req.params.payload as any).params;
    // override the method if it is a handshake
    if (isHandshake) {
      try {
        if (requestOverride) {
          // this is likely a method resolver, so we need to override the method
          // let's specify the method in the request params to optimize on context window
          params.tool = req.params?.payload?.method;
        }
      } catch (e) {
        this.logger.error('Error assigning tool to handshake: ', e);
      }
      // update the method to be the handshake
      req.params.payload.method = method;
    } else if (requestOverride) {
      // method resolved
      (req.params.payload as any).params = {
        ...payload.params, // initial params
        ...params, // overloaded params
      };
    }
    // TODO: send the request to the destination
    return this.forward(nextHopAddress, req, node);
  }
}
