import {
  oAddress,
  oCore,
  oRequest,
  oRouter,
  oRouterRequest,
  oRequestPreparation,
} from '@olane/o-core';
import { oProtocolMethods } from '@olane/o-protocol';

export abstract class oToolRouter extends oRouter {
  protected requestPreparation: oRequestPreparation;

  constructor() {
    super();
    this.requestPreparation = new oRequestPreparation();
  }

  protected abstract forward(
    address: oAddress,
    request: oRequest | oRouterRequest,
    node?: oCore,
  ): Promise<any>;

  /**
   * Routes a request by translating the address, preparing the request, and forwarding it.
   * Handles handshake requests and parameter merging from resolver overrides.
   */
  async route(request: oRouterRequest, node: oCore): Promise<any> {
    const { payload }: any = request.params;
    const { address } = request.params;
    const { method } = payload;

    const destinationAddress = new oAddress(address as string);
    const isHandshake = this.requestPreparation.isHandshakeRequest(
      method,
      oProtocolMethods.HANDSHAKE,
    );

    // Translate address to determine next hop and target
    const { nextHopAddress, targetAddress, requestOverride } =
      await this.translate(destinationAddress, node);

    // Prepare the routing request
    let req = this.requestPreparation.prepareRequest(
      request,
      requestOverride,
      targetAddress,
    );

    // Apply transformations based on request type
    if (isHandshake) {
      req = this.requestPreparation.applyHandshakeTransform(
        req,
        requestOverride,
      );
    } else if (requestOverride) {
      // Method was resolved, merge parameters
      req = this.requestPreparation.applyParameterMerge(req, payload);
    }

    // Forward the prepared request
    return this.forward(nextHopAddress, req, node);
  }
}
