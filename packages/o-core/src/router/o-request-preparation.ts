import { oObject } from '../core/o-object.js';
import { oAddress } from './o-address.js';
import { oRouterRequest } from './o-request.router.js';
import { JSONRPC_VERSION } from '@olane/o-protocol';

/**
 * Handles request transformation and preparation for routing.
 * Manages payload wrapping/unwrapping, parameter merging, and request envelope handling.
 */
export class oRequestPreparation extends oObject {
  /**
   * Prepares a routing request by applying overrides and updating addresses.
   * @param originalRequest The original router request
   * @param requestOverride Optional request override from resolvers
   * @param targetAddress The final target address
   * @returns The prepared routing request
   */
  prepareRequest(
    originalRequest: oRouterRequest,
    requestOverride: oRouterRequest | undefined,
    targetAddress: oAddress,
  ): oRouterRequest {
    const finalRequest = requestOverride || originalRequest;
    const req = new oRouterRequest({
      method: finalRequest.method,
      params: finalRequest.params,
      id: finalRequest.id,
      jsonrpc: JSONRPC_VERSION,
      stream: originalRequest.stream,
    });

    // Update target address in request
    if (finalRequest && targetAddress) {
      finalRequest.params.address = targetAddress.toString();
    }

    return req;
  }

  /**
   * Applies handshake-specific transformations to a request.
   * @param request The routing request to modify
   * @param requestOverride The request override from resolvers
   */
  applyHandshakeTransform(
    request: oRouterRequest,
    requestOverride: oRouterRequest | undefined,
  ): void {
    const params = (request.params.payload as any).params;
    const { method } = request.params.payload as any;

    try {
      if (requestOverride) {
        // This is likely a method resolver, so we need to override the method
        // Let's specify the method in the request params to optimize on context window
        params.tool = request.params?.payload?.method;
      }
    } catch (e) {
      this.logger.error('Error assigning tool to handshake: ', e);
    }

    // Update the method to be the handshake
    request.params.payload.method = method;
  }

  /**
   * Merges parameters from original payload and resolver overrides.
   * @param request The routing request to modify
   * @param originalPayload The original request payload
   */
  applyParameterMerge(
    request: oRouterRequest,
    originalPayload: any,
  ): void {
    const params = (request.params.payload as any).params;

    (request.params.payload as any).params = {
      ...originalPayload.params, // initial params
      ...params, // overloaded params
    };
  }

  /**
   * Checks if the request is a handshake request.
   * @param method The method to check
   * @param handshakeMethod The handshake method constant
   * @returns True if this is a handshake request
   */
  isHandshakeRequest(method: string, handshakeMethod: string): boolean {
    return method === handshakeMethod;
  }
}
